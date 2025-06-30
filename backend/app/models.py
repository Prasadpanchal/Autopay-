# File: backend/app/models.py

from . import db
from datetime import datetime
from sqlalchemy import text

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone_number = db.Column(db.String(20), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    
    bank_name = db.Column(db.String(100), nullable=True)
    balance = db.Column(db.Numeric(10, 2), nullable=False, default=0.0)

    # OTP related fields (for signup and general verification)
    otp_code = db.Column(db.String(6), nullable=True)
    otp_expiry = db.Column(db.DateTime, nullable=True)
    otp_verified = db.Column(db.Boolean, nullable=False, default=False, server_default=text('false'))

    # NEW: Password Reset Token fields for link-based reset
    reset_token = db.Column(db.String(128), nullable=True, unique=True) # Unique token for password reset
    reset_token_expiry = db.Column(db.DateTime, nullable=True) # Expiry for the reset token

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    payments = db.relationship('Payment', backref='user', lazy=True)

    def __repr__(self):
        return f'<User {self.email}>'

class Payment(db.Model):
    __tablename__ = 'payments'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    payee = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    due_date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(50), default='SCHEDULED', nullable=False)
    method = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<Payment {self.id} - {self.payee}>"
