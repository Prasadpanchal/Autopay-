// File: frontend/src/pages/ResetPasswordPage.js
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../src/api';
import './Login.css'; // Reusing Login.css for basic styling

const ResetPasswordPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isValidLink, setIsValidLink] = useState(false);

  const validatePassword = (pass) => /^\d{6}$/.test(pass);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlToken = params.get('token');
    const urlEmail = params.get('email');

    if (urlToken && urlEmail) {
      setToken(urlToken);
      setEmail(urlEmail);
      setIsValidLink(true);
      setMessage('Enter your new 6-digit password.');
      setIsError(false);
    } else {
      setMessage('Invalid or incomplete password reset link. Please try again or request a new link.');
      setIsError(true);
      setIsValidLink(false);
    }
  }, [location.search]);


  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsError(false);

    if (!validatePassword(newPassword)) {
      setMessage('New password must be a 6-digit number.');
      setIsError(true);
      return;
    }

    try {
      const res = await api.post('/reset-password-with-token', {
        email,
        token,
        new_password: newPassword,
      });

      setMessage(res.data.message || 'Password reset successful!');
      setIsError(false);
      
      navigate('/login', { state: { message: res.data.message, isError: false } });

    } catch (err) {
      console.error('Reset password submission error:', err.response || err);
      setMessage(err.response?.data?.message || 'Failed to reset password. Please try again.');
      setIsError(true);
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-info-section">
        <h1 className="info-title">Simplify Your Payments with AutoPay</h1>
        <ul className="info-list">
          <li><span role="img" aria-label="bill">💸</span> Never Miss a Bill Again</li>
          <li><span role="img" aria-label="automation">⚙️</span> Automate Your Financial Life</li>
          <li><span role="img" aria-label="security">🔒</span> Secure & Smart Transactions</li>
        </ul>
        <p className="info-tagline">Your trusted partner for seamless financial management.</p>
      </div>

      <div className="login-container">
        <h2>Set New Password</h2>
        
        {message && (
          <p className={`form-message ${isError ? 'error' : 'success'}`}>
            {message}
          </p>
        )}

        {isValidLink ? (
          <form onSubmit={handleResetPasswordSubmit}>
            <input
              type="password"
              placeholder="Enter New 6-digit Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              maxLength="6"
              pattern="\d{6}"
              title="New password must be a 6-digit number"
              required
            />
            <button type="submit" className="otp-button">Reset Password</button>
          </form>
        ) : (
          <p className="form-message error">Please ensure you are using a valid and unexpired password reset link.</p>
        )}

        <p className="toggle-form-text">
          Remember your password?
          <span className="toggle-link" onClick={() => navigate('/login')}>
            Login here
          </span>
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
