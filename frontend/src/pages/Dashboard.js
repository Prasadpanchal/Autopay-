// File: frontend/src/pages/Dashboard.js

import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { db } from '../firebaseConfig'; 
import { collection, query, where, onSnapshot } from 'firebase/firestore'; 

import './Dashboard.css'; // कस्टम CSS साठी

function Dashboard() {
  const { userId, username, logout } = useContext(AuthContext); 
  const navigate = useNavigate();

  const [userData, setUserData] = useState(null); 
  const [connectedBank, setConnectedBank] = useState('Loading...');
  const [bankAccountNumber, setBankAccountNumber] = useState('Loading...');
  const [bankBalance, setBankBalance] = useState(0.00);
  const [loadingBankDetails, setLoadingBankDetails] = useState(true);
  const [errorBankDetails, setErrorBankDetails] = useState(null);
  const [currentDate, setCurrentDate] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSimulateProcessingMessage, setShowSimulateProcessingMessage] = useState(false);
  const [simulateProcessingMessage, setSimulateProcessingMessage] = useState('');
  const [userEmail, setUserEmail] = useState(null); 

  useEffect(() => {
    if (!userId) {
      navigate('/login');
      return;
    }

    const today = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    setCurrentDate(today.toLocaleDateString('en-US', options));

    const fetchUserDataFromBackend = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/user/${userId}`);
        if (response.status === 200) {
          setUserData(response.data); 
          setUserEmail(response.data.email); 
        }
      } catch (error) {
        console.error('Error fetching user data from PostgreSQL:', error);
        setUserData({}); 
      }
    };

    fetchUserDataFromBackend();
  }, [userId, navigate]); 

  useEffect(() => {
    if (!userEmail) { 
      setLoadingBankDetails(true); 
      return;
    }

    setLoadingBankDetails(true);
    setErrorBankDetails(null);

    const bankCollectionNames = ["GlobalBank", "OrbitalBank"];
    let unsubscribeFunctions = []; 

    let foundBank = false; 

    bankCollectionNames.forEach(bankName => {
      const q = query(collection(db, bankName), where('email_id', '==', userEmail));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const bankDoc = snapshot.docs[0].data();
          setConnectedBank(bankName); 
          setBankAccountNumber(bankDoc.account_number || 'N/A');
          setBankBalance(parseFloat(bankDoc.balance || 0.00));
          setLoadingBankDetails(false);
          foundBank = true; 
        } 
      }, (error) => {
        console.error(`Error listening to Firestore bank data from ${bankName}:`, error);
        setErrorBankDetails('Failed to load bank details from Firestore.');
        setConnectedBank('Not Connected');
        setBankAccountNumber('N/A');
        setBankBalance(0.00);
        setLoadingBankDetails(false);
      });
      unsubscribeFunctions.push(unsubscribe);
    });

    const timeoutId = setTimeout(() => {
      if (!foundBank && loadingBankDetails) { 
        setConnectedBank('Not Connected');
        setBankAccountNumber('N/A');
        setBankBalance(0.00);
        setLoadingBankDetails(false);
      }
    }, 3000); 

    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
      clearTimeout(timeoutId);
    };
  }, [userEmail]); 

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    logout(); 
    navigate('/login');
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const simulateDuePaymentProcessing = async () => {
    setSimulateProcessingMessage('Processing due payments...');
    try {
      const response = await axios.post('http://localhost:5000/api/process-due-payments');
      setSimulateProcessingMessage(response.data.message || 'Payments processed.');
      const userResponse = await axios.get(`http://localhost:5000/api/user/${userId}`);
      if (userResponse.status === 200) {
        setUserData(userResponse.data); 
      }
    } catch (error) {
      console.error('Error simulating due payment processing:', error.response?.data || error);
      setSimulateProcessingMessage(error.response?.data?.message || 'Failed to process payments. Check console for details.');
    } finally {
      setTimeout(() => setShowSimulateProcessingMessage(false), 5000);
    }
  };

  if (!userData) { 
    return (
      <div className="dashboard-loading-container">
        <p className="dashboard-loading-text">Loading user data...</p>
      </div>
    );
  }

  if (loadingBankDetails) { 
    return (
      <div className="dashboard-loading-container">
        <p className="dashboard-loading-text">Loading bank details...</p>
      </div>
    );
  }

  if (errorBankDetails) { 
    return (
      <div className="dashboard-loading-container">
        <p className="dashboard-error-text">{errorBankDetails}</p>
      </div>
    );
  }

  return (
    <div className="dashboard-main-content">
      {userData.failed_payments_count > 0 && (
        <div className="dashboard-alert-failed" role="alert">
          <p className="dashboard-alert-bold">Alert:</p>
          <p>You have {userData.failed_payments_count} failed payment(s). Please check your Payment List.</p>
        </div>
      )}

      <h1 className="dashboard-welcome-heading greeting">Welcome, {username}</h1>
      <p className="dashboard-current-date">{currentDate}</p>

      <div className="dashboard-kpi-grid">
        {/* Connected Bank Card */}
        <div className="kpi-box">
          <h3 className="kpi-box-title">Bank Name</h3>
          <p className={`kpi-box-value ${connectedBank === 'Not Connected' ? 'text-red' : 'text-green'}`}>
            {connectedBank}
          </p>
        </div>

        {/* Bank Account Number Card */}
        <div className="kpi-box">
          <h3 className="kpi-box-title">Bank Account Number</h3>
          <p className="kpi-box-value text-dark-gray">
            {bankAccountNumber}
          </p>
        </div>

        {/* Bank Balance Card */}
        <div className="kpi-box">
          <h3 className="kpi-box-title">Bank Balance</h3>
          <p className="kpi-box-value text-indigo">
            ₹{bankBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Simulate Due Payment Processing Button */}
      <div className="dashboard-button-container">
        <button
          onClick={simulateDuePaymentProcessing}
          className="btn-process"
        >
          Simulate Due Payment Processing
        </button>
      </div>

      {showSimulateProcessingMessage && (
        <div className="modal-overlay">
          <div className="modal-content">
            <p className="modal-text">{simulateProcessingMessage}</p>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">Confirm Logout</h2>
            <p className="modal-message">Are you sure you want to log out?</p>
            <div className="modal-actions">
              <button
                onClick={cancelLogout}
                className="modal-button-cancel"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="modal-button-logout"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
