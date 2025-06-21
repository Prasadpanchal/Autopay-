// src/App.js
import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'; // useLocation and useNavigate are imported
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import SchedulePayment from './pages/SchedulePayment';
import PaymentList from './pages/PaymentList';
import RescheduleUpdate from './pages/RescheduleUpdate';
import BulkUpload from './pages/BulkUpload';
import Reports from './pages/Reports';
import Setting from './pages/Settings';
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
  const handleLogout = async () => { // Made the function async
    setIsLoggedIn(false); // Updates the status of the frontend
    localStorage.removeItem('isLoggedIn'); // Retrieves status from local storage.
    localStorage.removeItem('sidebarOpen'); // Removes the sidebar position.
    
    // For security, you can send a logout request to the backend here.
    // This is important for invalidating the token or destroying the session.
    // E.g. (Adjust according to your backend endpoint and token handling):
    // const accessToken = localStorage.getItem('accessToken'); // Suppose you have stored an access token.
    // if (accessToken) {
    //   try {
    //     await fetch('/api/logout', { // Your backend's logout endpoint
    //       method: 'POST',
    //       headers: {
    //         'Content-Type': 'application/json',
    //         'Authorization': `Bearer ${accessToken}` // Send token
    //       },
    //       // body: JSON.stringify({}) // If the backend needs a request body
    //     });
    //   } catch (error) {
    //     console.error("Backend logout call failed:", error);
    //     // Logout the user even if an error occurs, because he is logged out from the frontend.
    //   }
    // }
    
    navigate('/login'); // Navigate using React Router, without reloading the page
  };

  // Logic to determine whether to show the sidebar
  // The sidebar will only be visible if the user is logged in and not on the '/login' or '/' (root) path.
  const showSidebar = isLoggedIn && (location.pathname !== '/' && location.pathname !== '/login');

  return (
    // The <Router> element must be in src/index.js
    <div className="app-container"> {/* main container */}
      {/* Show Sidebar only if showSidebar is true. */}
      {showSidebar && <Sidebar onLogout={handleLogout} />}
      
      {/* Main content section */}
      <div className={showSidebar ? "app-main-content" : "app-main-content-no-sidebar"}>
        <Routes>
          {/* Login page (always accessible) */}
          <Route path="/" element={<Login onLogin={handleLogin} />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />

          {/* Protected Routes */}
          {isLoggedIn ? (
            <>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/schedule-payment" element={<SchedulePayment />} />
              <Route path="/payment-list" element={<PaymentList />} />
              <Route path="/reschedule-update" element={<RescheduleUpdate />} />
              <Route path="/bulk-upload" element={<BulkUpload />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Setting />} />
            </>
          ) : (
            // If not logged in, redirect to /login if you go to any protected root.
            <Route path="*" element={<Login onLogin={handleLogin} />} />
          )}
        </Routes>
      </div>
    </div>
  );
}

export default App;
