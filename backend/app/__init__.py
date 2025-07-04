# File: backend/app/__init__.py

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_migrate import Migrate
from flask_apscheduler import APScheduler
from flask_mail import Mail

# Initialize global objects
db = SQLAlchemy()
migrate = Migrate()
scheduler = APScheduler()
mail = Mail()

def create_app():
    app = Flask(__name__)

    # Load application configuration from config.py
    app.config.from_pyfile('../config.py') 
    
    # CORS कॉन्फिगरेशन: तुमच्या फ्रंटएंड ऍप्लिकेशनच्या URL ला परवानगी द्या
    # विकासासाठी, तुम्ही सर्व ओरिजिन्सना परवानगी देण्यासाठी resources={r"/api/*": {"origins": "*"}} वापरू शकता.
    # परंतु, सुरक्षिततेसाठी, फक्त तुमच्या फ्रंटएंडची URL निर्दिष्ट करणे चांगले आहे.
    CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}}) # ही ओळ अपडेट करा
    
    # Initialize the app with db, migrate, and mail
    db.init_app(app)
    migrate.init_app(app, db)
    mail.init_app(app)

    # Import and register blueprints
    from .routes import api
    app.register_blueprint(api, url_prefix='/api')

    # Scheduler setup
    if True: # To start the scheduler even in debug mode (for testing only)
        scheduler.init_app(app)
        if not scheduler.running: 
            scheduler.start()

        from app.routes import process_due_payments
        if not scheduler.get_job('process_due_payments_job'):
            scheduler.add_job(
                id='process_due_payments_job',
                func=process_due_payments,
                args=[app],
                trigger='interval',
                minutes=1,
                max_instances=1,
                coalesce=True 
            )

    return app
