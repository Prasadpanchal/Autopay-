// File: src/components/RechargePopup.js
import React, { useState } from 'react';
import './RechargePopup.css';

function RechargePopup({ onClose, onSubscribe }) {
    const [mobile, setMobile] = useState('');
    const [operator, setOperator] = useState('');
    const [amount, setAmount] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [plan, setPlan] = useState('');
    const [error, setError] = useState('');

    const predefinedPlans = {
        '₹199 - Basic Plan': 199,
        '₹299 - 5G Unlimited': 299,
        '₹399 - All-in-One Pack': 399,
        '₹149 - Data Pack': 149,
        '₹649 - Premium Plus': 649
    };

    const handlePlanChange = (e) => {
        const selectedPlan = e.target.value;
        setPlan(selectedPlan);
        setAmount(predefinedPlans[selectedPlan] || '');
    };

    const handleSubscribe = () => {
        if (!mobile || mobile.length !== 10 || isNaN(mobile)) {
            setError('Enter a valid 10-digit mobile number');
            return;
        }
        if (!operator) {
            setError('Please select an operator');
            return;
        }
        if (!amount || isNaN(amount)) {
            setError('Select a valid plan');
            return;
        }
        if (!dueDate) {
            setError('Please select due date');
            return;
        }

        setError('');
        onSubscribe({ mobile, operator, amount: parseFloat(amount), dueDate });
        onClose();
    };

    return (
        <div className="popup-overlay">
            <div className="popup-box">
                <h3>📱 Recharge Subscription</h3>

                <label>Enter Mobile Number</label>
                <input
                    type="text"
                    placeholder="e.g., 9876543210"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    maxLength={10}
                />

                <label>Select Operator</label>
                <select value={operator} onChange={(e) => setOperator(e.target.value)}>
                    <option value="">-- Choose --</option>
                    <option value="Jio">Jio Prepaid</option>
                    <option value="Airtel">Airtel Prepaid</option>
                    <option value="Vi">Vi Prepaid</option>
                    <option value="BSNL">BSNL Prepaid</option>
                    <option value="MTNL">MTNL Prepaid</option>
                </select>

                <label>Select Plan</label>
                <select value={plan} onChange={handlePlanChange}>
                    <option value="">-- Select Plan --</option>
                    {Object.entries(predefinedPlans).map(([label, amt]) => (
                        <option key={label} value={label}>
                            {label}
                        </option>
                    ))}
                </select>

                <label>Due Date</label>
                <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                />

                {error && <p className="error-text">{error}</p>}

                <div className="popup-buttons">
                    <button onClick={handleSubscribe}>Subscribe</button>
                    <button className="cancel-btn" onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    );
}

export default RechargePopup;
