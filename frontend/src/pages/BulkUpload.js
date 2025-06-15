import React, { useState } from 'react';
import { FiUpload } from "react-icons/fi";
import * as XLSX from 'xlsx'; // For file preview
import api from '../api'; // To call the backend API
import { useNavigate } from 'react-router-dom'; // To redirect after upload
import './BulkUpload.css'; // for Style

const BulkUpload = () => {
  const [selectedFile, setSelectedFile] = useState(null); // The selected file object
  const [filePreviewData, setFilePreviewData] = useState([]); // Preview of file data
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file); // Save file in object state
    setMessage('');
    setError('');
    setFilePreviewData([]); // clear the old preview

    const reader = new FileReader();
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    // Read the file for preview.
    if (isExcel || file.name.endsWith('.csv')) {
      reader.onload = (event) => {
        const workbook = XLSX.read(event.target.result, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const parsedData = XLSX.utils.sheet_to_json(sheet);
        setFilePreviewData(parsedData); // set preview data
      };
      reader.readAsBinaryString(file);
    } else {
      setMessage('Please upload a .csv or .xlsx file for preview.');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload.');
      return;
    }

    setLoading(true);
    setMessage('Uploading file to server...');
    setError('');

    const formData = new FormData();
    formData.append('file', selectedFile); // Send the actual file to the backend

    try {
      const res = await api.post('/bulk-upload-payments', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setMessage(res.data.message || 'File uploaded successfully!');
      alert(res.data.message || 'Bulk upload complete!');
      
      // Redirect to payment list after upload is successful
      navigate('/payment-list');
    } catch (err) {
      console.error('Error during bulk upload:', err.response || err);
      const errorMessage = err.response && err.response.data && err.response.data.message
                           ? `Upload Failed: ${err.response.data.message}`
                           : 'An unexpected error occurred during file upload.';
      setError(errorMessage);
      setMessage('');
    } finally {
      setLoading(false);
      setSelectedFile(null); // Deselect the file
      setFilePreviewData([]); // clear preview data
    }
  };

  return (
    <div className="bulk-upload-container">
      <h2>Bulk Upload Payment Schedule</h2>
      <p>Upload a .csv or .xlsx file with payment details. <br/>
         Required columns: <code>user_id</code>, <code>amount</code>, <code>due_date (YYYY-MM-DD)</code>, <code>payee</code>, <code>method</code>
      </p>

      <input 
        type="file" 
        accept=".csv,.xlsx,.xls" 
        onChange={handleFileChange} 
        className="form-control mb-3"
      />
      
      {selectedFile && (
        <p className="text-muted">Selected file: <strong>{selectedFile.name}</strong></p>
      )}

      {loading && <div className="alert alert-info">Uploading... Please wait.</div>}
      {message && !loading && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <button 
        className="btn btn-primary mt-3" 
        onClick={handleUpload} 
        disabled={!selectedFile || loading}
      ><FiUpload/>
        {loading ? 'Uploading...' :' Upload Payments to Server'}
      </button>

      {filePreviewData.length > 0 && (
        <div className="file-preview mt-4">
          <h3>File Preview ({filePreviewData.length} rows)</h3>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}> {/* Scrollable preview */}
            <table className="table table-bordered table-striped">
              <thead>
                <tr>
                  {Object.keys(filePreviewData[0]).map((key, idx) => (
                    <th key={idx}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filePreviewData.map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((val, j) => (
                      <td key={j}>{String(val)}</td> // Make sure all values ​​are displayed as strings.
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkUpload;
