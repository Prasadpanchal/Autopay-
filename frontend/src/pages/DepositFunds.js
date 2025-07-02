// File: frontend/src/pages/DepositFunds.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './DepositFunds.css'; // Create this CSS file for styling

const DepositFunds = () => {
    const [amount, setAmount] = useState('');
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [userId, setUserId] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const storedUserId = localStorage.getItem('user_id');
        if (storedUserId) {
            setUserId(storedUserId);
        } else {
            setMessage('User not logged in. Please log in to deposit funds.');
            setIsError(true);
        }
    }, []);

    const handleDeposit = async (e) => {
        e.preventDefault();
        setMessage('');
        setIsError(false);

        if (!userId) {
            setMessage('User ID not found. Please log in.');
            setIsError(true);
            return;
        }

        const depositAmount = parseFloat(amount);

        if (isNaN(depositAmount) || depositAmount <= 0) {
            setMessage('Please enter a valid positive amount to deposit.');
            setIsError(true);
            return;
        }

        try {
            const response = await api.post(`/deposit-balance/${userId}`, { amount: depositAmount });
            setMessage(response.data.message || 'Funds deposited successfully!');
            setIsError(false);
            setAmount(''); // Clear the input field

            // Optionally, navigate back to dashboard after a short delay
            setTimeout(() => {
                navigate('/dashboard');
            }, 2000);

        } catch (err) {
            console.error('Deposit error:', err.response || err);
            setMessage(err.response?.data?.message || 'Failed to deposit funds. Please try again.');
            setIsError(true);
        }
    };

    return (
        <div className="deposit-funds-container">
            <h2>Deposit Funds to Your AutoPay Account</h2>
            {message && (
                <p className={`form-message ${isError ? 'error' : 'success'}`}>
                    {message}
                </p>
            )}
            <form onSubmit={handleDeposit}>
                <div className="form-group">
                    <label htmlFor="amount">Amount to Deposit (INR):</label>
                    <input
                        type="number"
                        id="amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        step="0.01"
                        min="0.01"
                        required
                    />
                </div>
                <button type="submit" className="deposit-button">
                    Deposit
                </button>
            </form>
            <button className="back-button" onClick={() => navigate('/dashboard')}>
                Back to Dashboard
            </button>
        </div>
    );
};

export default DepositFunds;
