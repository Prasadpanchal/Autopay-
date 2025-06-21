// src/components/Sidebar.js
import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';
import { FaTachometerAlt, FaCalendarAlt, FaListUl, FaRedo, FaCloudUploadAlt, FaChartBar, FaCog, FaSignOutAlt } from 'react-icons/fa';

// onLogout प्रॉप स्वीकार करा
const Sidebar = ({ onLogout }) => { // onLogout प्रॉप इथे स्वीकारला
  return (
    <div className="custom-sidebar">
      <div className="sidebar-logo">AutoPay</div>

      <NavLink to="/dashboard" className="sidebar-link" activeClassName="active" end>
        <FaTachometerAlt className="icon" />
        <span>Dashboard</span>
      </NavLink>
      
      <NavLink to="/schedule-payment" className="sidebar-link" activeClassName="active" end>
        <FaCalendarAlt className="icon" />
        <span>Schedule Payment</span>
      </NavLink>

      <NavLink to="/payment-list" className="sidebar-link" activeClassName="active" end>
        <FaListUl className="icon" />
        <span>Payment List</span>
      </NavLink>

      <NavLink to="/reschedule-update" className="sidebar-link" activeClassName="active" end>
        <FaRedo className="icon" />
        <span>Reschedule/Update</span>
      </NavLink>

      <NavLink to="/bulk-upload" className="sidebar-link" activeClassName="active" end>
        <FaCloudUploadAlt className="icon" />
        <span>Bulk Upload</span>
      </NavLink>

      <NavLink to="/reports" className="sidebar-link" activeClassName="active" end>
        <FaChartBar className="icon" />
        <span>Reports</span>
      </NavLink>

      {/* <NavLink to="/settings" className="sidebar-link" activeClassName="active" end>
        <FaCog className="icon" />
        <span>Settings</span>
      </NavLink> */}

      {/* Logout बटण - NavLink ऐवजी साधा बटण वापरा आणि onClick वर onLogout फंक्शन कॉल करा */}
      <button onClick={onLogout} className="sidebar-link logout"> {/* onClick वर onLogout फंक्शन कॉल करा */}
        <FaSignOutAlt className="icon" />
        <span>Logout</span>
      </button>
    </div>
  );
};

export default Sidebar;
