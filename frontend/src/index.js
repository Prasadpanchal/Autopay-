// File: frontend/src/index.js

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { AuthProvider } from './context/AuthContext'; // AuthProvider इम्पोर्ट करा
import { BrowserRouter } from 'react-router-dom'; // BrowserRouter इम्पोर्ट करा

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* App कंपोनेंटला BrowserRouter मध्ये रॅप करा */}
    <BrowserRouter> 
      {/* App कंपोनेंटला AuthProvider मध्ये रॅप करा */}
      <AuthProvider> 
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

reportWebVitals();
