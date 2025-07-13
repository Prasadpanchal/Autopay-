// File: frontend/src/pages/SchedulePayment.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../pages/SchedulePayment.css';
import '../components/SubscriptionBox.css'; // ✅ import CSS for subscription block
import api from '../api';
import { db } from '../firebaseConfig';
import { collection, query, where, onSnapshot } from "firebase/firestore";
import SubscriptionBox from '../components/SubscriptionBox';


function SchedulePayment() {
  const [formData, setFormData] = useState({
    payee: '',
    amount: '',
    due_date: '',
    method: ''
  });
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [userId, setUserId] = useState(null);
  const [connectedBankName, setConnectedBankName] = useState(null);
  const [connectedAccountNumber, setConnectedAccountNumber] = useState(null);
  const [bankBalance, setBankBalance] = useState(0);
  const [userEmail, setUserEmail] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const storedUserId = localStorage.getItem('user_id');
    if (storedUserId) {
      setUserId(storedUserId);
      const fetchUserData = async () => {
        try {
          const res = await api.get(`/user/${storedUserId}`);
          if (res.status === 200) {
            setUserEmail(res.data.email);
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
          setMessage('Could not fetch user data.');
          setIsError(true);
        }
      };
      fetchUserData();
    } else {
      setMessage('User not logged in. Please log in.');
      setIsError(true);
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    if (!userEmail) return () => { };

    const bankCollectionNames = ["GlobalBank", "OrbitalBank"];
    let unsubscribeFunctions = [];

    bankCollectionNames.forEach(bankName => {
      const q = query(collection(db, bankName), where('email_id', '==', userEmail));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const bankDoc = snapshot.docs[0].data();
          setConnectedBankName(bankName);
          setConnectedAccountNumber(bankDoc.account_number || 'N/A');
          setBankBalance(parseFloat(bankDoc.balance || 0.00));
        }
      }, (err) => {
        console.error(`Firestore error from ${bankName}:`, err);
        setMessage('Failed to get real-time bank data.');
        setIsError(true);
      });
      unsubscribeFunctions.push(unsubscribe);
    });

    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }, [userEmail]);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setMessage('');
    setIsError(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsError(false);

    if (!userId) {
      setMessage('User not logged in.');
      setIsError(true);
      return;
    }

    const paymentAmount = parseFloat(formData.amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      setMessage('Enter valid amount.');
      setIsError(true);
      return;
    }

    if (!formData.method) {
      setMessage('Please select a payment method.');
      setIsError(true);
      return;
    }

    if (formData.method === 'Connected Bank') {
      if (!connectedBankName || !connectedAccountNumber) {
        setMessage('No bank account connected.');
        setIsError(true);
        return;
      }
      if (bankBalance < paymentAmount) {
        setMessage('Insufficient bank balance.');
        setIsError(true);
        return;
      }
    }

    try {
      const res = await api.post('/schedule-payment', formData);
      setMessage(res.data.message || 'Payment scheduled successfully!');
      setIsError(false);
      setFormData({ payee: '', amount: '', due_date: '', method: '' });
      navigate('/payment-list');
    } catch (err) {
      console.error("Error:", err);
      setMessage(`Failed to schedule payment: ${err.response?.data?.message || err.message}`);
      setIsError(true);
    }
  };

  const getMethodOptions = () => {
    const options = [<option key="select" value="">Select Method</option>];

    if (connectedBankName && connectedAccountNumber) {
      options.push(
        <option key="bank" value="Connected Bank">
          {connectedBankName} - ₹{bankBalance.toFixed(2)}
        </option>
      );
    }

    options.push(
      <option key="credit" value="Credit Card">Credit Card</option>,
      <option key="upi" value="UPI">UPI</option>,
      <option key="cash" value="Cash">Cash</option>,
      <option key="razorpay" value="Razorpay Autopay">Razorpay Autopay (Recurring)</option>
    );

    return options;
  };

  return (
    <div className="schedule-subscription-wrapper">
      {/* Left Block - Manual Payment */}
      <div className="schedule-container">
        <h2>Schedule a Payment</h2>
        {message && (
          <p className={`form-message ${isError ? 'error' : 'success'}`}>
            {message}
          </p>
        )}
        <form onSubmit={handleSubmit}>
          <label htmlFor="payee">Payee</label>
          <input type="text" id="payee" name="payee" value={formData.payee} onChange={handleChange} required />

          <label htmlFor="amount">Amount</label>
          <input type="number" step="0.01" id="amount" name="amount" value={formData.amount} onChange={handleChange} required />

          <label htmlFor="due_date">Due Date</label>
          <input type="date" id="due_date" name="due_date" value={formData.due_date} onChange={handleChange} required />

          <label htmlFor="method">Payment Method</label>
          <select id="method" className='option' name="method" value={formData.method} onChange={handleChange} required>
            {getMethodOptions()}
          </select>

          <button id='submit' type="submit">Schedule Payment</button>
        </form>
      </div>

      {/* Right Block - Subscription Box */}
      <SubscriptionBox userEmail={userEmail} />
    </div>
  );
}

export default SchedulePayment;
