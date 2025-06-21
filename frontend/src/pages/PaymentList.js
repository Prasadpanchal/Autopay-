// File: frontend/src/pages/PaymentList.js
// Ismein payment list fetch karne aur cancel karne ka logic update kiya gaya hai.

import React, { useEffect, useState } from 'react';
import api from '../api';
import './PaymentList.css'; 

const USER_ID = 1; // Demo user ID

function PaymentList() {
  const [payments, setPayments] = useState([]);

  // This function will more reliably convert a date string to a Date object.
  const parseDateString = (dateString) => {
    return new Date(dateString); 
  };

  const fetchPayments = () => {
    api.get(`/payments/${USER_ID}`)
      .then(res => {
        // After retrieving the data, sort in descending order by 'id'
        const sortedPayments = res.data.sort((a, b) => {
          return b.id - a.id; // In descending order by ID (largest ID first)
        });
        setPayments(sortedPayments);
      })
      .catch(err => console.error('Error fetching payments:', err));
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleCancel = (id) => {
    if (window.confirm("Are you sure you want to cancel this payment?")) {
      api.post(`/payment/${id}/cancel`)
        .then(() => {
          alert('Payment cancelled!');
          // Refresh the list.
          fetchPayments();
        })
        .catch(err => {
          console.error('Error cancelling payment:', err);
          alert(err.response?.data?.error || 'Failed to cancel payment');
        });
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Paid': return 'text-success';
      case 'Failed': return 'text-danger';
      case 'Cancelled': return 'text-muted';
      default: return 'text-warning'; // For Pending or other statuses
    }
  }

  // Options for DD-MM-YYYY format
  const dateFormatterOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  };

  return (
    <div id='container' className="container mt-4">
      <h2 className='pay'>Payment List</h2>
      {/* New div that will wrap the table and handle scrolling */}
      <div id='table-container-scroll' className="table-container-scroll">
        <table className="table table-bordered mt-3">
          <thead className="table-light">
            <tr>
              <th>ID</th>
              <th>Payee</th>
              <th>Amount</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Method</th>
              <th>Created at</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(payment => (
              <tr key={payment.id}>
                <td>{payment.id}</td>
                <td>{payment.payee}</td>
                <td>₹{payment.amount.toFixed(2)}</td>
                <td>{parseDateString(payment.due_date).toLocaleDateString('en-GB', dateFormatterOptions)}</td> 
                <td className={`fw-bold ${getStatusClass(payment.status)}`}>{payment.status}</td>
                <td>{payment.method}</td>
                <td>
                  {parseDateString(payment.created_at).toLocaleDateString('en-GB', dateFormatterOptions)}
                  {' '} 
                  {parseDateString(payment.created_at).toLocaleTimeString('en-GB')}
                </td>
                <td>
                  <button id='btn-danger'
                    className="button btn-danger btn-sm"
                    onClick={() => handleCancel(payment.id)}
                    disabled={payment.status !== 'Pending' && payment.status !== 'SCHEDULED'} 
                  >
                    Cancel
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div> {/* .End of table-container-scroll div */}
    </div>
  );
}

export default PaymentList;
