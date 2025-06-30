// src/App.js
import React, { useState, useEffect } from 'react';
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
import ResetPasswordPage from './pages/ResetPasswordPage'; // Import the new ResetPasswordPage
import './App.css'; // Import App.css

function App() {
  // Load the isLoggedIn state from local storage.
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    try {
      const savedState = localStorage.getItem('isLoggedIn');
      return savedState ? JSON.parse(savedState) : false;
    } catch (error) {
      console.error("Error parsing isLoggedIn from localStorage:", error);
      return false;
    }
  });

  const location = useLocation(); // To get the current path
  const navigate = useNavigate(); // Use the useNavigate hook

  // Store in local storage when isLoggedIn state changes
  useEffect(() => {
    try {
      localStorage.setItem('isLoggedIn', JSON.stringify(isLoggedIn));
    } catch (error) {
      console.error("Error saving isLoggedIn to localStorage:", error);
    }
  }, [isLoggedIn]);

  // Function to call when login is successful
  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  // Function to logout
  const handleLogout = async () => {
    setIsLoggedIn(false);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('sidebarOpen');
    localStorage.removeItem('user_id'); // Ensure user_id is also cleared on logout
    localStorage.removeItem('username'); // Ensure username is also cleared on logout
    
    navigate('/login');
  };

  // Logic to determine whether to show the sidebar
  // The sidebar will only be visible if the user is logged in and not on specific public paths.
  const publicPaths = ['/', '/login', '/reset-password']; // Add '/reset-password' to public paths
  const showSidebar = isLoggedIn && !publicPaths.includes(location.pathname);

  return (
    <div className="app-container">
      {showSidebar && <Sidebar onLogout={handleLogout} />}
      
      <div className={showSidebar ? "app-main-content" : "app-main-content-no-sidebar"}>
        <Routes>
          {/* Public Routes - Always accessible */}
          <Route path="/" element={<Login onLogin={handleLogin} />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} /> {/* NEW: Reset Password Page */}

          {/* Protected Routes - Only accessible if isLoggedIn is true */}
          {isLoggedIn ? (
            <>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/schedule-payment" element={<SchedulePayment />} />
              <Route path="/payment-list" element={<PaymentList />} />
              <Route path="/reschedule-update" element={<RescheduleUpdate />} />
              <Route path="/bulk-upload" element={<BulkUpload />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Setting />} />
              {/* Fallback for any other protected route if logged in */}
              <Route path="*" element={<Dashboard />} /> 
            </>
          ) : (
            // If not logged in and trying to access a protected route, redirect to /login
            // This catches all other paths not explicitly defined as public
            <Route path="*" element={<Login onLogin={handleLogin} />} />
          )}
        </Routes>
      </div>
    </div>
  );
}

export default App;
