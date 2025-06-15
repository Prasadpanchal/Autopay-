// File: frontend/src/pages/PaymentList.js
// Ismein payment list fetch karne aur cancel karne ka logic update kiya gaya hai.

import React, { useEffect, useState } from 'react';
import api from '../api';

const USER_ID = 1; // Demo user ID

function PaymentList() {
  const [payments, setPayments] = useState([]);

  // ही फंक्शन तारीख स्ट्रिंगला Date ऑब्जेक्टमध्ये अधिक विश्वासार्हपणे रूपांतरित करेल.
  // (ही parseDateString फंक्शनची गरज 'Created at' किंवा 'Due Date' नुसार सॉर्ट करत असाल तरच आहे.
  // ID नुसार सॉर्ट करताना याची थेट गरज नाही, परंतु डिस्प्लेसाठी हे उपयुक्त आहे.)
  const parseDateString = (dateString) => {
    return new Date(dateString); 
  };

  const fetchPayments = () => {
    api.get(`/payments/${USER_ID}`)
      .then(res => {
        // डेटा मिळवल्यानंतर, 'id' नुसार उतरत्या क्रमाने सॉर्ट करा
        const sortedPayments = res.data.sort((a, b) => {
          return b.id - a.id; // ID नुसार उतरत्या क्रमाने (सर्वात मोठा ID प्रथम)
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
          // लिस्टला रिफ्रेश करा
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
      default: return 'text-warning'; // Pending किंवा इतर स्थितींसाठी
    }
  }

  return (
    <div className="container mt-4">
      <h2 className='pay'>Payment List</h2>
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
              <td>{parseDateString(payment.due_date).toLocaleDateString()}</td> {/* तारीख वाचनीय स्वरूपात दाखवा */}
              <td className={`fw-bold ${getStatusClass(payment.status)}`}>{payment.status}</td>
              <td>{payment.method}</td>
              <td>{parseDateString(payment.created_at).toLocaleString()}</td> {/* तारीख आणि वेळ वाचनीय स्वरूपात दाखवा */}
              <td>
                <button
                  className="button btn-danger btn-sm"
                  onClick={() => handleCancel(payment.id)}
                  disabled={payment.status !== 'Pending'} // 'Pending' नसताना बटण disabled होईल
                >
                  Cancel
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default PaymentList;
