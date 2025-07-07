// src/pages/Subscription.js
import React, { useState } from 'react';
import './Subscription.css';

const Settings = () => {
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [gateway, setGateway] = useState('Razorpay');
  const [retryCount, setRetryCount] = useState(3);

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`Settings Saved:\nTimeZone: ${timezone}\nGateway: ${gateway}\nRetry Attempts: ${retryCount}`);
    // You can replace this with API call to save settings
  };

  return (
    <div className="settings-container">
      <h2>Application Settings</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Time Zone:
          <select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
            <option value="America/New_York">America/New_York (EST)</option>
            <option value="Europe/London">Europe/London (GMT)</option>
          </select>
        </label>

        <label>
          Payment Gateway:
          <select value={gateway} onChange={(e) => setGateway(e.target.value)}>
            <option value="Razorpay">Razorpay</option>
            <option value="PayPal">PayPal</option>
            <option value="Stripe">Stripe</option>
          </select>
        </label>

        <label>
          Retry Attempts on Failure:
          <input
            type="number"
            min="0"
            max="10"
            value={retryCount}
            onChange={(e) => setRetryCount(e.target.value)}
          />
        </label>

        <button type="submit">Save Settings</button>
      </form>
    </div>
  );
};

export default Settings;
