"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/constants';
import { offlineApi } from '../utils/offlineApi';
import { backgroundSync } from '../utils/backgroundSync';
import { requiresTwoFactorAuthentication } from '../utils/roles';

interface User {
  id: string;
  username: string;
  role: string;
  name?: string;
  hostel?: string;
}


interface ProfileResponse {
  name?: string;
  hostel?: string;
  studentProfile?: {
    fullName?: string;
    personalInfo?: {
      firstName?: string;
      surName?: string;
    };
  } | null;
}

export type LoginResult =
  // Keep accepting the previous boolean result for callers that still use it.
  | boolean
  | { authenticated: true }
  | {
      requiresRegistration: true;
      registrationRoles: string[];
      googleProfile: { email: string; name?: string };
      message?: string;
    }
  | {
      requiresTwoFactor: true;
      challengeId: string;
      expiresAt?: string;
      message?: string;
    };

export type GoogleRegistrationDetails = {
  role: 'student' | 'general_user';
  name?: string;
  profile?: { houseNumber?: string };
  studentProfile?: Record<string, unknown>;
};

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<LoginResult>;
  loginWithGoogle: (credential: string) => Promise<LoginResult>;
  registerWithGoogle: (credential: string, details: GoogleRegistrationDetails) => Promise<boolean>;
  verifyTwoFactorLogin: (challengeId: string, code: string) => Promise<boolean>;
  loginOffline: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  loading: boolean;
  isOnline: boolean;
  preloadData: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  isPreloading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function decodeJwtPayload(token: string) {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}


function getStudentProfileFullName(profile: ProfileResponse | null) {
  return (
    profile?.studentProfile?.fullName ||
    [
      profile?.studentProfile?.personalInfo?.firstName,
      profile?.studentProfile?.personalInfo?.surName,
    ]
      .filter(Boolean)
      .join(' ')
      .trim()
  );
}

function getProfileDisplayName(profile: ProfileResponse | null, fallbackUser: User) {
  const studentProfileName =
    fallbackUser.role === 'student' ? getStudentProfileFullName(profile) : '';
  return (
    studentProfileName ||
    String(profile?.name || '').trim() ||
    String(fallbackUser.name || '').trim() ||
    fallbackUser.username
  );
}

function isTokenExpired(token: string) {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) {
    return false;
  }

  return payload.exp * 1000 <= Date.now();
}

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
      
      if (storedToken && storedUser) {
        try {
          // In development, don't use offline credentials
          if (process.env.NODE_ENV === 'development' && storedToken === 'offline_token') {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            localStorage.removeItem('offline_auth_data');
            setLoading(false);
            return;
          }

          if (storedToken !== 'offline_token' && isTokenExpired(storedToken)) {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            setLoading(false);
            return;
          }
          
          const parsedUser = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsedUser);

          if (storedToken !== 'offline_token' && navigator.onLine) {
            fetch(`${API_BASE_URL}/users/me`, {
              headers: { Authorization: `Bearer ${storedToken}` },
            })
              .then((response) => (response.ok ? response.json() : null))
              .then((profile) => {
                if (!profile) return;
                const refreshedUser = {
                  ...parsedUser,
                  name: getProfileDisplayName(profile, parsedUser),
                  hostel: profile?.hostel ?? parsedUser.hostel,
                };
                localStorage.setItem('auth_user', JSON.stringify(refreshedUser));
                setUser(refreshedUser);
              })
              .catch((error) => {
                console.warn('Unable to refresh stored user profile:', error);
              });
          }
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

  const hashOfflinePassword = async (username: string, password: string): Promise<string> => {
    const payload = `${username.trim().toLowerCase()}:${password}`;
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
    return Array.from(new Uint8Array(digest))
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  };

  const refreshUserProfile = async (): Promise<void> => {
    if (!token || token === 'offline_token' || !user) return;

    try {
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) return;

      const profile = (await response.json()) as ProfileResponse;
      const refreshedUser = {
        ...user,
        name: getProfileDisplayName(profile, user),
        hostel: profile?.hostel ?? user.hostel,
      };

      localStorage.setItem('auth_user', JSON.stringify(refreshedUser));
      setUser(refreshedUser);
    } catch (error) {
      console.warn('Unable to refresh user profile:', error);
    }
  };

  const persistAuthenticatedSession = async (
    data: { token: string; user: User },
    identifier: string,
    password: string,
    allowOfflineLogin = true,
  ) => {
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));

    if (allowOfflineLogin) {
      const passwordHash = await hashOfflinePassword(identifier, password);
      const offlineData = encryptData(JSON.stringify({
        username: identifier,
        passwordHash,
        user: data.user,
        timestamp: Date.now()
      }));
      localStorage.setItem('offline_auth_data', offlineData);
    } else {
      localStorage.removeItem('offline_auth_data');
    }

    setToken(data.token);
    setUser(data.user);

    const startPreload = () => {
      setTimeout(() => {
        preloadData().catch(error => {
          console.warn('Background preload failed:', error);
        });
      }, 100);
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(startPreload);
    } else {
      startPreload();
    }
  };

  const completeLoginResponse = async (
    response: Response,
    identifier: string,
    password: string,
    allowOfflineLogin = true,
  ): Promise<LoginResult> => {
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error || 'Login failed. Please try again.');
    }

    const data = await response.json();
    if (data?.requiresRegistration) {
      return {
        requiresRegistration: true,
        registrationRoles: Array.isArray(data.registrationRoles) ? data.registrationRoles : ['student', 'general_user'],
        googleProfile: data.googleProfile || { email: '' },
        message: data.message,
      };
    }
    if (data?.requiresTwoFactor) {
      if (!data.challengeId) {
        throw new Error('Unable to start two-factor authentication. Please try again.');
      }
      return {
        requiresTwoFactor: true,
        challengeId: data.challengeId,
        expiresAt: data.expiresAt,
        message: data.message,
      };
    }

    if (!data?.token || !data?.user) {
      throw new Error('Login failed. Please try again.');
    }

    await persistAuthenticatedSession(data, identifier, password, allowOfflineLogin);
    return { authenticated: true };
  };

  const login = async (username: string, password: string): Promise<LoginResult> => {
    try {
      const identifier = username.trim();
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: identifier, password }),
      });

      return await completeLoginResponse(response, identifier, password);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const loginWithGoogle = async (credential: string): Promise<LoginResult> => {
    try {
      const response = await fetch(`${API_BASE_URL}/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });

      return await completeLoginResponse(response, '', '', false);
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  };

  const registerWithGoogle = async (credential: string, details: GoogleRegistrationDetails): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/google-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, ...details }),
      });

      const result = await completeLoginResponse(response, '', '', false);
      return typeof result === 'object' && result !== null && 'authenticated' in result && result.authenticated === true;
    } catch (error) {
      console.error('Google registration error:', error);
      throw error;
    }
  };

  const verifyTwoFactorLogin = async (challengeId: string, code: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/verify-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, code: code.trim() }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Verification failed. Please try again.');
      }
      if (!data?.token || !data?.user) {
        throw new Error('Verification failed. Please sign in again.');
      }

      // The offline credential is only created after both factors are verified.
      await persistAuthenticatedSession(data, data.user.username, '', false);
      return true;
    } catch (error) {
      console.error('Two-factor verification error:', error);
      throw error;
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

      if (requiresTwoFactorAuthentication(offlineData.user?.role)) {
        throw new Error('Management accounts require an online two-factor sign-in.');
      }
      
      // Check if stored credentials match
      const passwordHash = await hashOfflinePassword(username, password);
      if (offlineData.username === username && offlineData.passwordHash === passwordHash) {
        // Check if data is not too old (e.g., 30 days)
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        if (offlineData.timestamp < thirtyDaysAgo) {
          throw new Error('Offline data expired');
        }
        
        localStorage.setItem('auth_token', 'offline_token');
        localStorage.setItem('auth_user', JSON.stringify(offlineData.user));
        setUser(offlineData.user);
        setToken('offline_token'); // Special token for offline mode
        return true;
      }
      
      throw new Error('Invalid credentials');
    } catch (error) {
      console.error('Offline login error:', error);
      throw error;
    }
  };

  const logout = () => {
    // Stop background sync
    backgroundSync.stop();
    
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('offline_auth_data');
    localStorage.removeItem('offline_cache_owner');
    offlineApi.clearCache().catch(error => {
      console.warn('Unable to clear offline cache during logout:', error);
    });
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
          
          // Update the password hash in offline data
          const offlineUsername = offlineData.username || user?.username || '';
          const updatedOfflineData = encryptData(JSON.stringify({
            ...offlineData,
            passwordHash: await hashOfflinePassword(offlineUsername, newPassword),
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
      loginWithGoogle,
      registerWithGoogle,
      verifyTwoFactorLogin,
      loginOffline,
      logout,
      changePassword,
      loading,
      isOnline,
      preloadData,
      refreshUserProfile,
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
