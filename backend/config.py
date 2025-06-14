# File: backend/config.py

DB_USER = 'postgres'
DB_PASS = 'Renu%401234567'
DB_NAME = 'autopay_db' # Database name
DB_HOST = 'localhost'

SQLALCHEMY_DATABASE_URI = f'postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}/{DB_NAME}'
SQLALCHEMY_TRACK_MODIFICATIONS = False

MAIL_SERVER = 'smtp.gmail.com'
MAIL_PORT = 587
MAIL_USE_TLS = True

# These are extremely important for Flask-Mail authentication.
MAIL_USERNAME = 'priteemandlik57@gmail.com' # Sender Mail id
MAIL_PASSWORD = 'nkra azlx fljb qpjo'         # Sender App Password

# You can keep these additional variables as per your convenience.
HARDCODED_RECEIVER_EMAIL = 'priteemandlik57@gmail.com'  # Receiver Mail id
SENDER_EMAIL = 'Sender Mail' # Sender Mail 

MAIL_DEFAULT_SENDER = 'priteemandlik57@gmail.com' # Sender Mail
