// File: frontend/src/pages/SchedulePayment.js
import React, { useState, useEffect } from 'react'; // Added useEffect
import { useNavigate } from 'react-router-dom'; // Added useNavigate
import '../pages/SchedulePayment.css';
import api from '../api';
import { db } from '../api'; // Import db from api.js
import { collection, query, where, getDocs, doc, updateDoc, onSnapshot } from "firebase/firestore"; // Added Firestore imports

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
  const [autoPayWalletBalance, setAutoPayWalletBalance] = useState(0); // AutoPay Wallet balance from PostgreSQL

  const navigate = useNavigate();

  // Fetch AutoPay Wallet Balance from PostgreSQL
  const fetchAutoPayWalletBalance = async (id) => {
    try {
      const res = await api.get(`/user/${id}`);
      setAutoPayWalletBalance(parseFloat(res.data.balance));
    } catch (err) {
      console.error('Error fetching AutoPay wallet balance:', err);
      setMessage('Could not fetch AutoPay wallet balance.');
      setIsError(true);
    }
  };

  // Setup Firestore listener for bank balance
  const setupFirestoreListener = (bankName, accountNumber) => {
    if (!bankName || !accountNumber) {
      setBankBalance(0);
      return () => {};
    }

    const bankRef = collection(db, bankName);
    const q = query(bankRef, where("account_number", "==", accountNumber));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docData = snapshot.docs[0].data();
        setBankBalance(parseFloat(docData.balance));
      } else {
        setBankBalance(0);
        setMessage('Connected bank account details not found in Firestore.');
        setIsError(true);
      }
    }, (err) => {
      console.error("Error listening to Firestore bank data:", err);
      setMessage('Failed to get real-time bank data from Firestore.');
      setIsError(true);
    });

    return unsubscribe;
  };

  useEffect(() => {
    const storedUserId = localStorage.getItem('user_id');
    const storedBankName = localStorage.getItem('connectedBankName');
    const storedAccountNumber = localStorage.getItem('connectedAccountNumber');

    if (storedUserId) {
      setUserId(storedUserId);
      fetchAutoPayWalletBalance(storedUserId); // Fetch AutoPay wallet balance

      if (storedBankName && storedAccountNumber) {
        setConnectedBankName(storedBankName);
        setConnectedAccountNumber(storedAccountNumber);
        const unsubscribe = setupFirestoreListener(storedBankName, storedAccountNumber);
        return () => unsubscribe(); // Cleanup on unmount
      }
    } else {
      setMessage('User not logged in. Please log in.');
      setIsError(true);
      navigate('/login');
    }
  }, [navigate]); // Added navigate to dependency array

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setMessage(''); // Clear message on input change
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

    try {
      let debitSuccessful = false;
      let newBalance = 0;

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

        // Debit from Firestore bank balance
        const bankRef = collection(db, connectedBankName);
        const q = query(bankRef, where("account_number", "==", connectedAccountNumber));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const bankDoc = snapshot.docs[0];
          newBalance = bankBalance - paymentAmount;
          await updateDoc(doc(db, connectedBankName, bankDoc.id), {
            balance: newBalance.toFixed(2)
          });
          debitSuccessful = true;
          setMessage('Payment scheduled and debited from Connected Bank.');
        } else {
          setMessage('Connected bank account not found in Firestore.');
          setIsError(true);
          return;
        }

      } else if (formData.method === 'AutoPay Wallet') {
        if (autoPayWalletBalance < paymentAmount) {
          setMessage('Insufficient balance in your AutoPay Wallet.');
          setIsError(true);
          return;
        }

        // Debit from AutoPay Wallet (PostgreSQL)
        const res = await api.post(`/deposit-balance/${userId}`, { amount: -paymentAmount }); // Use negative amount to deduct
        if (res.data.message) {
          setAutoPayWalletBalance(res.data.new_balance); // Update local state
          debitSuccessful = true;
          setMessage('Payment scheduled and debited from AutoPay Wallet.');
        } else {
          setMessage('Failed to debit from AutoPay Wallet.');
          setIsError(true);
          return;
        }
      } else {
        // For other methods like Credit Card, UPI, Cash, we assume external processing
        // and just proceed with scheduling the payment without balance check/debit.
        // You might want to add a warning or specific logic for these.
        setMessage(`Payment scheduled using ${formData.method}. No balance debit performed.`);
        debitSuccessful = true; // Assume successful for external methods
      }

      if (debitSuccessful) {
        // Schedule payment in PostgreSQL (Flask backend)
        const res = await api.post('/schedule-payment', formData);
        setMessage(res.data.message);
        setFormData({ payee: '', amount: '', due_date: '', method: '' });
      }

    } catch (err) {
      console.error("Error scheduling payment or debiting funds:", err.response?.data || err);
      setMessage(`Failed to schedule payment or debit funds: ${err.response?.data?.error || err.message}`);
      setIsError(true);
    }
  };

  const getMethodOptions = () => {
    const options = [
      <option key="select" value="">Select Method</option>,
      <option key="wallet" value="AutoPay Wallet">AutoPay Wallet - Balance: ₹{autoPayWalletBalance.toFixed(2)}</option>
    ];
    if (connectedBankName && connectedAccountNumber) {
      options.push(
        <option key="bank" value="Connected Bank">
          {connectedBankName} - Balance: ₹{bankBalance.toFixed(2)}
        </option>
      );
    }
    // Add other methods if they are still relevant and don't require balance checks
    // options.push(
    //   <option key="credit" value="Credit Card">Credit Card</option>,
    //   <option key="upi" value="UPI">UPI</option>,
    //   <option key="cash" value="Cash">Cash</option>
    // );
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
