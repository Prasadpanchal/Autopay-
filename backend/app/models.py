# File: backend/app/models.py

from . import db
from datetime import datetime
from sqlalchemy import text # server_default साठी

class User(db.Model):
    __tablename__ = 'users' # तुमच्या DB मधील 'users' टेबलच्या नावानुसार

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone_number = db.Column(db.String(20), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False) # लांबी 256 आहे याची खात्री करा
    
    bank_name = db.Column(db.String(100), nullable=True) # nullable करा किंवा default द्या
    balance = db.Column(db.Numeric(10, 2), nullable=False, default=0.0)

    # OTP संबंधित फील्ड्स
    otp_code = db.Column(db.String(6), nullable=True) # OTP साठी
    otp_expiry = db.Column(db.DateTime, nullable=True) # OTP ची वैधता (expiry)
    otp_verified = db.Column(db.Boolean, nullable=False, default=False, server_default=text('false')) # OTP द्वारे सत्यापित आहे का

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    payments = db.relationship('Payment', backref='user', lazy=True)

    def __repr__(self):
        return f'<User {self.email}>'

# Payment मॉडेल (तुमच्याकडे आधीच असेल)
class Payment(db.Model):
    __tablename__ = 'payments' # तुमच्या DB मधील 'payments' टेबलच्या नावानुसार

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False) # 'user.id' ऐवजी 'users.id' (जर टेबलचे नाव 'users' असेल)
    payee = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    due_date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(50), default='SCHEDULED', nullable=False)
    method = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<Payment {self.id} - {self.payee}>"
