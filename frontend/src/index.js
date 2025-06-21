// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client'; // To use createRoot
import { BrowserRouter as Router } from 'react-router-dom'; // Import the router
import App from './App'; // Your main app component
import './index.css'; // Global CSS (if any)

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Router> {/* Place the router component here, outside the app. */}
      <App />
    </Router>
  </React.StrictMode>
);