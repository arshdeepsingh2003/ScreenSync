/* eslint-disable react/only-export-components */
import React, { createContext, useState } from 'react';
import { Navigate } from 'react-router-dom';
import authService from '../services/authService';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem('token') || null);

  const login = async (username, password) => {
    try {
      const data = await authService.login(username, password);
      const accessToken = data.access_token;
      sessionStorage.setItem('token', accessToken);
      setToken(accessToken);
      return data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    sessionStorage.removeItem('token');
    setToken(null);
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ token, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function RequireAuth({ children }) {
  const token = sessionStorage.getItem('token');
  const isAuthenticated = !!token;

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
