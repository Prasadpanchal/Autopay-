# File: backend/config.py

# Database Configuration
DB_USER = 'postgres'
DB_PASS = 'Renu%401234567'  # Replace with your actual password if needed
DB_NAME = 'autopay_db'
DB_HOST = 'localhost'

SQLALCHEMY_DATABASE_URI = f'postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}/{DB_NAME}'
SQLALCHEMY_TRACK_MODIFICATIONS = False

# Mail Configuration
MAIL_SERVER = 'smtp.gmail.com'
MAIL_PORT = 587
MAIL_USE_TLS = True

MAIL_USERNAME = 'priteemandlik57@gmail.com'       # Sender Gmail ID
MAIL_PASSWORD = 'nkra azlx fljb qpjo'             # Gmail App Password

HARDCODED_RECEIVER_EMAIL = 'priteemandlik57@gmail.com'  # Receiver Email ID
SENDER_EMAIL = 'priteemandlik57@gmail.com'                      # Displayed sender name
MAIL_DEFAULT_SENDER = 'priteemandlik57@gmail.com'       # Default from address
