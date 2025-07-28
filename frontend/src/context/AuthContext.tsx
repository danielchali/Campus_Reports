"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/constants';

interface User {
  id: string;
  username: string;
  role: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  loginOffline: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  loading: boolean;
  isOnline: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load stored auth data on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    const storedOfflineData = localStorage.getItem('offline_auth_data');
    
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing stored auth data:', error);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    }
    
    setLoading(false);
  }, []);

  // Simple encryption/decryption for offline data (for demo purposes)
  const encryptData = (data: string): string => {
    // In production, use a proper encryption library
    return btoa(data);
  };

  const decryptData = (encryptedData: string): string => {
    try {
      return atob(encryptedData);
    } catch {
      return '';
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      
      // Store auth data
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      
      // Store encrypted offline data for offline login
      const offlineData = encryptData(JSON.stringify({
        username,
        password,
        user: data.user,
        timestamp: Date.now()
      }));
      localStorage.setItem('offline_auth_data', offlineData);
      
      setToken(data.token);
      setUser(data.user);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const loginOffline = async (username: string, password: string): Promise<boolean> => {
    try {
      const storedOfflineData = localStorage.getItem('offline_auth_data');
      if (!storedOfflineData) {
        throw new Error('No offline data available');
      }

      const decryptedData = decryptData(storedOfflineData);
      const offlineData = JSON.parse(decryptedData);
      
      // Check if stored credentials match
      if (offlineData.username === username && offlineData.password === password) {
        // Check if data is not too old (e.g., 30 days)
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        if (offlineData.timestamp < thirtyDaysAgo) {
          throw new Error('Offline data expired');
        }
        
        setUser(offlineData.user);
        setToken('offline_token'); // Special token for offline mode
        return true;
      }
      
      throw new Error('Invalid credentials');
    } catch (error) {
      console.error('Offline login error:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('offline_auth_data');
    setToken(null);
    setUser(null);
  };

  const changePassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
    try {
      // Update password in online database
      const response = await fetch(`${API_BASE_URL}/users/me/password`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      if (!response.ok) {
        throw new Error('Password change failed');
      }

      // Update local storage for offline functionality
      const storedOfflineData = localStorage.getItem('offline_auth_data');
      if (storedOfflineData) {
        try {
          const decryptedData = decryptData(storedOfflineData);
          const offlineData = JSON.parse(decryptedData);
          
          // Update the password in offline data
          const updatedOfflineData = encryptData(JSON.stringify({
            ...offlineData,
            password: newPassword,
            timestamp: Date.now() // Update timestamp
          }));
          
          localStorage.setItem('offline_auth_data', updatedOfflineData);
        } catch (error) {
          console.error('Error updating offline data:', error);
          // Continue even if offline update fails
        }
      }

      return true;
    } catch (error) {
      console.error('Change password error:', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      loginOffline,
      logout,
      changePassword,
      loading,
      isOnline
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}