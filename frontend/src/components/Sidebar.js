// File: src/components/Sidebar.js
import { MdOutlineSubscriptions } from "react-icons/md";
import React, { useState, useEffect } from 'react'; // useState and useEffect for sidebar state
import { NavLink, useLocation } from 'react-router-dom';
import './Sidebar.css';
import { FaTachometerAlt, FaCalendarAlt, FaListUl, FaRedo, FaCloudUploadAlt, FaChartBar, FaCog, FaSignOutAlt, FaUser, FaMoneyBillWave } from 'react-icons/fa'; // Added FaUser for Profile, FaMoneyBillWave for Deposit Funds

const Sidebar = ({ onLogout }) => {
  // State to manage sidebar open/closed status, loaded from local storage
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      const savedState = localStorage.getItem('sidebarOpen');
      return savedState ? JSON.parse(savedState) : true; // Default to open if not found
    } catch (error) {
      console.error("Error parsing sidebarOpen from localStorage:", error);
      return true; // Fallback to true on error
    }
  });

  const location = useLocation(); // Get current location to highlight active link

  // Save sidebar state to local storage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('sidebarOpen', JSON.stringify(sidebarOpen));
    } catch (error) {
      console.error("Error saving sidebarOpen to localStorage:", error);
    }
  }, [sidebarOpen]);

  // Function to toggle sidebar open/closed
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        {sidebarOpen && <h2>AutoPay</h2>} {/* Show title only when sidebar is open */}
        <button onClick={toggleSidebar} className="toggle-button">
          {sidebarOpen ? '❮' : '❯'} {/* Change icon based on sidebar state */}
        </button>
      </div>
      <nav className="sidebar-nav">
        <ul>
          <li>
            <NavLink to="/dashboard" className={location.pathname === '/dashboard' ? 'active' : ''}>
              <FaTachometerAlt className="icon" />
              {sidebarOpen && <span>Dashboard</span>}
            </NavLink>
          </li>
          <li>
            <NavLink to="/profile" className={location.pathname === '/profile' ? 'active' : ''}>
              <FaUser className="icon" /> {/* Profile Icon */}
              {sidebarOpen && <span>Profile</span>}
            </NavLink>
          </li>
          {/* <li>
            <NavLink to="/deposit-funds" className={location.pathname === '/deposit-funds' ? 'active' : ''}>
              <FaMoneyBillWave className="icon" /> 
              {sidebarOpen && <span>Deposit Funds</span>}
            </NavLink>
          </li> */}
          <li>
            <NavLink to="/schedule-payment" className={location.pathname === '/schedule-payment' ? 'active' : ''}>
              <FaCalendarAlt className="icon" />
              {sidebarOpen && <span>Schedule Payment</span>}
            </NavLink>
          </li>
          <li>
            <NavLink to="/payment-list" className={location.pathname === '/payment-list' ? 'active' : ''}>
              <FaListUl className="icon" />
              {sidebarOpen && <span>Payment List</span>}
            </NavLink>
          </li>
          <li>
            <NavLink to="/reschedule-update" className={location.pathname === '/reschedule-update' ? 'active' : ''}>
              <FaRedo className="icon" />
              {sidebarOpen && <span>Reschedule/Update</span>}
            </NavLink>
          </li>
          <li>
            <NavLink to="/bulk-upload" className={location.pathname === '/bulk-upload' ? 'active' : ''}>
              <FaCloudUploadAlt className="icon" />
              {sidebarOpen && <span>Bulk Upload</span>}
            </NavLink>
          </li>
          <li>
            <NavLink to="/reports" className={location.pathname === '/reports' ? 'active' : ''}>
              <FaChartBar className="icon" />
              {sidebarOpen && <span>Reports</span>}
            </NavLink>
          </li>
          <li>
            <NavLink to="/subscription" className={location.pathname === '/subscription' ? 'active' : ''}>
              <MdOutlineSubscriptions className="icon" />
              {sidebarOpen && <span>Subscription</span>}
            </NavLink>
          </li>
        </ul>
      </nav>
      <div className="sidebar-footer">
        <button onClick={onLogout} className="logout-button">
          <FaSignOutAlt className="icon" />
          {sidebarOpen && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
