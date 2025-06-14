import React from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import './Reports.css';

const Reports = () => {
  const exportToExcel = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/export-excel');
      if (!response.ok) throw new Error('Failed to fetch Excel file');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Payment_Report.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting Excel:', error);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('Payment Report', 14, 16);
    doc.autoTable({
      startY: 20,
      head: [['ID', 'Name', 'Date', 'Amount', 'Status']],
      body: [
        ['1', 'John Doe', '2025-05-01', 2000, 'Completed'],
        ['2', 'Jane Smith', '2025-05-05', 3000, 'Failed'],
        ['3', 'Alice', '2025-05-07', 1500, 'Scheduled'],
      ]
    });
    doc.save('Payment_Report.pdf');
  };

  return (
    <div className="reports-container" style={{ padding: '20px' }}>
      <h2>Reports</h2>
      <p>Download your payment history in Excel or PDF format.</p>
      <button className='report-btn' onClick={exportToExcel} style={{ marginRight: '10px' }}>
        ⬇ Export to Excel
      </button>
      <button className='report-btn' onClick={exportToPDF}>
        ⬇ Export to PDF
      </button>
    </div>
  );
};

export default Reports;
