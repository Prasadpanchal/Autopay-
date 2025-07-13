// File: frontend/src/App.js
import React, { useState, useEffect, useContext } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import SchedulePayment from './pages/SchedulePayment';
import PaymentList from './pages/PaymentList';
import RescheduleUpdate from './pages/RescheduleUpdate';
import BulkUpload from './pages/BulkUpload';
import Reports from './pages/Reports';
import Setting from './pages/Settings';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DepositFunds from './pages/DepositFunds';
import ProfilePage from './pages/ProfilePage';
import './App.css';
import { AuthContext } from './context/AuthContext'; // AuthContext इम्पोर्ट करा
import AutopaySubscription from './pages/AutopaySubscription';
<Route path="/autopay" element={<AutopaySubscription />} />


function App() {
  // AuthContext मधून isAuthenticated, loading, logout, आणि login फंक्शन्स वापरा
  const { isAuthenticated, loading, logout, login } = useContext(AuthContext);

  const location = useLocation();
  const navigate = useNavigate();

  // handleLogin फंक्शन आता AuthContext च्या login फंक्शनला कॉल करेल
  const handleLogin = (userId, username) => {
    login(userId, username); // AuthContext मधील login फंक्शन कॉल करा
    // लॉगिन झाल्यावर Dashboard वर नेव्हिगेट करणे Login कंपोनेंटमध्येच केले पाहिजे, App.js मध्ये नाही.
  };

  // handleLogout फंक्शन AuthContext च्या logout फंक्शनला कॉल करेल
  const handleLogout = () => {
    logout(); // AuthContext मधील logout फंक्शन कॉल करा
    navigate('/login');
  };

  // AuthContext च्या loading स्टेटवर आधारित लोडिंग स्क्रीन दाखवा
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <p className="text-xl text-gray-700">Loading application...</p>
      </div>
    );
  }

  // Logic to determine whether to show the sidebar
  const publicPaths = ['/', '/login', '/reset-password'];
  const showSidebar = isAuthenticated && !publicPaths.includes(location.pathname);

  return (
    <div className="app-container">
      {showSidebar && <Sidebar onLogout={handleLogout} />}

      <div className={showSidebar ? "app-main-content" : "app-main-content-no-sidebar"}>
        <Routes>
          {/* Public Routes - Always accessible */}
          {/* Login कंपोनेंटला onLogin प्रॉप पास करा, जे AuthContext च्या login फंक्शनला कॉल करेल */}
          <Route path="/" element={<Login onLogin={handleLogin} />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected Routes - Only accessible if isAuthenticated is true */}
          {isAuthenticated ? (
            <>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/deposit-funds" element={<DepositFunds />} />
              <Route path="/schedule-payment" element={<SchedulePayment />} />
              <Route path="/payment-list" element={<PaymentList />} />
              <Route path="/reschedule-update" element={<RescheduleUpdate />} />
              <Route path="/bulk-upload" element={<BulkUpload />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Setting />} />
              <Route path="*" element={<Dashboard />} />
            </>
          ) : (
            // If not authenticated and trying to access a protected route, redirect to /login
            <Route path="*" element={<Login onLogin={handleLogin} />} />
          )}
        </Routes>
      </div>
    </div>
  );
}

export default App;
