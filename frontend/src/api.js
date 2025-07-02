import axios from 'axios';
import { db } from './firebaseConfig'; // Import db from firebaseConfig

// Replace with your backend URL
const api = axios.create({
    baseURL: 'http://127.0.0.1:5000/api',
});

export default api;
export { db }; // IMPORTANT: Export db for direct Firestore access