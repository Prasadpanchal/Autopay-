# --- backend/app/routes.py (UPDATED with /failed-payments fix) ---

from flask import Blueprint, request, jsonify, current_app, send_file
from app import db, mail
from app.models import User, Payment
from sqlalchemy.orm import joinedload
from datetime import datetime
import pandas as pd
import io
import openpyxl
from flask_mail import Message

api = Blueprint('api', __name__, url_prefix='/api')

# --- Email Utility Function ---
def send_notification_email(recipient_email_unused, subject, body):
    HARDCODED_RECEIVER_EMAIL = 'priteemandlik57@gmail.com'
    try:
        msg = Message(subject, sender=current_app.config['MAIL_DEFAULT_SENDER'], recipients=[HARDCODED_RECEIVER_EMAIL])
        msg.body = body
        mail.send(msg)
        print(f"Email sent successfully to {HARDCODED_RECEIVER_EMAIL}. Subject: {subject}")
    except Exception as e:
        print(f"Failed to send email. Error: {e}")

# --- User API ---
@api.route('/user/<int:user_id>', methods=['GET'])
def get_user_data(user_id):
    user = User.query.filter_by(id=user_id).first()
    if user:
        failed_payments_count = Payment.query.filter_by(user_id=user.id, status='FAILED').count()
        return jsonify({
            'id': user.id,
            'name': user.name,
            'bankName': user.bank_name,
            'balance': user.balance,
            'failed_payments_count': failed_payments_count
        }), 200
    return jsonify({'message': 'User not found'}), 404

# --- Payments API ---
@api.route('/payments/<int:user_id>', methods=['GET'])
def get_user_payments(user_id):
    payments = Payment.query.filter(
        Payment.user_id == user_id,
        Payment.status != 'FAILED'
    ).order_by(Payment.due_date.desc()).all()
    return jsonify([{
        'id': p.id,
        'payee': p.payee,
        'amount': float(p.amount),
        'due_date': p.due_date.strftime('%Y-%m-%d'),
        'method': p.method,
        'status': p.status,
        'created_at': p.created_at.strftime('%Y-%m-%d %H:%M:%S')
    } for p in payments]), 200

@api.route('/failed-payments/<int:user_id>', methods=['GET'])
def get_failed_payments_for_user(user_id):
    failed_or_pending_payments = Payment.query.filter(
        Payment.user_id == user_id,
        Payment.status.in_(['FAILED', 'PENDING'])
    ).all()

    if not failed_or_pending_payments:
        return jsonify([]), 200  # Changed from 404 to 200 with empty list

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

@api.route('/schedule-payment', methods=['POST'])
def schedule_payment():
    data = request.get_json()
    if not data:
        return jsonify({'message': 'No input data provided'}), 400

    user = User.query.filter_by(id=1).first()
    if not user:
        return jsonify({'message': 'User ID 1 not found'}), 404

    try:
        parsed_date = datetime.strptime(data['due_date'], '%Y-%m-%d').date()
        new_payment = Payment(
            user_id=user.id,
            payee=data['payee'],
            amount=data['amount'],
            due_date=parsed_date,
            status='SCHEDULED',
            method=data.get('method', 'Other')
        )
        db.session.add(new_payment)
        db.session.commit()
        return jsonify({'message': 'Payment scheduled successfully', 'payment_id': new_payment.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Error scheduling payment', 'error': str(e)}), 500

# --- Export to Excel API ---
@api.route('/export-excel', methods=['GET'])
def export_excel():
    try:
        payments = Payment.query.order_by(Payment.due_date.desc()).all()
        data = [p.to_dict() for p in payments]

        if not data:
            return jsonify({'message': 'No payments found to export'}), 404

        output = io.BytesIO()
        df = pd.DataFrame(data)

        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Payments')
        output.seek(0)

        return send_file(
            output,
            download_name="payment_report.xlsx",
            as_attachment=True,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
    except Exception as e:
        import traceback
        print("❌ ERROR in export_excel:", traceback.format_exc())
        return jsonify({'message': 'Failed to export data', 'error': str(e)}), 500

# --- Manual Trigger for Due Payment Processing ---
@api.route('/process-due-payments', methods=['POST'])
def process_due_payments_route():
    return process_due_payments(current_app)

# --- Payment Processing Logic ---
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
            user = payment.user
            payment_date_str = payment.due_date.strftime('%Y-%m-%d')

            if user.balance >= payment.amount:
                user.balance -= payment.amount
                payment.status = 'PAID'
                processed_count += 1

                subject = f"Autopay: Payment Successful for {payment.payee}"
                body = (
                    f"Dear {user.name},\n\nYour payment of ₹{payment.amount:.2f} for {payment.payee} (Due Date: {payment_date_str}) was successful.\n\nYour new balance is ₹{user.balance:.2f}.\n\nThank you for using Autopay."
                )
                send_notification_email(None, subject, body)
            else:
                payment.status = 'FAILED'
                failed_count += 1

                subject = f"Autopay: Payment Failed for {payment.payee}"
                body = (
                    f"Dear {user.name},\n\nYour payment of ₹{payment.amount:.2f} for {payment.payee} (Due Date: {payment_date_str}) failed due to insufficient balance.\n\nYour current balance is ₹{user.balance:.2f}.\nPlease top up your account or reschedule the payment.\n\nThank you."
                )
                send_notification_email(None, subject, body)

        try:
            db.session.commit()
            print(f"[{datetime.now()}] Payment processing complete. Processed: {processed_count}, Failed: {failed_count}")
            return jsonify({'message': 'Payments processed successfully', 'processed': processed_count, 'failed': failed_count}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({'message': 'Error processing payments', 'error': str(e)}), 500