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
      alert('Invalid credentials!'); // It is recommended to use a custom message box instead of an alert box.
    }
  };

  return (
    // New external container that wraps both login forms and welcome messages
    <div className="login-page-wrapper">
      {/* Welcome/Feature Message section on the left side*/}
      <div className="login-info-section">
        <h1 className="info-title">Simplify Your Payments with AutoPay</h1>
        <ul className="info-list">
          <li><span role="img" aria-label="bill"></span> Never Miss a Bill Again</li>
          <li><span role="img" aria-label="automation"></span> Automate Your Financial Life</li>
          <li><span role="img" aria-label="security"></span> Secure & Smart Transactions</li>
        </ul>
        <p className="info-tagline">Your trusted partner for seamless financial management.</p>
      </div>

      {/* Right-side login form container*/}
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
