# File: backend/app/__init__.py

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_migrate import Migrate
from flask_apscheduler import APScheduler
from flask_mail import Mail # <--- Add this line: Import the Mail class from Flask-Mail

# Initialize global objects
db = SQLAlchemy()
migrate = Migrate()
scheduler = APScheduler()
mail = Mail() # <--- Add this line: Initialize the mail object

def create_app():
    app = Flask(__name__)

    # Load application configuration from config.py
    # This should contain your Flask-Mail settings (MAIL_SERVER, MAIL_USERNAME, MAIL_PASSWORD, etc.).
    app.config.from_pyfile('../config.py') 
    CORS(app)
    
    # Initialize the app with db, migrate, and mail
    db.init_app(app)
    migrate.init_app(app, db)
    mail.init_app(app) # <--- Add this line: Initialize the mail object with the app

    # Import and register blueprints
    from .routes import api
    app.register_blueprint(api, url_prefix='/api') # url_prefix should be given here, not in routes.py

    # Scheduler setup
    if True: # <--- To start the scheduler even in debug mode (for testing only)
             # You can reset this condition based on app.debug or app.testing when testing is complete.
        scheduler.init_app(app)
        if not scheduler.running: # Start the scheduler only if it is not already running.
            scheduler.start()

        from app.routes import process_due_payments
        if not scheduler.get_job('process_due_payments_job'):
            scheduler.add_job(
                id='process_due_payments_job',
                func=process_due_payments,
                args=[app], # Pass the 'app' instance to the function
                trigger='interval',
                minutes=1, # Will process every 1 minute.
                max_instances=1
            )

    return app
