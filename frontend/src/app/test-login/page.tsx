"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';

export default function TestLoginPage() {
  const router = useRouter();

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      router.replace('/login');
    }
  }, [router]);

  if (process.env.NODE_ENV === 'production') {
    return null;
  }
  const { user, token, login, verifyTwoFactorLogin, logout } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorChallengeId, setTwoFactorChallengeId] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorMessage, setTwoFactorMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await login(username, password);
      if (typeof result === 'object' && result !== null && 'requiresTwoFactor' in result && result.requiresTwoFactor) {
        setTwoFactorChallengeId(result.challengeId);
        setTwoFactorCode('');
        setTwoFactorMessage(result.message || 'Enter the verification code sent to the account email.');
        return;
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorChallengeId) return;

    setLoading(true);
    setError(null);
    try {
      await verifyTwoFactorLogin(twoFactorChallengeId, twoFactorCode);
    } catch (err: any) {
      setError(err?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="p-8 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Login Test Page</h1>
      
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Current Auth State:</h2>
        <pre className="bg-gray-100 p-2 rounded">
          {JSON.stringify({ user, token: token ? 'Present' : 'None' }, null, 2)}
        </pre>
      </div>

      {!user && !twoFactorChallengeId ? (
        <form onSubmit={handleLogin} className="mb-4">
          <div className="mb-2">
            <label className="block mb-1">Username:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="border rounded px-2 py-1"
              required
            />
          </div>
          <div className="mb-2">
            <label className="block mb-1">Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border rounded px-2 py-1"
              required
            />
          </div>
          {error && <div className="text-red-600 mb-2">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="bg-kmuGreen text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      ) : !user && twoFactorChallengeId ? (
        <form onSubmit={handleTwoFactorLogin} className="mb-4">
          <p className="mb-2 text-sm text-slate-600">{twoFactorMessage}</p>
          <div className="mb-2">
            <label className="block mb-1">Verification code:</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="border rounded px-2 py-1"
              required
              maxLength={6}
            />
          </div>
          {error && <div className="text-red-600 mb-2">{error}</div>}
          <button
            type="submit"
            disabled={loading || twoFactorCode.length !== 6}
            className="bg-kmuGreen text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify code'}
          </button>
        </form>
      ) : (
        <div className="mb-4">
          <p className="mb-2">Logged in as: {user?.username} (Role: {user?.role})</p>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Logout
          </button>
        </div>
      )}

      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Test Credentials:</h2>
        <ul className="list-disc list-inside">
          <li>Admin: username: "admin", password: "password"</li>
          <li>Chief Security Officer: username: "chief_security", password: "password"</li>
          <li>Dean of Students: username: "dean", password: "password"</li>
          <li>Warden: username: "warden", password: "password"</li>
          <li>Registrar: username: "registrar", password: "password"</li>
          <li>Security Officer: username: "security", password: "password"</li>
        </ul>
      </div>

      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Dashboard Links:</h2>
        <ul className="list-disc list-inside">
          <li><a href="/admin" className="text-kmuGreen hover:underline">Admin Dashboard</a></li>
          <li><a href="/chief-security-officer-dashboard" className="text-kmuGreen hover:underline">Chief Security Officer Dashboard</a></li>
          <li><a href="/dean-of-students-dashboard" className="text-kmuGreen hover:underline">Dean of Students Dashboard</a></li>
          <li><a href="/warden-dashboard" className="text-kmuGreen hover:underline">Warden Dashboard</a></li>
          <li><a href="/registrar-dashboard" className="text-kmuGreen hover:underline">Registrar Dashboard</a></li>
          <li><a href="/security-dashboard" className="text-kmuGreen hover:underline">Security Dashboard</a></li>
        </ul>
      </div>
    </div>
  );
} 
