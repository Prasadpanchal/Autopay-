// src/pages/Reports.js
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable'; // हे jspdf ऑब्जेक्टमध्ये autoTable फंक्शन जोडते
import './Reports.css';

const Reports = () => {
  const [allPayments, setAllPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to fetch payment data
  useEffect(() => {
    const fetchPayments = async () => {
      try {
        // Change your backend URL and user ID here
        const response = await fetch('http://127.0.0.1:5000/api/all-payments/1'); // User ID 1 is assumed here
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Convert date strings to Date objects for easier sorting
        const formattedData = data.map(payment => ({
          ...payment,
          due_date: new Date(payment.due_date), // Convert to Date object
          created_at: new Date(payment.created_at)
        }));
        setAllPayments(formattedData);
      } catch (e) {
        setError("Error fetching data: " + e.message);
        console.error("Error fetching data:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, []); // useEffect runs only once

  // Export to Excel (CSV)
  const exportToExcel = () => {
    if (allPayments.length === 0) {
      alert("No data to export.");
      return;
    }
    // Convert data to suitable format for CSV
    const dataToExport = allPayments.map(payment => ({
      ID: payment.id,
      Payee: payment.payee,
      Amount: payment.amount,
      'Due Date': payment.due_date.toISOString().split('T')[0], // McClellan-MM-DD format
      Method: payment.method,
      Status: payment.status,
      'Created At': payment.created_at.toLocaleString() // Local date and time format
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PaymentHistory');
    XLSX.writeFile(workbook, 'Payment_Report.csv'); // Can use .csv instead of .xlsx
  };

  // Export to PDF
  const exportToPDF = () => {
    if (allPayments.length === 0) {
      alert("No data to export.");
      return;
    }

    const doc = new jsPDF();
    const headers = [['ID', 'Payee', 'Amount', 'Due Date', 'Method', 'Status', 'Created At']];

    // Group payments by status
    const paymentsByStatus = allPayments.reduce((acc, payment) => {
      const status = payment.status;
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(payment);
      return acc;
    }, {});

    let yOffset = 16; // Initial y position
    const margin = 14;

    doc.text('Payment Report', margin, yOffset);
    yOffset += 10;

    for (const status of ['SCHEDULED', 'PAID', 'FAILED', 'PENDING', 'CANCELLED']) {
      const paymentsForStatus = paymentsByStatus[status] || [];

      if (paymentsForStatus.length > 0) {
        // Check if a new page is needed
        if (yOffset > 270) { // 270mm is roughly the end of an A4 page
            doc.addPage();
            yOffset = margin; // Set margin on new page
        }

        doc.text(`${status} Payments`, margin, yOffset);
        yOffset += 5;

        const body = paymentsForStatus.map(row => [
          row.id,
          row.payee,
          row.amount.toFixed(2), // Limit to 2 decimal places
          row.due_date.toISOString().split('T')[0],
          row.method,
          row.status,
          row.created_at.toLocaleString()
        ]);

        doc.autoTable({ // This line is provided by jspdf-autotable
          startY: yOffset,
          head: headers,
          body: body,
          theme: 'grid', // Use grid theme for table appearance
          margin: { left: margin, right: margin },
          didDrawPage: function (data) {
            // Add footer on each page
            let str = "Page " + doc.internal.getNumberOfPages();
            doc.setFontSize(10);
            doc.text(str, data.settings.margin.left, doc.internal.pageSize.height - 10);
          }
        });
        yOffset = doc.autoTable.previous.finalY + 10; // Update y position for the next table
      }
    }

    doc.save('Payment_Report.pdf');
  };

  if (loading) {
    return <div className="reports-container p-6 bg-white rounded-lg shadow-md">Loading payments...</div>;
  }

  if (error) {
    return <div className="reports-container p-6 bg-white rounded-lg shadow-md text-red-600">Error: {error}</div>;
  }

  return (
    <div className="reports-container p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">Reports</h2>
      <p className="text-gray-600 mb-4">Download your payment history in Excel (CSV) or PDF format.</p>
      <button className='report-btn bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md mr-4 transition duration-300' onClick={exportToExcel}>
        <span role="img" aria-label="download excel">⬇</span> Export to Excel
      </button>
      
      {/* <button className='report-btn bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md transition duration-300' onClick={exportToPDF}>
        <span role="img" aria-label="download pdf">⬇</span> Export to PDF
      </button> */}

      {/* Display data in a table (optional) */}
      <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">All Payments (Overview)</h3>
      {allPayments.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200">
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">ID</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Payee</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Amount</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Due Date</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Method</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Status</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Created At</th>
              </tr>
            </thead>
            <tbody>
              {allPayments.map(payment => (
                <tr key={payment.id} className="border-b border-gray-200 last:border-b-0">
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-800">{payment.id}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-800">{payment.payee}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-800">₹{payment.amount.toFixed(2)}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-800">{payment.due_date.toISOString().split('T')[0]}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-800">{payment.method}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-800">{payment.status}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-800">{payment.created_at.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-600 mt-4">No payment records found.</p>
      )}
    </div>
  );
};

export default Reports;

