// src/pages/Login.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const submitHandler = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin123') {
      // Call onLogin if provided
      if (onLogin) onLogin();
      // Redirect to dashboard
      navigate('/dashboard');
    } else {
      alert('Invalid credentials!'); // ऍलर्ट बॉक्सऐवजी कस्टम मेसेज बॉक्स वापरण्याची शिफारस केली जाते
    }
  };

  return (
    // नवीन बाह्य कंटेनर जो लॉगिन फॉर्म आणि वेलकम मेसेजेस दोन्हीला रॅप करतो
    <div className="login-page-wrapper">
      {/* डाव्या बाजूचा वेलकम/फीचर मेसेज विभाग */}
      <div className="login-info-section">
        <h1 className="info-title">Simplify Your Payments with AutoPay</h1>
        <ul className="info-list">
          <li><span role="img" aria-label="bill"></span> Never Miss a Bill Again</li>
          <li><span role="img" aria-label="automation"></span> Automate Your Financial Life</li>
          <li><span role="img" aria-label="security"></span> Secure & Smart Transactions</li>
        </ul>
        <p className="info-tagline">Your trusted partner for seamless financial management.</p>
      </div>

      {/* उजव्या बाजूचा लॉगिन फॉर्म कंटेनर */}
      <div className="login-container">
        <h2>Login to AutoPay</h2>
        <form onSubmit={submitHandler}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button id='submit' type="submit">Login</button>
        </form>
      </div>
    </div>
  );
};

export default Login;
