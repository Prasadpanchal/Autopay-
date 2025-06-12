from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_migrate import Migrate
from flask_apscheduler import APScheduler

db = SQLAlchemy()
migrate = Migrate()
scheduler = APScheduler()

def create_app():
    app = Flask(__name__)

    app.config.from_pyfile('../config.py')
    CORS(app)
    db.init_app(app)
    migrate.init_app(app, db)

    from .routes import api
    app.register_blueprint(api, url_prefix='/api')

    if True: # <--- Debug मोडमध्येही scheduler सुरू करण्यासाठी (फक्त टेस्टिंगसाठी)

        scheduler.init_app(app)
        scheduler.start()

        from app.routes import process_due_payments
        if not scheduler.get_job('process_due_payments_job'):
            scheduler.add_job(
                id='process_due_payments_job',
                func=process_due_payments,
                args=[app], # <--- ही लाइन ऍड करा: 'app' इन्स्टन्स फंक्शनला पास करा
                trigger='interval',
                minutes=1,
                max_instances=1
            )

    return app
