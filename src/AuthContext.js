import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user')) || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalError, setModalError] = useState({ show: false, title: '', message: '' });
  const [warning, setWarning] = useState(null); // <-- NEW
  const navigate = useNavigate();

  const parseMauzaList = (mauzaList) => {
    if (typeof mauzaList === 'string') {
      return mauzaList.split(',').map((m) => m.trim());
    }
    return mauzaList || [];
  };

  // Helper for subscription warning
  const checkSubscriptionWarning = (userData) => {
    if (
      userData &&
      userData.daysRemaining !== undefined &&
      userData.daysRemaining <= 5 &&
      userData.daysRemaining > 0
    ) {
      setWarning({
        title: 'Subscription Expiration Warning',
        userName: userData.userName,
        startDate: new Date(userData.startDate).toLocaleDateString(),
        endDate: new Date(userData.endDate).toLocaleDateString(),
        daysRemaining: userData.daysRemaining,
        message: `Dear ${userData.userName}, your subscription will expire in ${userData.daysRemaining} day(s). Please contact support (0304-8840264) for renewal.`,
      });
    } else {
      setWarning(null);
    }
  };

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/profile`, {
        withCredentials: true,
      });
      const userData = response.data;
      userData.mauzaList = parseMauzaList(userData.mauzaList);

      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      checkSubscriptionWarning(userData); // <-- Check after fetch
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      setUser(null);
      localStorage.removeItem('user');
      setWarning(null); // Remove any warning if fetch fails
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch user profile when the app loads if user data exists in localStorage
    if (localStorage.getItem('user')) {
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    try {
      document.cookie = "authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      setLoading(true);

      await axios.post(`${process.env.REACT_APP_API_URL}/login`, credentials, {
        withCredentials: true,
      });

      await fetchUserProfile(); // <-- This sets warning if needed
      navigate('/');
    } catch (error) {
      setLoading(false);

      if (error.response?.status === 401) {
        setModalError({
          show: true,
          title: 'Invalid Credentials',
          message: 'User ID or Password is incorrect. Please try again.',
        });
      } else if (error.response?.status === 403 && error.response.data?.userDetails) {
        const userDetails = error.response.data.userDetails || {
          userName: 'Unknown',
          startDate: null,
          endDate: null,
          daysRemaining: 0,
        };
        setModalError({
          show: true,
          title: 'Subscription Expired',
          message: `Dear ${userDetails.userName}, your subscription has expired. Please contact 0304-8840264 to renew Subscription.`,
        });
      } else {
        setError('Login failed. Please check your credentials.');
      }
      throw new Error('Login failed.');
    }
  };

  const logout = async () => {
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/logout`, {}, { withCredentials: true });
      document.cookie = "authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      setUser(null);
      localStorage.removeItem('user');
      setWarning(null); // <-- Remove warning on logout

      if (res.data?.adminRestored) {
        await fetchUserProfile();
        navigate('/');
      } else {
        navigate('/login');
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const loginAs = async (userId) => {
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/admin/login-as/${encodeURIComponent(userId)}`, {}, { withCredentials: true });
      await fetchUserProfile();
      navigate('/');
    } catch (error) {
      console.error('Login as user failed:', error);
    }
  };


   const changePassword = async (oldPassword, newPassword) => {
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/change-password`,
        { userId: user.userId, oldPassword, newPassword },
        { withCredentials: true }
      );

      document.cookie = "authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      await logout();
      setError(null);
    } catch (error) {
      console.error('Password change failed:', error);
      setError('Failed to change password. Please try again.');
      throw new Error('Failed to change password.');
    }
  };

  // Send heartbeat every minute when logged in
  useEffect(() => {
    if (!user) return;
    const send = async () => {
      try {
        await axios.post(`${process.env.REACT_APP_API_URL}/heartbeat`, {}, { withCredentials: true });
      } catch (err) {
        console.error('Heartbeat failed:', err);
      }
    };
    send();
    const id = setInterval(send, 60000);
    return () => clearInterval(id);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        userType: user?.userType,
        login,
        logout,
        loginAs,
        changePassword,
        loading,
        error,
        modalError,
        setModalError,
        warning,        // <-- Expose warning state
        setWarning,     // <-- Expose setter (if modal will clear it)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
