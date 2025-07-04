// File: frontend/src/context/AuthContext.js

import React, { createContext, useState, useEffect } from 'react';

// AuthContext तयार करा
export const AuthContext = createContext(null);

// AuthProvider हा एक कंपोनेंट आहे जो ऍप्लिकेशनच्या भागांना ऑथेंटिकेशन स्टेटस प्रदान करतो.
export const AuthProvider = ({ children }) => {
  // userId, username आणि loading स्थितीसाठी स्टेट्स
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState(null);
  const [loading, setLoading] = useState(true); // ऑथेंटिकेशन डेटा लोड होत आहे की नाही हे दर्शवण्यासाठी

  // ऍप्लिकेशन लोड झाल्यावर लोकल स्टोरेजमधून ऑथेंटिकेशन डेटा लोड करण्यासाठी useEffect
  useEffect(() => {
    const storedUserId = localStorage.getItem('user_id'); // localStorage मधून 'user_id' मिळवा
    const storedUsername = localStorage.getItem('username'); // localStorage मधून 'username' मिळवा

    if (storedUserId && storedUsername) {
      setUserId(storedUserId);
      setUsername(storedUsername);
    }
    setLoading(false); // डेटा लोड झाल्यावर लोडिंग पूर्ण झाले असे सेट करा
  }, []);

  // लॉगिन फंक्शन: युझर आयडी आणि युझरनेम सेट करते आणि लोकल स्टोरेजमध्ये साठवते.
  const login = (id, name) => {
    setUserId(id);
    setUsername(name);
    localStorage.setItem('user_id', id);
    localStorage.setItem('username', name);
    // isLoggedIn यापुढे AuthContext द्वारे व्यवस्थापित केले जाईल, त्यामुळे वेगळे localStorage.setItem('isLoggedIn') ची गरज नाही.
  };

  // लॉगआउट फंक्शन: सर्व ऑथेंटिकेशन स्टेट्स आणि लोकल स्टोरेजमधील डेटा क्लिअर करते.
  const logout = () => {
    setUserId(null);
    setUsername(null);
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
    localStorage.removeItem('isLoggedIn'); // हे देखील काढून टाका, कारण ते आता अनावश्यक आहे
    localStorage.removeItem('sidebarOpen'); // हे देखील काढून टाका
  };

  // AuthContext च्या व्हॅल्यूज
  const authContextValue = {
    userId,
    username,
    login,
    logout,
    isAuthenticated: !!userId, // युझर लॉगिन आहे की नाही हे तपासण्यासाठी (userId अस्तित्वात असल्यास true)
    loading, // loading स्टेट प्रदान करा
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};
