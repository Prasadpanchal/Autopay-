# --- backend/app/models.py ---
from . import db
from datetime import datetime

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    bank_name = db.Column(db.String(100), nullable=True)
    balance = db.Column(db.Float, nullable=False, default=0.0)
    payments = db.relationship('Payment', backref='user', lazy=True)

class Payment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    payee = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    due_date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(50), default='Pending')
    method = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'ID': self.id,
            'Payee': self.payee,
            'Amount': self.amount,
            'Due Date': self.due_date.strftime('%Y-%m-%d'),
            'Status': self.status,
            'Method': self.method,
            'Created At': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }
