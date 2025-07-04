// File: frontend/src/pages/SchedulePayment.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import '../pages/SchedulePayment.css';
import api from '../api';
import { db } from '../firebaseConfig'; // Import db from firebaseConfig.js
import { collection, query, where, getDocs, doc, updateDoc, onSnapshot } from "firebase/firestore"; 

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
  const [bankBalance, setBankBalance] = useState(0); // Real-time bank balance from Firestore
  const [autoPayWalletBalance, setAutoPayWalletBalance] = useState(0); // AutoPay Wallet balance from PostgreSQL (will be removed as per requirement)
  const [userEmail, setUserEmail] = useState(null); // युझरचा ईमेल साठवण्यासाठी

  const navigate = useNavigate();

  // Fetch user data (including email) from PostgreSQL
  useEffect(() => {
    const storedUserId = localStorage.getItem('user_id');
    if (storedUserId) {
      setUserId(storedUserId);
      const fetchUserData = async () => {
        try {
          const res = await api.get(`/user/${storedUserId}`);
          if (res.status === 200) {
            setUserEmail(res.data.email);
            // remove wallet balance as per requirement
            // setAutoPayWalletBalance(parseFloat(res.data.balance)); 
          }
        } catch (err) {
          console.error('Error fetching user data from PostgreSQL:', err);
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

  // Setup Firestore listener for bank balance (based on userEmail)
  useEffect(() => {
    if (!userEmail) {
      setBankBalance(0);
      return () => {};
    }

    const bankCollectionNames = ["GlobalBank", "OrbitalBank"];
    let unsubscribeFunctions = [];

    bankCollectionNames.forEach(bankName => {
      const q = query(collection(db, bankName), where('email_id', '==', userEmail));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const bankDoc = snapshot.docs[0].data();
          setConnectedBankName(bankName); // बँकचे नाव सेट करा
          setConnectedAccountNumber(bankDoc.account_number || 'N/A'); // अकाउंट नंबर सेट करा
          setBankBalance(parseFloat(bankDoc.balance || 0.00));
        } else {
          // जर या कलेक्शनमध्ये बँक तपशील सापडले नाहीत, तर इतर कलेक्शन शोधत राहील
        }
      }, (err) => {
        console.error(`Error listening to Firestore bank data from ${bankName}:`, err);
        setMessage('Failed to get real-time bank data from Firestore.');
        setIsError(true);
      });
      unsubscribeFunctions.push(unsubscribe);
    });

    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }, [userEmail]); // userEmail बदलल्यावर पुन्हा चालवा

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
      setMessage('User not logged in. Please log in.');
      setIsError(true);
      return;
    }

    const paymentAmount = parseFloat(formData.amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      setMessage('Please enter a valid positive amount.');
      setIsError(true);
      return;
    }

    if (!formData.method) {
      setMessage('Please select a payment method.');
      setIsError(true);
      return;
    }

    // बॅलन्स चेक फक्त फ्रंटएंड UI साठी, डेबिट बॅकएंडमध्ये होईल
    if (formData.method === 'Connected Bank') {
      if (!connectedBankName || !connectedAccountNumber) {
        setMessage('No bank account connected. Please connect one in your profile.');
        setIsError(true);
        return;
      }
      if (bankBalance < paymentAmount) {
        setMessage('Insufficient balance in your connected bank account.');
        setIsError(true);
        return;
      }
    } 
    // AutoPay Wallet लॉजिक काढून टाका, कारण वॉलेट वापरायचे नाही
    // else if (formData.method === 'AutoPay Wallet') {
    //   if (autoPayWalletBalance < paymentAmount) {
    //     setMessage('Insufficient balance in your AutoPay Wallet.');
    //     setIsError(true);
    //     return;
    //   }
    // } 
    // इतर पेमेंट पद्धतींसाठी (उदा. Credit Card, UPI) येथे बॅलन्स चेकची गरज नाही.

    try {
      // फक्त पेमेंट शेड्यूल करण्यासाठी बॅकएंडला कॉल करा
      // बॅलन्स डेबिट करण्याची लॉजिक process_due_payments (बॅकएंड) मध्ये राहील.
      const res = await api.post('/schedule-payment', formData);
      setMessage(res.data.message || 'Payment scheduled successfully!');
      setIsError(false);
      setFormData({ payee: '', amount: '', due_date: '', method: '' }); // फॉर्म रीसेट करा
      
      // पेमेंट शेड्यूल झाल्यावर, युझरला पेमेंट लिस्टवर नेव्हिगेट करा
      navigate('/payment-list');

    } catch (err) {
      console.error("Error scheduling payment:", err.response?.data || err);
      setMessage(`Failed to schedule payment: ${err.response?.data?.message || err.message}`);
      setIsError(true);
    }
  };

  const getMethodOptions = () => {
    const options = [
      <option key="select" value="">Select Method</option>
    ];
    // AutoPay Wallet ऑप्शन काढून टाका
    // options.push(<option key="wallet" value="AutoPay Wallet">AutoPay Wallet - Balance: ₹{autoPayWalletBalance.toFixed(2)}</option>);

    if (connectedBankName && connectedAccountNumber) {
      options.push(
        <option key="bank" value="Connected Bank">
          {connectedBankName} - Balance: ₹{bankBalance.toFixed(2)}
        </option>
      );
    }
    // इतर पद्धती (उदा. क्रेडिट कार्ड, UPI) तुम्हाला हव्या असल्यास जोडू शकता
    options.push(
      <option key="credit" value="Credit Card">Credit Card</option>,
      <option key="upi" value="UPI">UPI</option>,
      <option key="cash" value="Cash">Cash</option>
    );
    return options;
  };

  return (
    <div className="schedule-container">
      <h2>Schedule a Payment</h2>
      {message && (
        <p className={`form-message ${isError ? 'error' : 'success'}`}>
          {message}
        </p>
      )}
      <form onSubmit={handleSubmit}>
        <label htmlFor="payee">Payee</label>
        <input
          type="text"
          id="payee"
          name="payee"
          placeholder="e.g., Landlord, Electricity Company"
          value={formData.payee}
          onChange={handleChange}
          required
        />

        <label htmlFor="amount">Amount</label>
        <input
          type="number"
          step="0.01"
          id="amount"
          name="amount"
          placeholder="e.g., 1500.00"
          value={formData.amount}
          onChange={handleChange}
          required
        />

        <label htmlFor="due_date">Due Date</label>
        <input
          type="date"
          id="due_date"
          name="due_date"
          value={formData.due_date}
          onChange={handleChange}
          required
        />

        <label htmlFor="method">Payment Method</label>
        <select
          id="method"
          className='option'
          name="method"
          value={formData.method}
          onChange={handleChange}
          required
        >
          {getMethodOptions()}
        </select>

        <button id='submit' type="submit">Schedule Payment</button>
      </form>
    </div>
  );
}

export default SchedulePayment;
