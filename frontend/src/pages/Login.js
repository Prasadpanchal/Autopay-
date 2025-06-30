// File: src/pages/Login.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// assuming api.js is in src/api.js, adjust path if necessary
import api from '../../src/api'; 
import './Login.css';

const Login = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true); // State to toggle between login and signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(''); // For signup
  const [phoneNumber, setPhoneNumber] = useState(''); // For signup
  const [otpSent, setOtpSent] = useState(false); // State for OTP sent status
  const [otpCode, setOtpCode] = useState(''); // State for OTP input
  const [message, setMessage] = useState(''); // For displaying success/error messages
  const [isError, setIsError] = useState(false); // To style messages

  const navigate = useNavigate();

  // Client-side validation functions
  const validateFullName = (name) => /^[a-zA-Z\s]+$/.test(name);
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhoneNumber = (phone) => /^\d{10}$/.test(phone);
  const validatePassword = (pass) => /^\d{6}$/.test(pass); // 6 digits only

  // Function to handle sending OTP
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
      setOtpSent(true); // Indicate that OTP has been sent
    } catch (err) {
      console.error('Send OTP error:', err.response || err);
      setMessage(err.response?.data?.message || 'Failed to send OTP. Please try again.');
      setIsError(true);
    }
  };

  // Function to handle OTP verification and then signup
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
      // Step 1: Verify OTP
      const verifyRes = await api.post('/verify-otp', { email, otp_code: otpCode });
      setMessage(verifyRes.data.message || 'OTP verified successfully!');
      setIsError(false);
      // setOtpVerified(true); // No need for this state as we proceed to signup immediately

      // Step 2: Proceed with Signup after successful OTP verification
      // Perform client-side validations again before sending signup data
      if (!validateFullName(fullName)) {
        setMessage('Full Name must contain only alphabets and spaces.');
        setIsError(true);
        return;
      }
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
      if (!validatePassword(password)) {
        setMessage('Password must be a 6-digit number.');
        setIsError(true);
        return;
      }

      const signupRes = await api.post('/signup', {
        fullName,
        email,
        phoneNumber,
        password,
      });

      setMessage(signupRes.data.message || 'Signup successful! Please login.');
      setIsError(false);
      setIsLogin(true); // Switch to login form after successful signup
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

  // Function to handle Login submission
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
      
      // Store user ID and name (full_name) in localStorage
      localStorage.setItem('user_id', res.data.user_id);
      localStorage.setItem('username', res.data.username); // Assuming 'username' key for full_name

      if (onLogin) onLogin(); // Call onLogin prop if provided
      navigate('/dashboard'); // Redirect to dashboard
    } catch (err) {
      console.error('Login error:', err.response || err);
      setMessage(err.response?.data?.message || 'Login failed. Invalid email or password.');
      setIsError(true);
    }
  };

  // Function to toggle between Login and Signup forms
  const toggleForm = () => {
    setIsLogin((prevIsLogin) => !prevIsLogin);
    // Clear all form states when toggling
    setEmail('');
    setPassword('');
    setFullName('');
    setPhoneNumber('');
    setOtpCode('');
    setOtpSent(false);
    setMessage('');
    setIsError(false);
  };

  return (
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

      {/* Right-side login/signup form container*/}
      <div className="login-container">
        <h2>{isLogin ? 'Login to AutoPay' : 'Sign Up for AutoPay'}</h2>
        
        {/* Display messages */}
        {message && (
          <p className={`form-message ${isError ? 'error' : 'success'}`}>
            {message}
          </p>
        )}

        {isLogin ? (
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
          </form>
        ) : (
          /* Signup Form */
          <form onSubmit={otpSent ? handleVerifyOtpAndSignup : handleSendOtp}>
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              pattern="[a-zA-Z\s]+"
              title="Full Name must contain only alphabets and spaces"
              readOnly={otpSent} /* Disable after OTP sent */
            />
            <input
              type="email"
              placeholder="Email ID"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              readOnly={otpSent} /* Disable after OTP sent */
            />
            <input
              type="tel"
              placeholder="Phone Number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              maxLength="10"
              pattern="\d{10}"
              title="Phone number must be a 10-digit number"
              required
              readOnly={otpSent} /* Disable after OTP sent */
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
              readOnly={otpSent} /* Disable after OTP sent */
            />

            {!otpSent ? (
              <button type="submit" className="otp-button">Send OTP</button>
            ) : (
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
                <button type="submit" className="otp-button">Verify OTP & Sign Up</button>
              </>
            )}
          </form>
        )}

        <p className="toggle-form-text">
          {isLogin ? 'Don\'t have an account?' : 'Already have an account?'}
          <span className="toggle-link" onClick={toggleForm}>
            {isLogin ? 'Sign Up here' : 'Login here'}
          </span>
        </p>
      </div>
    </div>
  );
};

export default Login;
