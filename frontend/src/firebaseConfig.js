// File: frontend/src/firebaseConfig.js

// Firebase SDKs for Firebase products that you want to use
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// Replace with your actual Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDRRbihBVVHvk8Q5znoz43AQ8mWLlnL7XA",
  authDomain: "autopaymentsystem-e2558.firebaseapp.com",
  projectId: "autopaymentsystem-e2558",
  storageBucket: "autopaymentsystem-e2558.firebasestorage.app",
  messagingSenderId: "991486511189",
  appId: "1:991486511189:web:f9be991da60a00038e2cdc"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

export { db }; // Export the Firestore database instance
