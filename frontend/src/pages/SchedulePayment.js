// File: frontend/src/pages/SchedulePayment.js
import React, { useState } from 'react';
import '../pages/SchedulePayment.css'; // Make sure this path is correct
import api from '../api';

function SchedulePayment() {
  const [formData, setFormData] = useState({
    payee: '',
    amount: '',
    due_date: '',
    method: ''
  });

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log("Sending data to backend:", formData);
      const res = await api.post('/schedule-payment', formData);
      alert(res.data.message);
      setFormData({ payee: '', amount: '', due_date: '', method: '' });
    } catch (err) {
      console.error("Error scheduling payment:", err.response?.data || err);
      alert(`Failed to schedule payment: ${err.response?.data?.error || err.message}`);
    }
  };

  return (
    <div className="schedule-container">
      <h2>Schedule a Payment</h2>
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
          <option value="">Select Method</option>
          <option value="Bank Transfer">Bank Transfer</option>
          <option value="Credit Card">Credit Card</option>
          <option value="UPI">UPI</option>
          <option value="Cash">Cash</option>
        </select>

        <button id='submit' type="submit">Schedule Payment</button>
      </form>
    </div>
  );
}

export default SchedulePayment;
