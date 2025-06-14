# File: backend/app/__init__.py

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_migrate import Migrate
from flask_apscheduler import APScheduler
from flask_mail import Mail
import os

# Initialize global extensions
db = SQLAlchemy()
migrate = Migrate()
scheduler = APScheduler()
mail = Mail()

def create_app():
    app = Flask(__name__)

    # ✅ This gets the absolute path to config.py reliably
    config_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'config.py'))
    print(f"Loading config from: {config_path}")  # Optional debug print
    app.config.from_pyfile(config_path)

    CORS(app)
    db.init_app(app)
    migrate.init_app(app, db)
    mail.init_app(app)

    from .routes import api
    app.register_blueprint(api, url_prefix='/api')

    if True:
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
                max_instances=1
            )

    return app
