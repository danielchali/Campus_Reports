"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/constants';
import { offlineApi } from '../utils/offlineApi';
import { backgroundSync } from '../utils/backgroundSync';

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
  preloadData: () => Promise<void>;
  isPreloading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [isPreloading, setIsPreloading] = useState(false);

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
    const loadStoredAuth = async () => {
      const storedToken = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('auth_user');
      const storedOfflineData = localStorage.getItem('offline_auth_data');
      
      if (storedToken && storedUser) {
        try {
          // Validate token if it's not an offline token
          if (storedToken !== 'offline_token') {
            try {
              // Test token by making a simple API call
              const response = await fetch(`${API_BASE_URL}/cases?limit=1`, {
                headers: { 'Authorization': `Bearer ${storedToken}` }
              });
              
              if (!response.ok) {
                throw new Error('Token validation failed');
              }
            } catch (error) {
              console.warn('Token validation failed, clearing stored auth:', error);
              localStorage.removeItem('auth_token');
              localStorage.removeItem('auth_user');
              setLoading(false);
              return;
            }
          }
          
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        } catch (error) {
          console.error('Error parsing stored auth data:', error);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
        }
      }
      
      setLoading(false);
    };
    
    loadStoredAuth();
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
      
      // Set auth state immediately for instant login
      setToken(data.token);
      setUser(data.user);
      
      // Start preloading data in the background (non-blocking)
      // Use requestIdleCallback for better performance, fallback to setTimeout
      const startPreload = () => {
        // Use a very short delay to ensure UI updates first
        setTimeout(() => {
          preloadData().catch(error => {
            console.warn('Background preload failed:', error);
            // Don't block login if preload fails
          });
        }, 100);
      };
      
      if ('requestIdleCallback' in window) {
        requestIdleCallback(startPreload);
      } else {
        startPreload();
      }
      
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
    // Stop background sync
    backgroundSync.stop();
    
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('offline_auth_data');
    setToken(null);
    setUser(null);
    
    // Force redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
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

  // Preload critical data for offline functionality
  const preloadData = async (): Promise<void> => {
    if (!token || isPreloading) return;
    
    setIsPreloading(true);
    try {
      console.log('Starting background data preload...');
      
      // Initialize offline API service (non-blocking)
      await Promise.race([
        offlineApi.init(),
        new Promise(resolve => setTimeout(resolve, 5000)) // 5 second timeout
      ]).catch(error => {
        console.warn('Offline API init timeout or error:', error);
        return;
      });
      
      // Preload critical data with timeout
      await Promise.race([
        offlineApi.preloadCriticalData(),
        new Promise(resolve => setTimeout(resolve, 10000)) // 10 second timeout
      ]).catch(error => {
        console.warn('Critical data preload timeout or error:', error);
      });
      
      // Preload role-specific data with timeout
      if (user?.role) {
        await Promise.race([
          offlineApi.preloadRoleSpecificData(user.role),
          new Promise(resolve => setTimeout(resolve, 8000)) // 8 second timeout
        ]).catch(error => {
          console.warn('Role-specific data preload timeout or error:', error);
        });
      }
      
      // Start background sync service (non-blocking)
      setTimeout(() => {
        try {
          backgroundSync.start(5); // Sync every 5 minutes
        } catch (error) {
          console.warn('Background sync start failed:', error);
        }
      }, 1000);
      
      console.log('Background data preload completed');
      
    } catch (error) {
      console.error('Data preload failed:', error);
    } finally {
      setIsPreloading(false);
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
      isOnline,
      preloadData,
      isPreloading
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