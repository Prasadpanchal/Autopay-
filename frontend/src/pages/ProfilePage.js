// File: frontend/src/pages/ProfilePage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api'; // For Flask backend calls
import { db } from '../api'; // Correct: Import db from api.js, which re-exports from firebaseConfig
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";

import './ProfilePage.css';

const ProfilePage = () => {
    const [selectedBank, setSelectedBank] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [userId, setUserId] = useState(null);
    const [showOtpInput, setShowOtpInput] = useState(false);
    const [matchedAccountEmail, setMatchedAccountEmail] = useState('');
    const [matchedBankDetails, setMatchedBankDetails] = useState(null);
    const [bankConnected, setBankConnected] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        const storedUserId = localStorage.getItem('user_id');
        if (storedUserId) {
            setUserId(storedUserId);
            // Check if bank details are already in localStorage
            const storedBankName = localStorage.getItem('connectedBankName');
            const storedAccountNumber = localStorage.getItem('connectedAccountNumber');
            if (storedBankName && storedAccountNumber) {
                setBankConnected(true); // Assume connected if details exist
            }
        } else {
            setMessage('User not logged in. Please log in to manage your profile.');
            setIsError(true);
        }
    }, []);

    const handleConnectBank = async (e) => {
        e.preventDefault();
        setMessage('');
        setIsError(false);
        setShowOtpInput(false);
        setBankConnected(false); // Reset bank connected status on new attempt

        if (!userId) {
            setMessage('User ID not found. Please log in.');
            setIsError(true);
            return;
        }

        if (!selectedBank) {
            setMessage('Please select a Bank Name.');
            setIsError(true);
            return;
        }

        if (!phoneNumber || !accountNumber) {
            setMessage('Please enter both Phone Number and Account Number for verification.');
            setIsError(true);
            return;
        }

        try {
            const bankRef = collection(db, selectedBank); 
            const q = query(bankRef, 
                            where("phone_number", "==", phoneNumber),
                            where("account_number", "==", accountNumber));
            
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setMessage('Verification failed. No matching account found in the selected bank with provided details.');
                setIsError(true);
                return;
            }

            const matchedAccount = querySnapshot.docs[0].data();
            setMatchedAccountEmail(matchedAccount.email_id);
            setMatchedBankDetails(matchedAccount);

            const otpResponse = await api.post('/send-bank-otp', { email_id: matchedAccount.email_id });
            setMessage(otpResponse.data.message || 'OTP sent successfully to your registered email ID.');
            setIsError(false);
            setShowOtpInput(true);
            
        } catch (err) {
            console.error('Bank connection initiation error:', err.response || err);
            setMessage(err.response?.data?.message || 'Failed to initiate bank connection. Please check your details.');
            setIsError(true);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setMessage('');
        setIsError(false);

        if (!matchedAccountEmail || !otp) {
            setMessage('Please enter the OTP.');
            setIsError(true);
            return;
        }

        try {
            const verifyOtpResponse = await api.post('/verify-bank-otp', { 
                email_id: matchedAccountEmail, 
                otp_code: otp 
            });

            if (verifyOtpResponse.data.message === 'Bank OTP verified successfully!') {
                // Store bank details in localStorage instead of sending to PostgreSQL User model
                localStorage.setItem('connectedBankName', selectedBank);
                localStorage.setItem('connectedAccountNumber', matchedBankDetails.account_number);
                // Optionally, update the user's AutoPay wallet balance in PostgreSQL if needed
                // For now, we are explicitly NOT storing bank details in PostgreSQL User model

                setMessage('Bank details connected successfully!');
                setIsError(false);
                setBankConnected(true);
                setPhoneNumber('');
                setAccountNumber('');
                setOtp('');
                setSelectedBank('');
                setShowOtpInput(false);

                setTimeout(() => {
                    navigate('/dashboard');
                }, 2000);

            } else {
                setMessage(verifyOtpResponse.data.message || 'OTP verification failed.');
                setIsError(true);
            }

        } catch (err) {
            console.error('OTP verification error:', err.response || err);
            setMessage(err.response?.data?.message || 'Failed to verify OTP. Please try again.');
            setIsError(true);
        }
    };

    return (
        <div className="profile-page-container">
            <h2>Connect Your Bank Account</h2>
            {message && (
                <p className={`form-message ${isError ? 'error' : 'success'}`}>
                    {message}
                </p>
            )}

            {!bankConnected ? (
                <form onSubmit={showOtpInput ? handleVerifyOtp : handleConnectBank}>
                    <div className="form-group">
                        <label htmlFor="bankName">Bank Name:</label>
                        <select
                            id="bankName"
                            value={selectedBank}
                            onChange={(e) => setSelectedBank(e.target.value)}
                            required
                            disabled={showOtpInput}
                        >
                            <option value="">Select Bank</option>
                            <option value="GlobalBank">GlobalBank</option> 
                            <option value="OrbitalBank">OrbitalBank</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="phoneNumber">Phone Number:</label>
                        <input
                            type="tel"
                            id="phoneNumber"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            maxLength="10"
                            pattern="\d{10}"
                            title="Phone number must be a 10-digit number"
                            required
                            disabled={showOtpInput}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="accountNumber">Account Number:</label>
                        <input
                            type="text"
                            id="accountNumber"
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                            required
                            disabled={showOtpInput}
                        />
                    </div>

                    {!showOtpInput && (
                        <button type="submit" className="connect-button">
                            Connect Bank
                        </button>
                    )}

                    {showOtpInput && (
                        <div className="otp-section">
                            <div className="form-group">
                                <label htmlFor="otp">Enter OTP:</label>
                                <input
                                    type="text"
                                    id="otp"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    maxLength="6"
                                    pattern="\d{6}"
                                    title="OTP must be a 6-digit number"
                                    required
                                />
                            </div>
                            <button type="submit" className="connect-button">
                                Verify OTP
                            </button>
                            <button 
                                type="button" 
                                className="back-button" 
                                onClick={() => setShowOtpInput(false)}
                                style={{ marginTop: '10px' }}
                            >
                                Resend OTP (Not Implemented) / Go Back
                            </button>
                        </div>
                    )}
                </form>
            ) : (
                <div className="bank-connected-success">
                    <h3>Bank Connected Successfully!</h3>
                    <p>You can now see your bank details on your dashboard.</p>
                    <button className="connect-button" onClick={() => navigate('/dashboard')}>
                        Continue
                    </button>
                </div>
            )}
            
            {!bankConnected && (
                <button className="back-button" onClick={() => navigate('/dashboard')} style={{ marginTop: '20px' }}>
                    Back to Dashboard
                </button>
            )}
        </div>
    );
};

export default ProfilePage;
