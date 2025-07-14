# File: backend/app/routes.py

from flask import Blueprint, request, jsonify, current_app, url_for
from config import RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
import razorpay
from app import db, mail
from app.models import User, Payment
from sqlalchemy.orm import joinedload
from datetime import datetime, timedelta
import pandas as pd
import io
import openpyxl
from flask_mail import Message
import random
from werkzeug.security import generate_password_hash, check_password_hash
import secrets


#importing Razorpay Api key 


api = Blueprint('api', __name__)
razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

# --- Firebase Admin SDK Imports and Initialization ---
import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Firebase Admin SDK if not already initialized
try:
    firebase_admin.get_app()
except ValueError:
    # तुमच्या firebaseServiceAccountKey.json फाईलचा योग्य पाथ द्या
    cred = credentials.Certificate('app/firebaseServiceAccountKey.json') 
    firebase_admin.initialize_app(cred)

firestore_db = firestore.client() 
# --- End Firebase Admin SDK Initialization ---


api = Blueprint('api', __name__, url_prefix='/api')

# --- Temporary storage for bank verification OTPs (NOT FOR PRODUCTION) ---
# Key: email, Value: {'otp': '123456', 'expiry': datetime_object}
bank_otp_storage = {}
# --- End of Temporary storage ---

# --- Email Utility Function ---
def send_notification_email(recipient_email, subject, body):
    """Sends email notifications."""
    try:
        msg = Message(subject, sender=current_app.config['MAIL_DEFAULT_SENDER'], recipients=[recipient_email])
        msg.body = body
        mail.send(msg)
        print(f"Email sent successfully to {recipient_email}. Subject: {subject}")
    except Exception as e:
        print(f"Failed to send email to {recipient_email}. Error: {e}")
# --- End of Email Utility Function ---


# ----------------------------------------------------
# User Authentication API Routes
# ----------------------------------------------------

@api.route('/send-otp', methods=['POST'])
def send_otp():
    data = request.get_json()
    email = data.get('email')
    phone_number = data.get('phone_number')

    if not email:
        return jsonify({'message': 'Email is required to send OTP'}), 400

    user = User.query.filter_by(email=email).first()

    if user and user.otp_verified:
        return jsonify({'message': 'Email already registered and verified. Please login or reset password.'}), 409
    
    otp = str(random.randint(100000, 999999))
    otp_expiry_time = datetime.utcnow() + timedelta(minutes=5)

    if user:
        user.otp_code = otp
        user.otp_expiry = otp_expiry_time
        user.otp_verified = False
        user.phone_number = phone_number if phone_number else user.phone_number
        user.full_name = user.full_name if user.full_name != 'Temporary User' else 'Temporary User'
        print(f"OTP updated for existing user {email}. OTP: {otp}")
    else:
        try:
            new_user = User(
                email=email,
                phone_number=phone_number if phone_number else '0000000000',
                full_name='Temporary User',
                password_hash=generate_password_hash("temporary_password_for_otp_gen"),
                otp_code=otp,
                otp_expiry=otp_expiry_time,
                otp_verified=False,
                # 'balance' field is removed from User model, so no default here
            )
            db.session.add(new_user)
            print(f"New temporary user created for OTP: {email}. OTP: {otp}")
        except Exception as e:
            db.session.rollback()
            print(f"Error creating temporary user for OTP: {e}")
            if "duplicate key value violates unique constraint" in str(e).lower():
                 return jsonify({'message': 'Email or Phone number is already in use by a verified account. Please login.'}), 409
            return jsonify({'message': 'Failed to prepare for OTP. Internal error.'}), 500
    
    db.session.commit()

    subject = "Your AutoPay OTP Verification Code"
    body = f"Hello,\n\nYour One-Time Password (OTP) for AutoPay is: {otp}\n\nThis OTP is valid for 5 minutes.\n\nThank you,\nAutoPay Team"
    send_notification_email(email, subject, body)

    if phone_number:
        print(f"--- TODO: Integrate SMS Gateway to send OTP {otp} to {phone_number} ---")

    return jsonify({'message': 'OTP sent successfully to your email.'}), 200

# MODIFIED: Verify OTP endpoint (now only for signup context)
@api.route('/verify-otp', methods=['POST'])
def verify_otp():
    data = request.get_json()
    email = data.get('email')
    otp_code = data.get('otp_code')
    
    if not email or not otp_code:
        return jsonify({'message': 'Email and OTP are required'}), 400

    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({'message': 'Invalid email or OTP. Please try again.'}), 400

    if user.otp_code != otp_code:
        return jsonify({'message': 'Invalid OTP. Please try again.'}), 400

    if datetime.utcnow() > user.otp_expiry:
        user.otp_code = None
        user.otp_expiry = None
        db.session.commit()
        return jsonify({'message': 'OTP has expired. Please request a new one.'}), 400

    user.otp_verified = True 
    user.otp_code = None
    user.otp_expiry = None
    
    db.session.commit()

    return jsonify({'message': 'OTP verified successfully'}), 200

# NEW: Forgot Password - Send Reset Link endpoint
@api.route('/forgot-password-link', methods=['POST'])
def forgot_password_link():
    data = request.get_json()
    email = data.get('email')

    if not email:
        return jsonify({'message': 'Email is required'}), 400

    user = User.query.filter_by(email=email).first()

    if not user:
        # For security, avoid revealing if an email is registered or not
        return jsonify({'message': 'If an account with that email exists, a password reset link has been sent.'}), 200
    
    token = secrets.token_urlsafe(32)
    token_expiry_time = datetime.utcnow() + timedelta(hours=1)

    user.reset_token = token
    user.reset_token_expiry = token_expiry_time
    db.session.commit()

    # IMPORTANT: Use your actual frontend URL (e.g., http://localhost:3000)
    reset_link = f"http://localhost:3000/reset-password?token={token}&email={email}"

    subject = "AutoPay Password Reset Request"
    body = (
        f"Hello {user.full_name},\n\n"
        f"You have requested to reset your AutoPay password. "
        f"Click the link below to set a new password:\n\n"
        f"{reset_link}\n\n"
        f"This link is valid for 1 hour. If you did not request this, please ignore this email "
        f"and your password will remain unchanged.\n\n"
        f"Thank you,\nAutoPay Team"
    )
    send_notification_email(email, subject, body)

    return jsonify({'message': 'If an account with that email exists, a password reset link has been sent.'}), 200

# NEW: Endpoint to handle actual password reset with token
@api.route('/reset-password-with-token', methods=['POST'])
def reset_password_with_token():
    data = request.get_json()
    email = data.get('email')
    token = data.get('token')
    new_password = data.get('new_password')

    if not all([email, token, new_password]):
        return jsonify({'message': 'Email, token, and new password are required'}), 400

    if not (isinstance(new_password, str) and new_password.isdigit() and len(new_password) == 6):
        return jsonify({'message': 'New password must be a 6-digit number'}), 400

    user = User.query.filter_by(email=email, reset_token=token).first()

    if not user:
        return jsonify({'message': 'Invalid or expired reset link.'}), 400

    if datetime.utcnow() > user.reset_token_expiry:
        user.reset_token = None
        user.reset_token_expiry = None
        db.session.commit()
        return jsonify({'message': 'Invalid or expired reset link.'}), 400

    try:
        user.password_hash = generate_password_hash(new_password)
        user.reset_token = None
        user.reset_token_expiry = None
        db.session.commit()

        # Send security notification email for successful password change
        subject = "AutoPay Password Changed Successfully"
        body = (
            f"Hello {user.full_name},\n\n"
            f"Your AutoPay password has been successfully changed.\n\n"
            f"If you did not make this change, please contact support immediately.\n\n"
            f"Thank you,\nAutoPay Team"
        )
        send_notification_email(email, subject, body)

        return jsonify({'message': 'Password reset successfully. You can now login with your new password.'}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error resetting password for {email} with token {token}: {e}")
        return jsonify({'message': 'Internal server error during password reset.'}), 500


@api.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    full_name = data.get('fullName')
    email = data.get('email')
    phone_number = data.get('phoneNumber')
    password = data.get('password')

    if not all([full_name, email, phone_number, password]):
        return jsonify({'message': 'All fields (Full Name, Email, Phone Number, Password) are required'}), 400

    if not (isinstance(password, str) and password.isdigit() and len(password) == 6):
        return jsonify({'message': 'Password must be a 6-digit number'}), 400
    
    if not (isinstance(phone_number, str) and phone_number.isdigit() and len(phone_number) == 10):
        return jsonify({'message': 'Phone number must be a 10-digit number'}), 400

    try:
        user = User.query.filter_by(email=email).first()

        if user and user.otp_verified and user.full_name != 'Temporary User':
            return jsonify({'message': 'Email already registered and verified. Please login.'}), 409
        
        existing_phone_user = User.query.filter_by(phone_number=phone_number).first()
        if existing_phone_user and existing_phone_user.otp_verified and existing_phone_user.email != email:
            return jsonify({'message': 'Phone number already registered and verified by another account. Please login.'}), 409

        if user:
            user_to_update = user
        else:
            user_to_update = User()

        hashed_password = generate_password_hash(password)

        user_to_update.full_name = full_name
        user_to_update.email = email
        user_to_update.phone_number = phone_number
        user_to_update.password_hash = hashed_password
        user_to_update.otp_verified = True
        user_to_update.otp_code = None
        user_to_update.otp_expiry = None
        
        # 'balance' field is removed from User model, so no default here
        # if user_to_update.balance is None:
        #     user_to_update.balance = 0.0

        if not user_to_update.id:
            db.session.add(user_to_update)
        
        db.session.commit()

        return jsonify({'message': 'User registered successfully. You can now login.', 'user_id': user_to_update.id}), 201

    except Exception as e:
        db.session.rollback()
        print(f"Signup error: {e}")
        if "duplicate key value violates unique constraint" in str(e).lower():
            return jsonify({'message': 'Email or Phone Number already registered by a verified account. Please login or use different credentials.'}), 409
        return jsonify({'message': 'Internal server error during signup'}), 500


@api.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    print(f"Login attempt for email: {email}")
    print(f"Received password (first 3 chars): {password[:3]}...")

    if not email or not password:
        print("Error: Email or password missing for login.")
        return jsonify({'message': 'Email and password are required'}), 400

    try:
        user = User.query.filter_by(email=email).first()

        if not user:
            print(f"User with email '{email}' not found in database during login attempt.")
            return jsonify({'message': 'Invalid email or password'}), 401

        print(f"User found: {user.email}")
        print(f"User OTP Verified status: {user.otp_verified}")
        print(f"Stored password hash: {user.password_hash}")

        if not hasattr(user, 'otp_verified') or not user.otp_verified: 
            print(f"User '{email}' is not OTP verified or 'otp_verified' column is missing/False. Blocking login.")
            return jsonify({'message': 'Please verify your email with OTP before logging in.'}), 403

        if check_password_hash(user.password_hash, password):
            print(f"Password check successful for user: {email}. Logging in.")
            return jsonify({'message': 'Login successful', 'user_id': user.id, 'username': user.full_name}), 200
        else:
            print(f"Password check failed for user: {email}. Provided password does not match stored hash.")
            return jsonify({'message': 'Invalid email or password'}), 401

    except Exception as e:
        print(f"Login error during try-except block: {e}")
        return jsonify({'message': 'Internal server error during login'}), 500


# ----------------------------------------------------
# User API Routes (Updated to reflect no bank details in PostgreSQL User model)
# ----------------------------------------------------
@api.route('/user/<int:user_id>', methods=['GET'])
def get_user_data(user_id):
    user = User.query.filter_by(id=user_id).first()
    if user:
        failed_payments_count = Payment.query.filter_by(user_id=user.id, status='FAILED').count()
        user_data = {
            'id': user.id,
            'name': user.full_name,
            'email': user.email,
            'phone_number': user.phone_number,
            # 'balance' field is removed from User model, so do not try to access it here.
            # Bank balance will be fetched directly from Firebase in the frontend.
            'failed_payments_count': failed_payments_count
        }
        return jsonify(user_data), 200
    return jsonify({'message': 'User not found'}), 404


@api.route('/user/<int:user_id>', methods=['PUT'])
def update_user_bank_details(user_id):
    data = request.get_json()
    user = User.query.filter_by(id=user_id).first()

    if not user:
        return jsonify({'message': 'User not found'}), 404

    # Removed logic for updating bankName and accountNumber
    if 'balance' in data:
        try:
            new_balance = float(data['balance'])
            if new_balance < 0:
                return jsonify({'message': 'Balance cannot be negative'}), 400
            user.balance = new_balance
        except ValueError:
            return jsonify({'message': 'Invalid balance amount'}), 400

    try:
        db.session.commit()
        # Return only the relevant updated user data
        return jsonify({
            'message': 'User data updated successfully!',
            'user': {
                'id': user.id,
                'name': user.full_name,
                'email': user.email,
                'balance': float(user.balance)
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error updating user details: {e}")
        return jsonify({'message': 'Internal server error while updating user details'}), 500

# Endpoint to deposit funds into dummy bank balance (This updates AutoPay wallet balance)
@api.route('/deposit-balance/<int:user_id>', methods=['POST'])
def deposit_balance(user_id):
    data = request.get_json()
    amount = data.get('amount')

    if not amount or not isinstance(amount, (int, float)) or amount <= 0:
        return jsonify({'message': 'Valid positive amount is required for deposit'}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    try:
        user.balance += float(amount)
        db.session.commit()
        return jsonify({
            'message': f'Successfully deposited {amount:.2f} into your account. New balance: {user.balance:.2f}',
            'new_balance': float(user.balance)
        }), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error depositing balance for user {user_id}: {e}")
        return jsonify({'message': 'Failed to deposit balance. Internal error.'}), 500

# NEW: Endpoint to send OTP for bank verification
@api.route('/send-bank-otp', methods=['POST'])
def send_bank_otp():
    data = request.get_json()
    email_id = data.get('email_id')

    if not email_id:
        return jsonify({'message': 'Email ID is required to send OTP for bank verification'}), 400

    otp = str(random.randint(100000, 999999))
    otp_expiry_time = datetime.utcnow() + timedelta(minutes=5)

    # Store OTP temporarily (for demo purposes)
    bank_otp_storage[email_id] = {'otp': otp, 'expiry': otp_expiry_time}
    print(f"Bank verification OTP generated for {email_id}: {otp}. Stored in temporary storage.")

    subject = "AutoPay: Bank Account Verification OTP"
    body = (
        f"Hello,\n\nYour One-Time Password (OTP) for bank account verification on AutoPay is: {otp}\n\n"
        f"This OTP is valid for 5 minutes.\n\n"
        f"If you did not request this, please ignore this email.\n\n"
        f"Thank you,\nAutoPay Team"
    )
    send_notification_email(email_id, subject, body)

    return jsonify({'message': 'OTP sent to registered email ID for bank verification.'}), 200

# NEW: Endpoint to verify OTP for bank connection
@api.route('/verify-bank-otp', methods=['POST'])
def verify_bank_otp():
    data = request.get_json()
    email_id = data.get('email_id')
    otp_code = data.get('otp_code')

    if not email_id or not otp_code:
        return jsonify({'message': 'Email ID and OTP are required for verification'}), 400

    stored_otp_info = bank_otp_storage.get(email_id)

    if not stored_otp_info:
        return jsonify({'message': 'Invalid or expired OTP. Please request a new one.'}), 400

    if datetime.utcnow() > stored_otp_info['expiry']:
        del bank_otp_storage[email_id] # Clear expired OTP
        return jsonify({'message': 'OTP has expired. Please request a new one.'}), 400

    if stored_otp_info['otp'] != otp_code:
        return jsonify({'message': 'Invalid OTP. Please try again.'}), 400
    
    # OTP is valid, remove it from storage
    del bank_otp_storage[email_id]
    print(f"Bank verification OTP successfully verified for {email_id}.")

    return jsonify({'message': 'Bank OTP verified successfully!'}), 200


# --- NEW AI-RELATED ENDPOINT: Predict Bill ---
@api.route('/predict-bill/<int:user_id>', methods=['POST'])
def predict_bill(user_id):
    data = request.get_json()
    payee_name = data.get('payee')

    if not payee_name:
        return jsonify({'message': 'Payee name is required for prediction'}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    recent_payments = Payment.query.filter_by(user_id=user_id, payee=payee_name) \
                                   .order_by(Payment.created_at.desc()) \
                                   .limit(3) \
                                   .all()

    if not recent_payments:
        return jsonify({
            'message': f'Not enough data to predict for {payee_name}.',
            'prediction': 0.0,
            'confidence': 'Low',
            'suggested_action': 'Please make a few payments for this payee to enable predictions.'
        }), 200
    
    total_amount = sum(float(p.amount) for p in recent_payments)
    average_amount = total_amount / len(recent_payments)
    
    variation = random.uniform(-0.05, 0.05)
    predicted_amount = round(average_amount * (1 + variation), 2)

    return jsonify({
        'message': f'Predicted amount for {payee_name}.',
        'payee': payee_name,
        'prediction': predicted_amount,
        'confidence': 'Medium' if len(recent_payments) >= 3 else 'Low'
    }), 200

# ----------------------------------------------------
# Payments API Routes
# ----------------------------------------------------
@api.route('/payments/<int:user_id>', methods=['GET'])
def get_user_payments(user_id):
    payments = Payment.query.filter(
        Payment.user_id == user_id,
        Payment.status != 'FAILED'
    ).order_by(Payment.due_date.desc()).all()
    
    payments_data = []
    for payment in payments:
        payments_data.append({
            'id': payment.id,
            'payee': payment.payee,
            'amount': float(payment.amount),
            'due_date': payment.due_date.strftime('%Y-%m-%d'),
            'method': payment.method,
            'status': payment.status,
            'created_at': payment.created_at.strftime('%Y-%m-%d %H:%M:%S')
        })
    return jsonify(payments_data), 200

@api.route('/all-payments/<int:user_id>', methods=['GET'])
def get_all_payments(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    payments = Payment.query.filter_by(user_id=user_id).order_by(Payment.due_date.desc()).all()
    
    payments_data = []
    for payment in payments:
        payments_data.append({
            'id': payment.id,
            'payee': payment.payee,
            'amount': float(payment.amount),
            'due_date': payment.due_date.strftime('%Y-%m-%d'),
            'method': payment.method,
            'status': payment.status,
            'created_at': payment.created_at.strftime('%Y-%m-%d %H:%M:%S')
        })
    return jsonify(payments_data), 200

@api.route('/schedule-payment', methods=['POST'])
def schedule_payment():
    data = request.get_json()
    if not data:
        return jsonify({'message': 'No input data provided'}), 400

    print(f"Received data for schedule-payment: {data}")
    print(f"Value of 'due_date' field: {data.get('due_date')}")
    
    user_id_from_auth = 1
    user = User.query.filter_by(id=user_id_from_auth).first()
    if not user:
        return jsonify({'message': 'Authenticated user not found or invalid user ID'}), 404

    try:
        due_date_str = data.get('due_date')
        if not due_date_str:
            return jsonify({'message': 'Payment date (due_date) is required'}), 400

        try:
            parsed_date = datetime.strptime(due_date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'message': f'Invalid date format for "{due_date_str}". Expected:YYYY-MM-DD.'}), 400

        payment_method = data.get('method', 'Other')

        new_payment = Payment(
            user_id=user.id,
            payee=data['payee'],
            amount=data['amount'],
            due_date=parsed_date,
            status='SCHEDULED',
            method=payment_method
        )
        db.session.add(new_payment)
        db.session.commit()
        return jsonify({'message': 'Payment scheduled successfully', 'payment_id': new_payment.id}), 201
    except KeyError as ke:
        db.session.rollback()
        print(f"Missing data key during scheduling: {ke}")
        return jsonify({'message': f"Missing data: {str(ke)}. Make sure 'payee', 'amount', and 'due_date' are provided."}), 400
    except Exception as e:
        db.session.rollback()
        print(f"An unexpected error occurred during scheduling: {e}")
        return jsonify({'message': 'An unexpected error occurred during scheduling', 'error': str(e)}), 500

# ----------------------------------------------------
# Bulk Upload API Endpoint 
# ----------------------------------------------------
@api.route('/bulk-upload-payments', methods=['POST'])
def bulk_upload_payments():
    print("--- Bulk Upload Request Received ---")

    if 'file' not in request.files:
        print("Error: No file part in the request.")
        return jsonify({'message': 'No file part in the request'}), 400

    file = request.files['file']

    if file.filename == '':
        print("Error: No selected file.")
        return jsonify({'message': 'No selected file'}), 400
    
    if file.filename.endswith('.csv'):
        file_type = 'csv'
    elif file.filename.endswith('.xlsx') or file.filename.endswith('.xls'):
        file_type = 'excel'
    else:
        print(f"Error: Invalid file type detected: {file.filename}")
        return jsonify({'message': 'Invalid file type. Please upload a .csv or .xlsx file.'}), 400

    print(f"File received: {file.filename}, Type: {file_type}")

    try:
        if file_type == 'csv':
            df = pd.read_csv(io.StringIO(file.read().decode('utf-8')))
        else: # excel
            df = pd.read_excel(file)

        print(f"DataFrame loaded. Columns: {df.columns.tolist()}")

        required_columns = ['amount', 'due_date', 'payee', 'method']
        if not all(col in df.columns for col in required_columns):
            missing_cols = [col for col in required_columns if col not in df.columns]
            print(f"Error: Missing required columns: {missing_cols}. File columns: {df.columns.tolist()}")
            return jsonify({'message': f'Missing required columns in file. Required: {", ".join(required_columns)}. Missing: {", ".join(missing_cols)}'}), 400

        target_user_id = 1
        user = User.query.get(target_user_id)
        if not user:
            print(f"Error: Target User ID {target_user_id} not found in database.")
            return jsonify({'message': f'Target User ID {target_user_id} not found in database.'}), 404

        processed_count = 0
        failed_rows = []

        print(f"Processing {len(df)} rows from the file...")
        for index, row in df.iterrows():
            try:
                current_payment_user_id = target_user_id

                amount = float(row['amount'])
                payee = str(row['payee'])
                method = str(row['method'])

                due_date_val = row['due_date']
                if isinstance(due_date_val, (float, int)):
                    due_date = datetime.fromtimestamp((due_date_val - 25569) * 86400).date()
                else:
                    due_date = datetime.strptime(str(due_date_val), '%Y-%m-%d').date()

                new_payment = Payment(
                    user_id=current_payment_user_id,
                    amount=amount,
                    due_date=due_date,
                    payee=payee,
                    method=method,
                    status='SCHEDULED'
                )
                db.session.add(new_payment)
                processed_count += 1
            except Exception as e:
                failed_rows.append({'row_number': index + 1, 'error': str(e), 'data': row.to_dict()})
                print(f"Error processing row {index+1}: {e}. Data: {row.to_dict()}")
                db.session.rollback()
                continue

        db.session.commit()
        print(f"Successfully processed {processed_count} payments. Failed: {len(failed_rows)}.")

        return jsonify({
            'message': f'Bulk upload completed. {processed_count} payments processed.',
            'total_rows': len(df),
            'processed_count': processed_count,
            'failed_count': len(failed_rows),
            'failed_details': failed_rows
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"An unhandled error occurred during bulk upload processing: {e}")
        return jsonify({'message': f'Error processing file: {str(e)}'}), 500

# ----------------------------------------------------
# Automatic Payment Processing (Scheduler & Manual Trigger)
# ----------------------------------------------------

@api.route('/process-due-payments', methods=['POST'])
def process_due_payments_route():
    # हे फंक्शन scheduler द्वारे आणि मॅन्युअली दोन्ही कॉल केले जाते.
    # येथे current_app पास करणे आवश्यक आहे कारण scheduler ला app context ची गरज असते.
    return process_due_payments(current_app)

def process_due_payments(app):
    print(f"[{datetime.now()}] Attempting to process due payments...")

    with app.app_context():
        today = datetime.now().date()
        print(f"[{datetime.now()}] Current date for processing: {today}")

        # फक्त SCHEDULED पेमेंट्स निवडा, कारण PENDING पेमेंट्स आधीच प्रोसेस व्हायला सुरुवात झाली असेल
        payments_to_process = Payment.query.options(joinedload(Payment.user)).filter(
            Payment.status == 'SCHEDULED', # फक्त 'SCHEDULED' पेमेंट्स निवडा
            Payment.due_date <= today
        ).all()

        if not payments_to_process:
            print(f"[{datetime.now()}] No new scheduled payments found for processing.")
            return jsonify({'message': 'No new scheduled payments to process', 'processed': 0, 'failed': 0}), 200

        processed_count = 0
        failed_count = 0

        for payment in payments_to_process:
            # रेस कंडीशन टाळण्यासाठी: पेमेंट प्रोसेस करण्यापूर्वी स्टेटस PENDING मध्ये बदला
            # हे सुनिश्चित करते की जर दुसरा APScheduler जॉब लगेच चालला, तर त्याला हे पेमेंट 'SCHEDULED' दिसणार नाही.
            if payment.status == 'SCHEDULED':
                payment.status = 'PENDING'
                try:
                    db.session.commit()
                    print(f"[{datetime.now()}] Payment ID {payment.id} status changed to PENDING.")
                except Exception as e:
                    db.session.rollback()
                    print(f"[{datetime.now()}] Error changing payment ID {payment.id} status to PENDING: {e}")
                    # जर PENDING मध्ये बदलता आले नाही, तर हे पेमेंट वगळा
                    continue 
            else:
                # जर स्टेटस आधीच PENDING किंवा PAID/FAILED असेल (क्वचितच घडेल कारण क्वेरी फक्त SCHEDULED घेते)
                print(f"[{datetime.now()}] Skipping payment ID {payment.id} (Payee: {payment.payee}) as it is not in SCHEDULED status.")
                continue


            user = payment.user
            user_email = user.email

            payment_date_str = payment.due_date.strftime('%Y-%m-%d')
            print(f"[{datetime.now()}] Processing payment ID {payment.id} for {user.full_name} (Payee: {payment.payee}, Amount: {payment.amount}, Due Date: {payment_date_str}, Current Status: {payment.status})")
            
            recipient_email_for_notification = user_email 

            bank_balance_from_firestore = 0.0
            bank_account_doc_ref = None

            bank_collections = ["GlobalBank", "OrbitalBank"]
            for bank_col_name in bank_collections:
                docs = firestore_db.collection(bank_col_name).where('email_id', '==', user_email).limit(1).get()
                if docs:
                    for doc in docs:
                        bank_data = doc.to_dict()
                        try:
                            bank_balance_from_firestore = float(bank_data.get('balance', '0.0'))
                            bank_account_doc_ref = doc.reference
                            print(f"[{datetime.now()}] Found bank balance for {user_email} in {bank_col_name}: {bank_balance_from_firestore}")
                            break
                        except ValueError:
                            print(f"[{datetime.now()}] Warning: Invalid balance format for {user_email} in Firestore: {bank_data.get('balance')}")
                            bank_balance_from_firestore = 0.0
                if bank_account_doc_ref:
                    break

            try:
                if bank_account_doc_ref and bank_balance_from_firestore >= float(payment.amount):
                    new_bank_balance = bank_balance_from_firestore - float(payment.amount)
                    
                    bank_account_doc_ref.update({'balance': str(new_bank_balance)})
                    payment.status = 'PAID'
                    processed_count += 1
                    print(f"[{datetime.now()}] Processed payment ID {payment.id} for user {user.full_name}. New Firebase bank balance: {new_bank_balance}")

                    subject = f"Autopay: Payment Successful for {payment.payee}"
                    body = (
                        f"Dear {user.full_name},\n\n"
                        f"Your payment of ₹{payment.amount:.2f} for {payment.payee} (Due Date: {payment_date_str}) "
                        f"has been successfully processed.\n\n"
                        f"Your new bank balance is ₹{new_bank_balance:.2f}.\n\n"
                        f"Thank you for using Autopay."
                    )
                    send_notification_email(recipient_email_for_notification, subject, body)
                    
                else:
                    payment.status = 'FAILED'
                    failed_count += 1
                    if not bank_account_doc_ref:
                        print(f"[{datetime.now()}] Failed to process payment ID {payment.id} for user {user.full_name}. Bank account not found in Firebase for email: {user_email}.")
                        subject = f"Autopay: Payment Failed for {payment.payee} (Bank Account Not Found)"
                        body = (
                            f"Dear {user.full_name},\n\n"
                            f"Your payment of ₹{payment.amount:.2f} for {payment.payee} (Due Date: {payment_date_str}) "
                            f"has failed because your connected bank account could not be found in our system.\n\n"
                            f"Please ensure your bank details are correctly linked.\n\n"
                            f"Thank you."
                        )
                    else:
                        print(f"[{datetime.now()}] Failed to process payment ID {payment.id} for user {user.full_name}. Insufficient balance. Current Firebase balance: {bank_balance_from_firestore:.2f}")
                        subject = f"Autopay: Payment Failed for {payment.payee}"
                        body = (
                            f"Dear {user.full_name},\n\n"
                            f"Your payment of ₹{payment.amount:.2f} for {payment.payee} (Due Date: {payment_date_str}) "
                            f"has failed due to insufficient balance.\n\n"
                            f"Your current bank balance is ₹{bank_balance_from_firestore:.2f}.\n"
                            f"Please top up your account or reschedule the payment. "
                            f"You can reschedule it on the Reschedule/Update page.\n\n"
                            f"Thank you."
                        )
                    send_notification_email(recipient_email_for_notification, subject, body)
                
                db.session.commit() # प्रत्येक पेमेंट अपडेट झाल्यावर कमिट करा
            except Exception as e:
                db.session.rollback() 
                payment.status = 'FAILED' 
                failed_count += 1
                print(f"[{datetime.now()}] Error processing or committing payment ID {payment.id} for user {user.full_name}: {e}")
                try:
                    db.session.commit() # एरर आल्यास FAILED स्टेटस कमिट करण्याचा प्रयत्न करा
                except Exception as rollback_e:
                    print(f"[{datetime.now()}] Error committing FAILED status after rollback for payment ID {payment.id}: {rollback_e}")
                
                subject = f"Autopay: Payment Failed for {payment.payee} (System Error)"
                body = (
                    f"Dear {user.full_name},\n\n"
                    f"Your payment of ₹{payment.amount:.2f} for {payment.payee} (Due Date: {payment_date_str}) "
                    f"could not be processed due to a system error.\n\n"
                    f"Please contact support. Error: {e}\n\n"
                    f"Thank you."
                )
                send_notification_email(recipient_email_for_notification, subject, body)
        
        print(f"[{datetime.now()}] Payment processing round complete. Total Processed: {processed_count}, Total Failed: {failed_count}")
        return jsonify({'message': 'Payments processed successfully', 'processed': processed_count, 'failed': failed_count}), 200


# ----------------------------------------------------
# Payment Cancel API
# ----------------------------------------------------
@api.route('/payment/<int:payment_id>/cancel', methods=['POST'])
def cancel_payment(payment_id):
    payment = Payment.query.get(payment_id)
    if not payment:
        return jsonify({'message': 'Payment not found'}), 404

    if payment.status == 'SCHEDULED' or payment.status == 'PENDING':
        payment.status = 'CANCELLED'
        try:
            db.session.commit()
            return jsonify({'message': f'Payment {payment_id} cancelled successfully'}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({'message': 'Error cancelling payment', 'error': str(e)}), 500
    else:
        return jsonify({'message': f'Payment cannot be cancelled (current status: {payment.status})'}), 400

# ----------------------------------------------------
# Get All Failed Payments for a User API (New)
# ----------------------------------------------------
@api.route('/failed-payments/<int:user_id>', methods=['GET'])
def get_failed_payments_for_user(user_id):
    failed_or_pending_payments = Payment.query.filter(
        Payment.user_id == user_id,
        Payment.status.in_(['FAILED', 'PENDING'])
    ).all()

    if not failed_or_pending_payments:
        return jsonify({'message': 'No failed or pending payments found for this user'}), 404
    
    payments_data = []
    for payment in failed_or_pending_payments:
        payments_data.append({
            'id': payment.id,
            'user_id': payment.user_id,
            'payee': payment.payee,
            'amount': payment.amount,
            'due_date': payment.due_date.strftime('%Y-%m-%d'),
            'status': payment.status,
            'method': payment.method,
            'created_at': payment.created_at.strftime('%Y-%m-%d %H:%M:%S')
        })
    return jsonify(payments_data), 200

# ----------------------------------------------------
# Update Payment API (for rescheduling) (New)
# ----------------------------------------------------
@api.route('/payment/<int:payment_id>', methods=['PUT'])
def update_payment(payment_id):
    payment = Payment.query.get(payment_id)
    if not payment:
        return jsonify({'message': 'Payment not found'}), 404

    data = request.get_json()
    
    if 'amount' in data:
        payment.amount = data['amount']
    if 'due_date' in data:
        payment.due_date = datetime.strptime(data['due_date'], '%Y-%m-%d').date()
    if 'method' in data:
        payment.method = data['method']
    if 'status' in data:
        valid_statuses = ['SCHEDULED', 'PENDING', 'PAID', 'FAILED', 'CANCELLED']
        if data['status'] in valid_statuses:
            payment.status = data['status']
        else:
            return jsonify({'error': 'Invalid status provided'}), 400
    
    try:
        db.session.commit()
        return jsonify({'message': 'Payment updated successfully!', 'payment': {
            'id': payment.id,
            'payee': payment.payee,
            'amount': payment.amount,
            'due_date': payment.due_date.strftime('%Y-%m-%d'),
            'status': payment.status,
            'method': payment.method
        }}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ----------------------------------------------------
# Create plan route
# ----------------------------------------------------

@api.route('/create-plan', methods=['POST'])
def create_plan():
    plan = razorpay_client.plan.create({
        "period": "monthly",
        "interval": 1,
        "item": {
            "name": "Autopay Monthly Plan",
            "amount": 9900,  # ₹99 in paise
            "currency": "INR",
            "description": "Monthly auto recharge for subscription"
        }
    })
    return jsonify(plan)



# ----------------------------------------------------
# Create a Subscription
# ----------------------------------------------------

@api.route('/create-subscription', methods=['POST'])
def create_subscription():
    data = request.get_json()
    email = data.get("email")

    # ✅ Replace with your real Razorpay TEST Plan ID (from dashboard)
    plan_id = "plan_QpS8eEnuk6vLFe"

    if not email:
        return jsonify({"error": "Missing email"}), 400

    try:
        subscription = razorpay_client.subscription.create({
            "plan_id": plan_id,
            "customer_notify": 1,
            "total_count": 12,
            "notes": {
                "email": email
            }
        })

        print("[✔] Subscription created:", subscription["id"])
        return jsonify(subscription)

    except Exception as e:
        print("[❌] Razorpay Error:", str(e))
        return jsonify({"error": str(e)}), 500
    
    
# ----------------------------------------------------
# Create a Subscription
# ----------------------------------------------------

@api.route('/razorpay-subscriptions', methods=['GET'])
def get_razorpay_subscriptions():
    email = request.args.get('email')
    if not email:
        return jsonify({'message': 'Email is required'}), 400

    try:
        result = razorpay_client.subscription.all({'customer_notify': 1})
        # Filter only relevant subscriptions (demo filter logic)
        filtered = [s for s in result['items'] if s['notes'].get('email') == email]
        return jsonify({'subscriptions': filtered}), 200
    except Exception as e:
        print("Error fetching subscriptions:", e)
        return jsonify({'message': 'Failed to fetch subscriptions'}), 500
