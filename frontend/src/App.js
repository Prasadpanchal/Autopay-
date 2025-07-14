// File: frontend/src/App.js
import React, { useContext } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import SchedulePayment from './pages/SchedulePayment';
import PaymentList from './pages/PaymentList';
import RescheduleUpdate from './pages/RescheduleUpdate';
import BulkUpload from './pages/BulkUpload';
import Reports from './pages/Reports';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DepositFunds from './pages/DepositFunds';
import ProfilePage from './pages/ProfilePage';
import AutopaySubscription from './pages/AutopaySubscription';
import './App.css';
import { AuthContext } from './context/AuthContext';

function App() {
  const { isAuthenticated, loading, logout, login } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogin = (userId, username) => {
    login(userId, username);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <p className="text-xl text-gray-700">Loading application...</p>
      </div>
    );
  }

  const publicPaths = ['/', '/login', '/reset-password'];
  const showSidebar = isAuthenticated && !publicPaths.includes(location.pathname);

  return (
    <div className="app-container">
      {showSidebar && <Sidebar onLogout={handleLogout} />}
      <div className={showSidebar ? "app-main-content" : "app-main-content-no-sidebar"}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Login onLogin={handleLogin} />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Private Routes */}
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
              <Route path="/autopay" element={<AutopaySubscription />} />
              <Route path="*" element={<Dashboard />} />
            </>
          ) : (
            <Route path="*" element={<Login onLogin={handleLogin} />} />
          )}
        </Routes>
      </div>
    </div>
  );
}

export default App;
