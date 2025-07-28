"use client";
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from '../../config/constants';
import { getProfile, updateProfile } from '../../utils/api';
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();
  const { token, changePassword } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ username: '', name: '' });
  const [success, setSuccess] = useState<string | null>(null);
  
  // Password change states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      setError(null);
      try {
        const data = await getProfile();
        setProfile(data);
        setForm({ username: data.username || '', name: data.name || '' });
      } catch (err: any) {
        setError(err.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await updateProfile(form);
      setSuccess('Profile updated successfully!');
      setEditMode(false);
      // Refresh profile
      const data = await getProfile();
      setProfile(data);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);
    try {
      const success = await changePassword(oldPassword, newPassword);
      if (success) {
        setPasswordSuccess('Password changed successfully! Your offline login credentials have also been updated.');
        setOldPassword('');
        setNewPassword('');
      } else {
        setPasswordError('Failed to change password');
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password');
    }
  }

  const safeProfile = profile && typeof profile === 'object' && !Array.isArray(profile) ? profile : {};

  return (
    <section className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4 text-kmuGreen">Profile & Settings</h1>
        <p className="text-gray-700 dark:text-gray-300 text-lg">
          Manage your personal information and account settings in one place.
        </p>
      </div>

      {loading ? (
        <div className="text-center text-kmuGreen">Loading...</div>
      ) : error ? (
        <div className="text-center text-red-600 dark:text-red-400">{error}</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-8">
          {/* Profile Information Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold mb-4 text-kmuOrange">👤 Profile Information</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Update your personal information and display name.
            </p>
            
          {editMode ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1">Username</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                  value={form.username} 
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))} 
                  required 
                />
              </div>
              <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                  value={form.name} 
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
                  required 
                />
              </div>
              {error && <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>}
              {success && <div className="text-kmuGreen dark:text-green-400 text-sm">{success}</div>}
                <div className="flex gap-2">
                  <button 
                    type="submit" 
                    className="bg-kmuGreen text-white px-4 py-2 rounded hover:bg-kmuOrange transition"
                  >
                    Save Changes
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setEditMode(false)} 
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-1 font-medium">Username</label>
                  <p className="text-gray-900 dark:text-white">{safeProfile.username || 'Not set'}</p>
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-1 font-medium">Full Name</label>
                  <p className="text-gray-900 dark:text-white">{safeProfile.name || 'Not set'}</p>
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-1 font-medium">Role</label>
                  <p className="text-gray-900 dark:text-white capitalize">{safeProfile.role || 'Not set'}</p>
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-1 font-medium">Account Created</label>
                  <p className="text-gray-900 dark:text-white">
                    {safeProfile.createdAt ? new Date(safeProfile.createdAt).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
                <button 
                  onClick={() => setEditMode(true)} 
                  className="bg-kmuGreen text-white px-4 py-2 rounded hover:bg-kmuOrange transition"
                >
                  Edit Profile
                </button>
              </div>
            )}
          </div>

          {/* Account Settings Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold mb-4 text-kmuOrange">🔐 Account Security</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Change your password to keep your account secure.
            </p>
            
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label htmlFor="oldPassword" className="block text-gray-700 dark:text-gray-300 mb-1">
                  Current Password
                </label>
                <input 
                  id="oldPassword" 
                  type="password" 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                  value={oldPassword} 
                  onChange={e => setOldPassword(e.target.value)} 
                  required 
                />
              </div>
              <div>
                <label htmlFor="newPassword" className="block text-gray-700 dark:text-gray-300 mb-1">
                  New Password
                </label>
                <input 
                  id="newPassword" 
                  type="password" 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  required 
                />
              </div>
              {passwordSuccess && (
                <div className="text-kmuGreen dark:text-green-400 text-sm p-3 bg-green-50 dark:bg-green-900/20 rounded">
                  {passwordSuccess}
                </div>
              )}
              {passwordError && (
                <div className="text-red-600 dark:text-red-400 text-sm p-3 bg-red-50 dark:bg-red-900/20 rounded">
                  {passwordError}
                </div>
              )}
              <button 
                type="submit" 
                className="bg-kmuGreen text-white px-4 py-2 rounded hover:bg-kmuOrange transition"
              >
                Change Password
              </button>
            </form>

            {/* Security Tips */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">🔒 Security Tips</h3>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• Use a strong password with at least 8 characters</li>
                <li>• Include numbers, letters, and special characters</li>
                <li>• Change your password regularly</li>
                <li>• Never share your login credentials</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold mb-4 text-kmuOrange">❓ Need Help?</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          If you need assistance with your account or have questions about the system, 
          check out our help documentation or contact support.
        </p>
        <div className="flex gap-4">
          <a 
            href="/help" 
            className="bg-kmuGreen text-white px-4 py-2 rounded hover:bg-kmuOrange transition"
          >
            View Help Documentation
          </a>
          <a 
            href="/help#contact" 
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition"
          >
            Contact Support
          </a>
        </div>
      </div>
    </section>
  );
}