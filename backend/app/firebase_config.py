import os
from firebase_admin import credentials, initialize_app

firebase_key_path = os.getenv("backend/app/firebaseServiceAccountKey.json")

if not firebase_key_path:
    raise ValueError("FIREBASE_KEY_PATH not set in .env")

# Initialize Firebase
cred = credentials.Certificate(firebase_key_path)
firebase_app = initialize_app(cred)
