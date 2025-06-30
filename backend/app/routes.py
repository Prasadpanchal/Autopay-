# File: backend/app/routes.py

from flask import Blueprint, request, jsonify, current_app
from app import db, mail # 'mail' object is imported from __init__.py
from app.models import User, Payment # User model updated with new fields
from sqlalchemy.orm import joinedload
from datetime import datetime, timedelta # Add timedelta for OTP expiry
import pandas as pd # CSV and XLSX for reading
import io # File Handling
import openpyxl # XLSX for read (pip install openpyxl important)
from flask_mail import Message # Import Message class
import random # For generating OTP
from werkzeug.security import generate_password_hash, check_password_hash # For password hashing

# Set URL prefix for Blueprint
api = Blueprint('api', __name__, url_prefix='/api')


# --- Email Utility Function ---
def send_notification_email(recipient_email, subject, body): # Changed parameter name
    """Sends email notifications."""
    try:
        # The sender is configured in config.py (MAIL_DEFAULT_SENDER)
        msg = Message(subject, sender=current_app.config['MAIL_DEFAULT_SENDER'], recipients=[recipient_email])
        msg.body = body
        mail.send(msg)
        print(f"Email sent successfully to {recipient_email}. Subject: {subject}")
    except Exception as e:
        print(f"Failed to send email to {recipient_email}. Error: {e}")
        # In a real application, log the error appropriately
# --- End of Email Utility Function ---


# ----------------------------------------------------
# New User Authentication API Routes
# ----------------------------------------------------

@api.route('/send-otp', methods=['POST'])
def send_otp():
    data = request.get_json()
    email = data.get('email')
    phone_number = data.get('phone_number') # Get phone number from frontend

    if not email:
        return jsonify({'message': 'Email is required to send OTP'}), 400

    user = User.query.filter_by(email=email).first()

    # If user exists AND is already verified, prevent re-sending OTP for signup
    if user and user.otp_verified:
        return jsonify({'message': 'Email already registered and verified. Please login or reset password.'}), 409
    
    # Generate a 6-digit OTP
    otp = str(random.randint(100000, 999999))
    otp_expiry_time = datetime.utcnow() + timedelta(minutes=5) # OTP valid for 5 minutes

    if user: # Existing user (potentially unverified), update their OTP
        user.otp_code = otp
        user.otp_expiry = otp_expiry_time
        user.otp_verified = False # Reset verification status if re-sending OTP
        user.phone_number = phone_number if phone_number else user.phone_number # Update phone if provided
        user.full_name = 'Temporary User' # Ensure full_name is set for existing unverified user too
        print(f"OTP updated for existing user {email}. OTP: {otp}")
    else: # New user trying to sign up, create a temporary entry to store OTP
        try:
            new_user = User(
                email=email,
                phone_number=phone_number if phone_number else '0000000000', # Default phone if not provided
                full_name='Temporary User', # Temporary name
                password_hash=generate_password_hash("temporary_password_for_otp_gen"), # Temporary password hash (make it unique)
                otp_code=otp,
                otp_expiry=otp_expiry_time,
                otp_verified=False,
                bank_name='N/A', # Default values
                balance=0.0      # Default values
            )
            db.session.add(new_user)
            print(f"New temporary user created for OTP: {email}. OTP: {otp}")
        except Exception as e:
            db.session.rollback()
            print(f"Error creating temporary user for OTP: {e}")
            if "duplicate key value violates unique constraint" in str(e).lower():
                 # This should ideally not happen if the initial check for 'user and user.otp_verified' passed
                 return jsonify({'message': 'Email or Phone number is already in use by a verified account. Please login.'}), 409
            return jsonify({'message': 'Failed to prepare for OTP. Internal error.'}), 500
    
    db.session.commit() # Commit user changes or new user creation

    # Send OTP via Email
    subject = "Your AutoPay OTP Verification Code"
    body = f"Hello,\n\nYour One-Time Password (OTP) for AutoPay is: {otp}\n\nThis OTP is valid for 5 minutes.\n\nThank you,\nAutoPay Team"
    send_notification_email(email, subject, body) # Use the provided email

    # For Phone Number OTP (Placeholder - integrate with SMS gateway if needed)
    if phone_number:
        print(f"--- TODO: Integrate SMS Gateway to send OTP {otp} to {phone_number} ---")

    return jsonify({'message': 'OTP sent successfully to your email.'}), 200

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
        user.otp_code = None # Clear expired OTP
        user.otp_expiry = None
        db.session.commit()
        return jsonify({'message': 'OTP has expired. Please request a new one.'}), 400

    user.otp_verified = True
    user.otp_code = None # Clear OTP after successful verification (as per requirement)
    user.otp_expiry = None # Clear expiry after successful verification
    db.session.commit()

    return jsonify({'message': 'OTP verified successfully'}), 200

@api.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    full_name = data.get('fullName')
    email = data.get('email')
    phone_number = data.get('phoneNumber')
    password = data.get('password')

    if not all([full_name, email, phone_number, password]):
        return jsonify({'message': 'All fields (Full Name, Email, Phone Number, Password) are required'}), 400

    # Basic server-side validation for password (6-digit number)
    if not (isinstance(password, str) and password.isdigit() and len(password) == 6):
        return jsonify({'message': 'Password must be a 6-digit number'}), 400
    
    # Basic validation for phone number (10-digit number)
    if not (isinstance(phone_number, str) and phone_number.isdigit() and len(phone_number) == 10):
        return jsonify({'message': 'Phone number must be a 10-digit number'}), 400

    try:
        user = User.query.filter_by(email=email).first()

        # Case 1: User with this email already exists and is fully verified (not just OTP verified temporarily)
        # This implies a pre-existing, active account.
        if user and user.otp_verified: # This condition should only apply if the user is truly registered, not temporary
            # We need to refine this to specifically check if THIS signup attempt is merely completing a process
            # or truly trying to register an email that's already completed registration.
            
            # If the user exists and is verified, but their full_name is still 'Temporary User',
            # it means they completed OTP but not actual signup yet. So, allow them to proceed.
            if user.full_name != 'Temporary User' and user.phone_number == phone_number:
                return jsonify({'message': 'Email already registered and verified. Please login.'}), 409
            # If full_name is 'Temporary User' but OTP is verified, it's the current user completing signup.
            # Continue to update their details below.


        # Case 2: Phone number already registered by a *different* verified user
        existing_phone_user = User.query.filter_by(phone_number=phone_number).first()
        if existing_phone_user and existing_phone_user.otp_verified and existing_phone_user.email != email:
            # If a *different* verified user has this phone number, block this signup.
            return jsonify({'message': 'Phone number already registered and verified by another account. Please login.'}), 409

        
        # Determine the user object to update or create
        if user: # This 'user' is either None (new) or an unverified user from send-otp, or a verified temporary user completing signup
            user_to_update = user
        else: # No user found with this email, create a completely new one
            user_to_update = User()

        # Hash password
        hashed_password = generate_password_hash(password)

        # Update or set user details
        user_to_update.full_name = full_name
        user_to_update.email = email
        user_to_update.phone_number = phone_number
        user_to_update.password_hash = hashed_password # <--- हा पासवर्ड तुमचा 6-अंकी पासवर्डचा हॅश असेल
        user_to_update.otp_verified = True # <--- येथेच तो True होईल आणि पूर्ण नोंदणी झाली असे मानले जाईल
        user_to_update.otp_code = None # Clear OTP after final signup
        user_to_update.otp_expiry = None # Clear OTP expiry after final signup
        
        # Set default values for bank_name and balance if they are not explicitly provided in signup form
        if user_to_update.bank_name is None:
            user_to_update.bank_name = 'N/A'
        if user_to_update.balance is None:
            user_to_update.balance = 0.0

        if not user_to_update.id: # If it's a new User object (not an existing one being updated)
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

    print(f"Login attempt for email: {email}") # Debugging
    print(f"Received password (first 3 chars): {password[:3]}...") # Debugging (don't print full password in logs for security)

    if not email or not password:
        print("Error: Email or password missing for login.") # Debugging
        return jsonify({'message': 'Email and password are required'}), 400

    try:
        user = User.query.filter_by(email=email).first()

        if not user:
            print(f"User with email '{email}' not found in database during login attempt.") # Debugging
            return jsonify({'message': 'Invalid email or password'}), 401

        print(f"User found: {user.email}") # Debugging
        print(f"User OTP Verified status: {user.otp_verified}") # Debugging
        print(f"Stored password hash: {user.password_hash}") # Debugging

        # Check if user.otp_verified exists and is True
        # If otp_verified column doesn't exist, this line might cause an error
        # Ensure your database migrations are run correctly!
        if not hasattr(user, 'otp_verified') or not user.otp_verified: 
            print(f"User '{email}' is not OTP verified or 'otp_verified' column is missing/False. Blocking login.") # Debugging
            return jsonify({'message': 'Please verify your email with OTP before logging in.'}), 403

        if check_password_hash(user.password_hash, password):
            print(f"Password check successful for user: {email}. Logging in.") # Debugging
            return jsonify({'message': 'Login successful', 'user_id': user.id, 'username': user.full_name}), 200
        else:
            print(f"Password check failed for user: {email}. Provided password does not match stored hash.") # Debugging
            return jsonify({'message': 'Invalid email or password'}), 401

    except Exception as e:
        print(f"Login error during try-except block: {e}") # Debugging
        return jsonify({'message': 'Internal server error during login'}), 500


# ----------------------------------------------------
# User API Routes (Updated to use full_name)
# ----------------------------------------------------
@api.route('/user/<int:user_id>', methods=['GET'])
def get_user_data(user_id):
    user = User.query.filter_by(id=user_id).first()
    if user:
        # Ensure status is 'FAILED' (uppercase as used in database)
        failed_payments_count = Payment.query.filter_by(user_id=user.id, status='FAILED').count()
        user_data = {
            'id': user.id,
            'name': user.full_name, # Changed from user.name to user.full_name
            'email': user.email, # Added email
            'phone_number': user.phone_number, # Added phone_number
            'bankName': user.bank_name,
            'balance': user.balance,
            'failed_payments_count': failed_payments_count
        }
        return jsonify(user_data), 200
    return jsonify({'message': 'User not found'}), 404

# ----------------------------------------------------
# Payments API Routes (No changes needed in this section for authentication)
# ----------------------------------------------------
@api.route('/payments/<int:user_id>', methods=['GET'])
def get_user_payments(user_id):
    # Fetch payments not in 'FAILED' status (i.e., SCHEDULED, PENDING, PAID, CANCELLED)
    payments = Payment.query.filter(
        Payment.user_id == user_id,
        Payment.status != 'FAILED' # Add/Change this line
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

# --- NEW API ENDPOINT FOR ALL PAYMENTS ---
@api.route('/all-payments/<int:user_id>', methods=['GET'])
def get_all_payments(user_id):
    """Fetches all payments (with all statuses) for a specific user."""
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
# --- END NEW API ENDPOINT ---

@api.route('/schedule-payment', methods=['POST'])
def schedule_payment():
    data = request.get_json()
    if not data:
        return jsonify({'message': 'No input data provided'}), 400

    print(f"Received data for schedule-payment: {data}")
    print(f"Value of 'due_date' field: {data.get('due_date')}")
    
    # IMPORTANT: Instead of hardcoding user ID 1, you should get the user_id from session/token
    # For now, keeping as is based on your provided code structure.
    user_id_from_auth = 1 # Placeholder for actual user_id from authentication
    user = User.query.filter_by(id=user_id_from_auth).first()
    if not user:
        return jsonify({'message': 'Authenticated user not found or invalid user ID'}), 404

    try:
        due_date_str = data.get('due_date')
        if not due_date_str:
            return jsonify({'message': 'Payment date (due_date) is required'}), 400

        try:
            parsed_date = datetime.strptime(due_date_str, '%Y-%m-%d').date()
        except ValueError as ve:
            return jsonify({'message': f'Invalid date format for "{due_date_str}". Expected:YYYY-MM-DD.', 'error': str(ve)}), 400

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

        # Check for required columns (removed 'user_id' check)
        required_columns = ['amount', 'due_date', 'payee', 'method']
        if not all(col in df.columns for col in required_columns):
            missing_cols = [col for col in required_columns if col not in df.columns]
            print(f"Error: Missing required columns: {missing_cols}. File columns: {df.columns.tolist()}")
            return jsonify({'message': f'Missing required columns in file. Required: {", ".join(required_columns)}. Missing: {", ".join(missing_cols)}'}), 400

        # IMPORTANT: Instead of hardcoding user ID 1, you should get the user_id from session/token
        # For now, keeping as is based on your provided code structure.
        target_user_id = 1 # Placeholder for actual user_id from authentication
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
                    # Assuming Excel date as number (days since 1899-12-30)
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
                db.session.rollback() # Rollback on single row error
                continue

        db.session.commit() # Commit all successful payments at once
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
        print(f"An unhandled error occurred during bulk upload processing: {e}") # More descriptive message
        return jsonify({'message': f'Error processing file: {str(e)}'}), 500

# ----------------------------------------------------
# Automatic Payment Processing (Scheduler & Manual Trigger)
# ----------------------------------------------------

@api.route('/process-due-payments', methods=['POST'])
def process_due_payments_route():
    return process_due_payments(current_app)

def process_due_payments(app):
    print(f"[{datetime.now()}] Attempting to process due payments...")

    with app.app_context():
        today = datetime.now().date()

        payments_to_process = Payment.query.options(joinedload(Payment.user)).filter(
            (Payment.status == 'SCHEDULED') | (Payment.status == 'PENDING'),
            Payment.due_date <= today
        ).all()

        processed_count = 0
        failed_count = 0

        for payment in payments_to_process:
            user = payment.user # Fetch User object

            payment_date_str = payment.due_date.strftime('%Y-%m-%d')
            
            # Use user.email for sending notifications
            recipient_email_for_notification = user.email 

            if user.balance >= payment.amount:
                user.balance -= payment.amount
                payment.status = 'PAID'
                processed_count += 1
                print(f"Processed payment ID {payment.id} for user {user.full_name}. New balance: {user.balance}") # Changed user.name

                # --- Send PAID Email Notification ---
                subject = f"Autopay: Payment Successful for {payment.payee}"
                body = (
                    f"Dear {user.full_name},\n\n" # Changed user.name
                    f"Your payment of ₹{payment.amount:.2f} for {payment.payee} (Due Date: {payment_date_str}) "
                    f"has been successfully processed.\n\n"
                    f"Your new balance is ₹{user.balance:.2f}.\n\n"
                    f"Thank you for using Autopay."
                )
                send_notification_email(recipient_email_for_notification, subject, body) # Use actual user email
                # --- End PAID Email Notification ---

            else:
                payment.status = 'FAILED'
                failed_count += 1
                print(f"Failed to process payment ID {payment.id} for user {user.full_name}. Insufficient balance.") # Changed user.name

                # --- Send FAILED Email Notification ---
                subject = f"Autopay: Payment Failed for {payment.payee}"
                body = (
                    f"Dear {user.full_name},\n\n" # Changed user.name
                    f"Your payment of ₹{payment.amount:.2f} for {payment.payee} (Due Date: {payment_date_str}) "
                    f"has failed due to insufficient balance.\n\n"
                    f"Your current balance is ₹{user.balance:.2f}.\n"
                    f"Please top up your account or reschedule the payment. "
                    f"You can reschedule it on the Reschedule/Update page.\n\n"
                    f"Thank you."
                )
                send_notification_email(recipient_email_for_notification, subject, body) # Use actual user email
                # --- End FAILED Email Notification ---

        try:
            db.session.commit()
            print(f"[{datetime.now()}] Payment processing complete. Processed: {processed_count}, Failed: {failed_count}")
            return jsonify({'message': 'Payments processed successfully', 'processed': processed_count, 'failed': failed_count}), 200
        except Exception as e:
            db.session.rollback()
            print(f"[{datetime.now()}] Error committing payments: {e}")
            return jsonify({'message': 'Error processing payments', 'error': str(e)}), 500

# ----------------------------------------------------
# Payment Cancel API
# ----------------------------------------------------
@api.route('/payment/<int:payment_id>/cancel', methods=['POST'])
def cancel_payment(payment_id):
    payment = Payment.query.get(payment_id)
    if not payment:
        return jsonify({'message': 'Payment not found'}), 404

    # Allow cancellation only for SCHEDULED or PENDING payments
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
    # Fetch payments with 'FAILED' or 'PENDING' status
    failed_or_pending_payments = Payment.query.filter(
        Payment.user_id == user_id,
        Payment.status.in_(['FAILED', 'PENDING']) # Add/Change this line
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
    
    # Update fields if provided in the request
    if 'amount' in data:
        payment.amount = data['amount']
    if 'due_date' in data:
        # Convert to datetime object
        from datetime import datetime
        payment.due_date = datetime.strptime(data['due_date'], '%Y-%m-%d').date()
    if 'method' in data:
        payment.method = data['method']
    if 'status' in data:
        # Ensure status is valid before updating
        valid_statuses = ['SCHEDULED', 'PENDING', 'PAID', 'FAILED', 'CANCELLED'] # SCHEDULED status added
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
