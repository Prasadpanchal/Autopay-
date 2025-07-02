// File: frontend/src/pages/Dashboard.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { db } from '../api'; // Import db from api.js
import { collection, query, where, getDocs, doc, updateDoc, onSnapshot } from "firebase/firestore";

import './Dashboard.css';

function Dashboard() {
  const [userData, setUserData] = useState(null); // For PostgreSQL user data (name, email, AutoPay wallet balance)
  const [bankAccountData, setBankAccountData] = useState(null); // For real-time bank data from Firestore
  const [error, setError] = useState('');
  const [userId, setUserId] = useState(null);
  const [connectedBankName, setConnectedBankName] = useState(null); // From localStorage
  const [connectedAccountNumber, setConnectedAccountNumber] = useState(null); // From localStorage

  const [amount, setAmount] = useState('');
  const [recipientAccountNumber, setRecipientAccountNumber] = useState('');
  const [recipientBankName, setRecipientBankName] = useState('');

  const navigate = useNavigate();

  // Function to fetch user data from PostgreSQL (Flask backend)
  // This will now only fetch user's basic info and AutoPay wallet balance
  const fetchUserDataFromBackend = async (id) => {
    if (!id) {
      setError('User ID not found. Please log in.');
      return;
    }
    try {
      const res = await api.get(`/user/${id}`);
      setUserData(res.data);
      setError('');
    } catch (err) {
      console.error('Error fetching user info from backend:', err);
      setError('Could not fetch user data from backend.');
    }
  };

  // Function to set up real-time listener for bank account data from Firestore
  const setupFirestoreListener = (bankName, accountNumber) => {
    if (!bankName || !accountNumber) {
      setBankAccountData(null); // Clear bank data if not fully connected
      return () => {}; // Return empty cleanup function
    }

    const bankRef = collection(db, bankName);
    const q = query(bankRef, where("account_number", "==", accountNumber));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docData = snapshot.docs[0].data();
        setBankAccountData(docData);
        setError(''); // Clear any Firestore-related errors
      } else {
        setBankAccountData(null);
        setError('Connected bank account details not found in Firestore.');
      }
    }, (err) => {
      console.error("Error listening to Firestore bank data:", err);
      setError('Failed to get real-time bank data from Firestore.');
    });

    return unsubscribe; // Return the unsubscribe function for cleanup
  };

  useEffect(() => {
    const storedUserId = localStorage.getItem('user_id');
    const storedBankName = localStorage.getItem('connectedBankName');
    const storedAccountNumber = localStorage.getItem('connectedAccountNumber');

    if (storedUserId) {
      setUserId(storedUserId);
      fetchUserDataFromBackend(storedUserId); // Fetch AutoPay wallet balance and user info

      if (storedBankName && storedAccountNumber) {
        setConnectedBankName(storedBankName);
        setConnectedAccountNumber(storedAccountNumber);
        const unsubscribe = setupFirestoreListener(storedBankName, storedAccountNumber);
        return () => unsubscribe(); // Cleanup on unmount
      } else {
        setBankAccountData(null); // No bank connected in localStorage
      }
    } else {
      setError('User not logged in. Please log in to view the dashboard.');
      // navigate('/login'); // Uncomment if you want to redirect to login
    }
  }, []); // Empty dependency array means this runs once on component mount

  const handleProcessPayments = () => {
    alert("Simulating daily automatic payment processing...");
    api.post('/process-due-payments')
      .then(res => {
        alert(`Processing Complete!\nPaid: ${res.data.processed}\nFailed: ${res.data.failed}`);
        fetchUserDataFromBackend(userId); // Refresh AutoPay wallet balance
      })
      .catch(err => {
        console.error('Error processing payments:', err);
        alert('Could not process payments.');
      });
  };

  const handleSendMoney = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!userId) {
        setError('User not logged in.');
        return;
    }

    if (!connectedBankName || !connectedAccountNumber) {
        setError('Please connect your bank account first on the Profile page.');
        return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        setError('Please enter a valid positive amount.');
        return;
    }

    if (!recipientAccountNumber || !recipientBankName) {
        setError('Please enter recipient account number and bank name.');
        return;
    }

    try {
        // Step 1: Update sender's balance in Firestore
        const senderBankRef = collection(db, connectedBankName);
        const senderQuery = query(senderBankRef, where("account_number", "==", connectedAccountNumber));
        const senderSnapshot = await getDocs(senderQuery);

        if (senderSnapshot.empty) {
            setError('Sender account not found in Firestore for balance update.');
            return;
        }

        const senderDoc = senderSnapshot.docs[0];
        const currentSenderBalance = parseFloat(senderDoc.data().balance);

        if (currentSenderBalance < parsedAmount) {
            setError('Insufficient balance in your connected bank account.');
            return;
        }

        const newSenderBalance = currentSenderBalance - parsedAmount;
        await updateDoc(doc(db, connectedBankName, senderDoc.id), {
            balance: newSenderBalance.toFixed(2)
        });

        // Step 2: Update recipient's balance in Firestore
        const recipientBankRef = collection(db, recipientBankName);
        const recipientQuery = query(recipientBankRef, where("account_number", "==", recipientAccountNumber));
        const recipientSnapshot = await getDocs(recipientQuery);

        if (recipientSnapshot.empty) {
            // If recipient not found in Firestore, revert sender's balance (basic rollback)
            await updateDoc(doc(db, connectedBankName, senderDoc.id), {
                balance: currentSenderBalance.toFixed(2)
            });
            setError('Recipient account not found in Firestore. Transaction reverted.');
            return;
        }

        const recipientDoc = recipientSnapshot.docs[0];
        const currentRecipientBalance = parseFloat(recipientDoc.data().balance);
        const newRecipientBalance = currentRecipientBalance + parsedAmount;
        await updateDoc(doc(db, recipientBankName, recipientDoc.id), {
            balance: newRecipientBalance.toFixed(2)
        });

        // Step 3: Update AutoPay wallet balance in PostgreSQL (optional, if you want to reflect the transfer)
        // This will deduct from the user's AutoPay wallet balance, not directly sync with bank balance.
        await api.post(`/deposit-balance/${userId}`, { amount: -parsedAmount });
        fetchUserDataFromBackend(userId); // Refresh AutoPay wallet balance

        setError('Money transferred successfully!');
        setAmount('');
        setRecipientAccountNumber('');
        setRecipientBankName('');
        // No need to call fetchUserDataFromBackend again for bank details, onSnapshot handles it.

    } catch (err) {
        console.error('Money transfer error:', err.response || err);
        setError(err.response?.data?.message || 'Money transfer failed. Please try again.');
    }
  };

  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!userData) return <div>Loading user data...</div>;

  return (
    <div className="dashboard-container">
      {/* Failed Payments Alert Section */}
      {userData.failed_payments_count > 0 && (
        <div className="alert alert-danger">
          <strong>Alert:</strong> You have {userData.failed_payments_count} failed payment(s). Please check your Payment List.
        </div>
      )}

      <div className="header-section">
        <h2 className="greeting">Welcome, {userData.name}</h2>
        <p className="date">📅 {formatDate(new Date())}</p>
      </div>

      <div className="kpi-container">
        <div className="kpi-box scheduled">
          <h5>Connected Bank</h5>
          <p>{connectedBankName || 'Not Connected'}</p> {/* From localStorage */}
        </div>
        <div className="kpi-box completed">
          <h5>Bank Account Number</h5>
          <p>{connectedAccountNumber || 'N/A'}</p> {/* From localStorage */}
        </div>
        <div className="kpi-box completed">
          <h5>Bank Balance</h5>
          <p>₹{bankAccountData && bankAccountData.balance ? parseFloat(bankAccountData.balance).toFixed(2) : '0.00'}</p> {/* From Firestore */}
        </div>
        <div className="kpi-box failed">
          <h5>AutoPay Wallet</h5> {/* This is the balance from PostgreSQL */}
          <p>₹{userData.balance ? parseFloat(userData.balance).toFixed(2) : '0.00'}</p>
        </div>
      </div>

      <div className="actions">
        <button className="btn-process" onClick={handleProcessPayments}>
          Simulate Due Payment Processing
        </button>
      </div>
    </div>
  );
}

export default Dashboard;
