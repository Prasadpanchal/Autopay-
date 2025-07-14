// File: src/components/OTTPopup.js
import React, { useState } from 'react';
import './RechargePopup.css'; // ✅ Reuse same styles for consistency

function OTTPopup({ onClose, onSubscribe }) {
    const [platform, setPlatform] = useState('');
    const [plan, setPlan] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [error, setError] = useState('');

    const ottPlans = {
        Netflix: [
            { name: 'Basic Plan', amount: 199 },
            { name: 'Standard Plan', amount: 499 },
            { name: 'Premium Plan', amount: 799 },
        ],
        Prime: [
            { name: 'Monthly Plan', amount: 179 },
            { name: 'Annual Plan', amount: 1499 },
        ],
        Hotstar: [
            { name: 'Super', amount: 299 },
            { name: 'Premium', amount: 899 },
        ]
    };

    const handleSubscribe = () => {
        if (!platform || !plan || !dueDate) {
            setError('Please fill all fields');
            return;
        }
        const selected = ottPlans[platform].find(p => p.name === plan);
        onSubscribe({ platform, planName: plan, amount: selected.amount, dueDate });
        onClose();
    };

    return (
        <div className="popup-overlay">
            <div className="popup-box">
                <h3>🌐 OTT Subscription</h3>

                <label>Select Platform</label>
                <select value={platform} onChange={(e) => {
                    setPlatform(e.target.value);
                    setPlan('');
                }}>
                    <option value="">-- Choose --</option>
                    {Object.keys(ottPlans).map(p => (
                        <option key={p} value={p}>{p}</option>
                    ))}
                </select>

                {platform && (
                    <>
                        <label>Select Plan</label>
                        <select value={plan} onChange={(e) => setPlan(e.target.value)}>
                            <option value="">-- Choose Plan --</option>
                            {ottPlans[platform].map((p, idx) => (
                                <option key={idx} value={p.name}>{p.name} - ₹{p.amount}</option>
                            ))}
                        </select>

                        <label>Due Date</label>
                        <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                        />
                    </>
                )}

                {error && <p className="error-text">{error}</p>}

                <div className="popup-buttons">
                    <button onClick={handleSubscribe}>Subscribe</button>
                    <button className="cancel-btn" onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    );
}

export default OTTPopup;
