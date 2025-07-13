import React from 'react';
import axios from 'axios';

const AutopaySubscription = () => {
    const handleAutopaySubscribe = async () => {
        const email = "gauravsonar260@gmail.com"; // 🔁 यहाँ actual logged-in user का email डालना है
        const planId = "plan_QpS8eEnuk6vLFe";     // 🔁 Replace this with your real Razorpay plan_id

        try {
            const res = await axios.post('/api/create-subscription', {
                email,
                plan_id: planId
            });

            const sub = res.data;

            const options = {
                key: "rzp_test_45V78TnJ9P2Ysm", // 🔁 अपनी Razorpay test key डालो
                subscription_id: sub.id,
                name: "AutoPay Autopay",
                description: "Monthly Auto Recharge",
                handler: function (response) {
                    alert("✅ Subscription Started: " + response.razorpay_subscription_id);
                },
                prefill: {
                    name: "Test User",
                    email: email,
                    contact: "7249748327"
                },
                theme: {
                    color: "#3399cc"
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (err) {
            console.error("❌ Razorpay subscription error:", err);
            alert("Subscription failed. Please try again.");
        }
    };

    return (
        <div style={{ padding: '30px' }}>
            <h2>Start Razorpay Autopay Subscription</h2>
            <p>Click below to authorize monthly auto recharge via UPI</p>
            <button onClick={handleAutopaySubscribe} style={{ padding: '10px 20px', fontSize: '16px' }}>
                Start Autopay
            </button>
        </div>
    );
};

export default AutopaySubscription;
