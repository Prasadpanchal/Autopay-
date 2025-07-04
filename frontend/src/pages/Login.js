// File: frontend/src/pages/Login.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../src/api'; 
import './Login.css';

const Login = ({ onLogin }) => { // onLogin प्रॉप स्वीकारत आहे
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const navigate = useNavigate();

  // Client-side validation functions
  const validateFullName = (name) => /^[a-zA-Z\s]+$/.test(name);
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhoneNumber = (phone) => /^\d{10}$/.test(phone);
  const validatePassword = (pass) => /^\d{6}$/.test(pass); // 6 digits only


  const handleSendOtp = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsError(false);

    if (!validateEmail(email)) {
      setMessage('Please enter a valid email address.');
      setIsError(true);
      return;
    }
    if (!validatePhoneNumber(phoneNumber)) {
      setMessage('Please enter a valid 10-digit phone number.');
      setIsError(true);
      return;
    }

    try {
      const res = await api.post('/send-otp', { email, phone_number: phoneNumber });
      setMessage(res.data.message || 'OTP sent to your email.');
      setIsError(false);
      setOtpSent(true);
    } catch (err) {
      console.error('Send OTP error:', err.response || err);
      setMessage(err.response?.data?.message || 'Failed to send OTP. Please try again.');
      setIsError(true);
    }
  };


  const handleVerifyOtpAndSignup = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsError(false);

    if (!otpSent) {
      setMessage('Please send OTP first.');
      setIsError(true);
      return;
    }
    if (!otpCode) {
      setMessage('Please enter the OTP.');
      setIsError(true);
      return;
    }

    try {
      const verifyRes = await api.post('/verify-otp', { email, otp_code: otpCode });
      setMessage(verifyRes.data.message || 'OTP verified successfully!');
      setIsError(false);

      // Client-side validations for signup data
      if (!validateFullName(fullName)) { setMessage('Full Name must contain only alphabets and spaces.'); setIsError(true); return; }
      if (!validateEmail(email)) { setMessage('Please enter a valid email address.'); setIsError(true); return; }
      if (!validatePhoneNumber(phoneNumber)) { setMessage('Please enter a valid 10-digit phone number.'); setIsError(true); return; }
      if (!validatePassword(password)) { setMessage('Password must be a 6-digit number.'); setIsError(true); return; }


      // Step 2: Proceed with Signup after successful OTP verification
      const signupRes = await api.post('/signup', {
        fullName,
        email,
        phoneNumber,
        password,
      });

      setMessage(signupRes.data.message || 'Signup successful! Please login.');
      setIsError(false);
      setIsLogin(true);
      
      // Clear all fields after successful signup
      setEmail('');
      setPassword('');
      setFullName('');
      setPhoneNumber('');
      setOtpCode('');
      setOtpSent(false);

    } catch (err) {
      console.error('Signup/OTP verification error:', err.response || err);
      setMessage(err.response?.data?.message || 'Signup or OTP verification failed. Please try again.');
      setIsError(true);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsError(false);

    if (!email || !password) {
      setMessage('Email and password are required.');
      setIsError(true);
      return;
    }

    try {
      const res = await api.post('/login', { email, password });
      setMessage(res.data.message || 'Login successful!');
      setIsError(false);
      
      // AuthContext च्या login फंक्शनला user_id आणि username पास करा
      if (onLogin) {
        onLogin(res.data.user_id, res.data.username); 
      }
      navigate('/dashboard'); // लॉगिन झाल्यावर डॅशबोर्डवर नेव्हिगेट करा
    } catch (err) {
      console.error('Login error:', err.response || err);
      setMessage(err.response?.data?.message || 'Login failed. Invalid email or password.');
      setIsError(true);
    }
  };

  const handleForgotPasswordSendLink = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsError(false);
    setOtpSent(false);

    if (!validateEmail(email)) {
      setMessage('Please enter a valid email address.');
      setIsError(true);
      return;
    }

    try {
      const res = await api.post('/forgot-password-link', { email });
      setMessage(res.data.message || 'If an account exists, a password reset link has been sent to your email.');
      setIsError(false);
    } catch (err) {
      console.error('Forgot password send link error:', err.response || err);
      setMessage(err.response?.data?.message || 'Failed to send password reset link. Please try again.');
      setIsError(true);
    }
  };


  const toggleForm = (formType) => {
    setEmail('');
    setPassword('');
    setFullName('');
    setPhoneNumber('');
    setOtpCode('');
    setOtpSent(false);
    setMessage('');
    setIsError(false);

    if (formType === 'login') {
      setIsLogin(true);
      setIsForgotPassword(false);
    } else if (formType === 'signup') {
      setIsLogin(false);
      setIsForgotPassword(false);
    } else if (formType === 'forgotPassword') {
      setIsLogin(false);
      setIsForgotPassword(true);
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-info-section">
        <h1 className="info-title">Simplify Your Payments with AutoPay</h1>
        <ul className="info-list">
          <li><span role="img" aria-label="bill"></span> Never Miss a Bill Again</li>
          <li><span role="img" aria-label="automation"></span> Automate Your Financial Life</li>
          <li><span role="img" aria-label="security"></span> Secure & Smart Transactions</li>
        </ul>
        <p className="info-tagline">Your trusted partner for seamless financial management.</p>
      </div>

      <div className="login-container">
        {/* Conditional rendering for form titles */}
        {isLogin ? <h2>Login to AutoPay</h2> : 
         isForgotPassword ? <h2>Forgot Password?</h2> : 
         <h2>Sign Up for AutoPay</h2>}
        
        {/* Display messages */}
        {message && (
          <p className={`form-message ${isError ? 'error' : 'success'}`}>
            {message}
          </p>
        )}

        {isLogin && (
          /* Login Form */
          <form onSubmit={handleLoginSubmit}>
            <input
              type="email"
              placeholder="Email ID"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="6-digit Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength="6"
              pattern="\d{6}"
              title="Password must be a 6-digit number"
              required
            />
            <button id='submit' type="submit">Login</button>
            <p className="toggle-form-text">
              <span className="toggle-link" onClick={() => toggleForm('forgotPassword')}>
                Forgot Password?
              </span>
            </p>
          </form>
        )}

        {!isLogin && !isForgotPassword && (
          /* Signup Form */
          <form onSubmit={otpSent ? handleVerifyOtpAndSignup : handleSendOtp}>
            <input
              type="text"
              placeholder="Full Name (Alphabets only)"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              pattern="[a-zA-Z\s]+"
              title="Full Name must contain only alphabets and spaces"
              readOnly={otpSent}
            />
            <input
              type="email"
              placeholder="Email ID"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              readOnly={otpSent}
            />
            <input
              type="tel"
              placeholder="Phone Number (10 digits)"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              maxLength="10"
              pattern="\d{10}"
              title="Phone number must be a 10-digit number"
              required
              readOnly={otpSent}
            />
            <input
              type="password"
              placeholder="Create 6-digit Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength="6"
              pattern="\d{6}"
              title="Password must be a 6-digit number"
              required
              readOnly={otpSent}
            />

            {otpSent && (
              <>
                <input
                  type="text"
                  placeholder="Enter OTP (6 digits)"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  maxLength="6"
                  pattern="\d{6}"
                  title="OTP must be a 6-digit number"
                  required
                />
              </>
            )}

            {!otpSent ? (
              <button type="submit" className="otp-button">Send OTP</button>
            ) : (
              <button type="submit" className="otp-button">Verify OTP & Sign Up</button>
            )}
          </form>
        )}

        {isForgotPassword && (
          /* Forgot Password - Send Link Form */
          <form onSubmit={handleForgotPasswordSendLink}>
            <input
              type="email"
              placeholder="Enter your registered Email ID"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" className="otp-button">Send Reset Link</button>
          </form>
        )}

        <p className="toggle-form-text">
          {isLogin && !isForgotPassword && ( // Login page
            <>
              {"Don't have an account? "}
              <span className="toggle-link" onClick={() => toggleForm('signup')}>
                Sign Up here
              </span>
            </>
          )}

          {!isLogin && !isForgotPassword && ( // Signup page
            <>
              {"Already have an account? "}
              <span className="toggle-link" onClick={() => toggleForm('login')}>
                Login here
              </span>
            </>
          )}

          {isForgotPassword && ( // Forgot Password page
            <>
              {"Go back to "}
              <span className="toggle-link" onClick={() => toggleForm('login')}>
                Login here
              </span>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default Login;
