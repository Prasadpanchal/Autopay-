// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client'; // createRoot वापरण्यासाठी
import { BrowserRouter as Router } from 'react-router-dom'; // Router इम्पोर्ट करा
import App from './App'; // तुमचा मुख्य ऍप घटक
import './index.css'; // ग्लोबल CSS (असल्यास)

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Router> {/* Router घटक इथे, App च्या बाहेर ठेवा */}
      <App />
    </Router>
  </React.StrictMode>
);