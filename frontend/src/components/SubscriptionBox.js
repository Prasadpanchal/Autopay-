// File: src/components/SubscriptionBox.js
import React, { useState, useEffect } from 'react';
import './SubscriptionBox.css';
import RechargePopup from './RechargePopup';
import OTTPopup from './OTTPopup';
import api from '../api';

function SubscriptionBox({ userEmail }) {
    const [subscriptionType, setSubscriptionType] = useState('');
    const [showRechargePopup, setShowRechargePopup] = useState(false);
    const [showOTTPopup, setShowOTTPopup] = useState(false);
    const [subscriptions, setSubscriptions] = useState([]);
    const [message, setMessage] = useState('');
    const [isError, setError] = useState(false);

    const subscriptionPlans = {
        Netflix: 499,
        Swiggy: 199,
        Spotify: 129,
        Zepto: 150,
    };

    useEffect(() => {
        const localSubs = JSON.parse(localStorage.getItem('subscriptions') || '[]');
        setSubscriptions(localSubs);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            const today = new Date().toISOString().split('T')[0];
            const updated = subscriptions.map(sub => {
                if (sub.next_due === today && sub.status === 'active') {
                    const success = Math.random() > 0.3;
                    return {
                        ...sub,
                        status: success ? 'active' : 'failed',
                        next_due: success
                            ? new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0]
                            : sub.next_due,
                    };
                }
                return sub;
            });
            localStorage.setItem('subscriptions', JSON.stringify(updated));
            setSubscriptions(updated);
        }, 5000);
        return () => clearInterval(interval);
    }, [subscriptions]);

    const handleRechargeData = async ({ mobile, operator, amount, dueDate }) => {
        try {
            await api.post('/schedule-payment', {
                payee: `${operator} - ${mobile}`,
                amount,
                due_date: dueDate,
                method: 'Simulated Subscription',
            });
            setMessage('Recharge subscription scheduled ✅');
            setError(false);
        } catch (err) {
            console.error(err);
            setMessage('Failed to schedule recharge');
            setError(true);
        }
    };

    const handleOTTData = async ({ platform, planName, amount, dueDate }) => {
        try {
            await api.post('/schedule-payment', {
                payee: `${platform} - ${planName}`,
                amount,
                due_date: dueDate,
                method: 'Simulated Subscription',
            });
            setMessage(`${platform} subscription added ✅`);
            setError(false);
        } catch (err) {
            console.error(err);
            setMessage('Failed to schedule OTT subscription');
            setError(true);
        }
    };

    const handleSubscribeClick = () => {
        if (subscriptionType === 'Recharge') {
            setShowRechargePopup(true);
        } else if (subscriptionType === 'OTT') {
            setShowOTTPopup(true);
        } else {
            const planAmount = subscriptionPlans[subscriptionType];
            if (!planAmount) return;

            const nextDate = new Date();
            nextDate.setDate(nextDate.getDate() + 30);

            const newSub = {
                id: Date.now(),
                plan: subscriptionType,
                amount: planAmount,
                status: 'active',
                next_due: nextDate.toISOString().split('T')[0],
            };

            const updated = [...subscriptions, newSub];
            localStorage.setItem('subscriptions', JSON.stringify(updated));
            setSubscriptions(updated);
            setMessage(`${subscriptionType} subscribed ✅`);
        }
    };

    return (
        <div className="subscription-box">
            <h3>📄 Razorpay Subscriptions</h3>
            <label>Select Subscription Type</label>
            <select value={subscriptionType} onChange={(e) => setSubscriptionType(e.target.value)}>
                <option value="">Choose Type</option>
                <option value="Recharge">Recharge</option>
                <option value="OTT">OTT</option>
                {Object.keys(subscriptionPlans).map((plan) => (
                    <option key={plan} value={plan}>{plan}</option>
                ))}
            </select>
            <button onClick={handleSubscribeClick}>Subscribe & Pay</button>

            {message && <p className={isError ? 'error-msg' : 'success-msg'}>{message}</p>}

            <hr />
            <h4>Active Subscriptions</h4>
            {subscriptions.length === 0 ? (
                <p>No subscriptions found.</p>
            ) : (
                <ul>
                    {subscriptions.map((sub) => (
                        <li key={sub.id}>
                            {sub.plan} - ₹{sub.amount} → Due on <b>{sub.next_due}</b> [{sub.status}]
                        </li>
                    ))}
                </ul>
            )}

            {showRechargePopup && (
                <RechargePopup
                    onClose={() => setShowRechargePopup(false)}
                    onSubscribe={handleRechargeData}
                />
            )}

            {showOTTPopup && (
                <OTTPopup
                    onClose={() => setShowOTTPopup(false)}
                    onSubscribe={handleOTTData}
                />
            )}
        </div>
    );
}

export default SubscriptionBox;
