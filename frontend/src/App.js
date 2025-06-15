// src/App.js
import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'; // useLocation आणि useNavigate इम्पोर्ट केले आहेत
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import SchedulePayment from './pages/SchedulePayment';
import PaymentList from './pages/PaymentList';
import RescheduleUpdate from './pages/RescheduleUpdate';
import BulkUpload from './pages/BulkUpload';
import Reports from './pages/Reports';
import Setting from './pages/Settings';
import './App.css'; // App.css इम्पोर्ट करा

function App() {
  // isLoggedIn स्थिती लोकल स्टोरेजमधून लोड करा.
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    try {
      const savedState = localStorage.getItem('isLoggedIn');
      return savedState ? JSON.parse(savedState) : false;
    } catch (error) {
      console.error("Error parsing isLoggedIn from localStorage:", error);
      return false;
    }
  });

  const location = useLocation(); // वर्तमान मार्ग (current path) मिळवण्यासाठी
  const navigate = useNavigate(); // useNavigate हुक वापरा

  // isLoggedIn स्थिती बदलल्यावर लोकल स्टोरेजमध्ये साठवा
  useEffect(() => {
    try {
      localStorage.setItem('isLoggedIn', JSON.stringify(isLoggedIn));
    } catch (error) {
      console.error("Error saving isLoggedIn to localStorage:", error);
    }
  }, [isLoggedIn]);

  // लॉगइन यशस्वी झाल्यावर कॉल करण्यासाठी फंक्शन
  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  // लॉगआउट करण्यासाठी फंक्शन
  const handleLogout = async () => { // फंक्शनला async बनवले
    setIsLoggedIn(false); // फ्रंटएंडची स्थिती अपडेट करते
    localStorage.removeItem('isLoggedIn'); // लोकल स्टोरेजमधून स्थिती काढते
    localStorage.removeItem('sidebarOpen'); // साइडबारची स्थिती काढते
    
    // सुरक्षिततेसाठी, तुम्ही बॅकएंडला लॉगआउट करण्याची विनंती येथे पाठवू शकता.
    // हे टोकन इनव्हॅलिड करण्यासाठी किंवा सेशन नष्ट करण्यासाठी महत्त्वाचे आहे.
    // उदा. (तुमच्या बॅकएंड एंडपॉइंट आणि टोकन हँडलिंगनुसार जुळवा):
    // const accessToken = localStorage.getItem('accessToken'); // समजा तुम्ही एक्सेस टोकन साठवले आहे
    // if (accessToken) {
    //   try {
    //     await fetch('/api/logout', { // तुमच्या बॅकएंडचा लॉगआउट एंडपॉइंट
    //       method: 'POST',
    //       headers: {
    //         'Content-Type': 'application/json',
    //         'Authorization': `Bearer ${accessToken}` // टोकन पाठवा
    //       },
    //       // body: JSON.stringify({}) // जर बॅकएंडला रिक्वेस्ट बॉडीची गरज असेल
    //     });
    //   } catch (error) {
    //     console.error("Backend logout call failed:", error);
    //     // एरर आली तरीही युझरला लॉगआउट करा, कारण फ्रंटएंडवरून तो लॉगआउट झाला आहे
    //   }
    // }
    
    navigate('/login'); // React Router चा वापर करून नेव्हिगेट करा, पेज रीलोड न करता
  };

  // साइडबार दाखवायचा आहे की नाही हे ठरवण्यासाठी लॉजिक
  // साइडबार फक्त तेव्हाच दिसेल जेव्हा युझर लॉगइन केलेला असेल आणि '/login' किंवा '/' (रूट) मार्गावर नसेल.
  const showSidebar = isLoggedIn && (location.pathname !== '/' && location.pathname !== '/login');

  return (
    // <Router> घटक src/index.js मध्ये असणे आवश्यक आहे
    <div className="app-container"> {/* मुख्य कंटेनर */}
      {/* Sidebar फक्त showSidebar सत्य असल्यास दाखवा */}
      {showSidebar && <Sidebar onLogout={handleLogout} />}
      
      {/* मुख्य कंटेंट विभाग */}
      <div className={showSidebar ? "app-main-content" : "app-main-content-no-sidebar"}>
        <Routes>
          {/* लॉगिन पेज (नेहमी ऍक्सेसिबल) */}
          <Route path="/" element={<Login onLogin={handleLogin} />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />

          {/* संरक्षित रूट्स (Protected Routes) */}
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
            // जर लॉग इन नसेल तर कोणत्याही संरक्षित रूटवर गेल्यास /login वर पुनर्निर्देशित करा
            <Route path="*" element={<Login onLogin={handleLogin} />} />
          )}
        </Routes>
      </div>
    </div>
  );
}

export default App;
