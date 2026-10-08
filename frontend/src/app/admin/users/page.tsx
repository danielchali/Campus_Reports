"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { getAll, register, update, remove, exportDocx, exportExcel, authHeaders } from '../../../utils/api';
import { API_BASE_URL } from '../../../config/constants';
import { canAccessPage } from '../../../utils/access';
import { PageSkeleton, TableSkeleton } from '../../../components/PageSkeleton';
import { StatCard, StatsStrip } from '../../../components/StatsStrip';
import { useAlertDialog, useConfirmDialog } from '../../../components/AppDialog';



type UserAccount = {
  id?: string;
  _id?: string;
  username: string;
  name: string;
  role: string;
  email?: string;
  hostel?: string;
};

type ApiError = {
  message?: string;
};

const getErrorMessage = (err: unknown, fallback: string) => {
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return (err as ApiError).message || fallback;
  }
  return fallback;
};

const getLoginIdentifier = (account: UserAccount) =>
  account.role === 'student' ? account.username : (account.email || account.username);

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'security_officer', label: 'Security Officer' },
  { value: 'chief_security_officer', label: 'Chief Security Officer' },
  { value: 'dean_of_students', label: 'Dean of Students' },
  { value: 'warden', label: 'Warden' },
  { value: 'registrar', label: 'Registrar' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'student', label: 'Student' },
  { value: 'general_user', label: 'General User' },
];

export default function UserManagementPage() {
  const { token, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { confirm, confirmDialog } = useConfirmDialog();
  const { showAlert, alertDialog } = useAlertDialog();
  
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<UserAccount | null>(null);
  const [newUser, setNewUser] = useState({ username: '', name: '', email: '', password: '', role: 'security_officer', hostel: '' });
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserAccount | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  useEffect(() => {
    if (!authLoading && !token) {
      router.replace('/login');
    }
  }, [authLoading, token, router]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query: Record<string, string> = {};
      if (search) query.search = search;
      if (roleFilter) query.role = roleFilter;
      const data = await getAll('users', query);
      setUsers(Array.isArray(data) ? data : (data.users || data || []));
    } catch (err: unknown) {
      console.error('Error fetching users:', err);
      setError(getErrorMessage(err, 'Failed to load users'));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => { 
    if (user && canAccessPage(user.role, 'adminUsers')) {
      fetchUsers(); 
    }
  }, [fetchUsers, user]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const loginIdentifier = newUser.role === 'student' ? newUser.username.trim() : newUser.email.trim();
      await register(loginIdentifier, newUser.password, newUser.name, newUser.role, newUser.email.trim(), newUser.hostel.trim());
      showAlert({ title: 'User created', message: 'User created successfully!', tone: 'success' });
      setShowCreate(false);
      setNewUser({ username: '', name: '', email: '', password: '', role: 'security_officer', hostel: '' });
      fetchUsers();
    } catch (err: unknown) {
      console.error('Error creating user:', err);
      setError(getErrorMessage(err, 'Failed to create user'));
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) {
      setError('No user selected for editing.');
      return;
    }

    const targetUserId = editUser.id || editUser._id;
    if (!targetUserId) {
      setError('Selected user has no identifier.');
      return;
    }

    setError(null);
    setSuccess(null);
    try {
      await update('users', targetUserId, {
        username: editUser.role === 'student' ? editUser.username : (editUser.email || ''),
        name: editUser.name,
        role: editUser.role,
        email: editUser.email?.trim() || '',
        hostel: editUser.hostel?.trim() || ''
      });
      showAlert({
        title: 'User updated',
        message: 'User updated successfully!',
        tone: 'success',
      });
      setEditUser(null);
      setEditingUserId(null);
      fetchUsers();
    } catch (err: unknown) {
      console.error('Error updating user:', err);
      setError(getErrorMessage(err, 'Failed to update user'));
    }
  }

  async function handleDelete(id: string) {
    const confirmed = await confirm({
      title: 'Delete user?',
      message: 'Are you sure you want to delete this user? This action cannot be undone.',
      confirmLabel: 'Delete User',
      tone: 'danger',
    });
    if (!confirmed) return;
    setError(null);
    setSuccess(null);
    try {
      await remove('users', id);
      showAlert({ title: 'User deleted', message: 'User deleted successfully!', tone: 'success' });
      fetchUsers();
    } catch (err: unknown) {
      console.error('Error deleting user:', err);
      setError(getErrorMessage(err, 'Failed to delete user'));
    }
  }

  function openResetPasswordDialog(userAccount: UserAccount) {
    setResetPasswordUser(userAccount);
    setResetPassword('');
    setResetPasswordConfirm('');
    setError(null);
    setSuccess(null);
  }

  function closeResetPasswordDialog() {
    if (resettingPassword) return;
    setResetPasswordUser(null);
    setResetPassword('');
    setResetPasswordConfirm('');
  }

  async function handleAdminResetPassword(e: React.FormEvent) {
    e.preventDefault();
    const targetUserId = resetPasswordUser?.id || resetPasswordUser?._id;

    if (!targetUserId) {
      setError('Selected user has no identifier.');
      return;
    }

    if (resetPassword.length < 6) {
      setError('Temporary password must be at least 6 characters.');
      return;
    }

    if (resetPassword !== resetPasswordConfirm) {
      setError('Temporary passwords do not match.');
      return;
    }

    setError(null);
    setSuccess(null);
    setResettingPassword(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/${targetUserId}/reset-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ newPassword: resetPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      showAlert({
        title: 'Password reset',
        message: `Password reset successfully for ${resetPasswordUser?.username || 'user'}.`,
        tone: 'success',
      });
      setResetPasswordUser(null);
      setResetPassword('');
      setResetPasswordConfirm('');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to reset password'));
    } finally {
      setResettingPassword(false);
    }
  }

  function startEdit(userAccount: UserAccount) {
    setEditingUserId(userAccount.id || userAccount._id || null);
    setEditUser({ ...userAccount });
  }

  function cancelEdit() {
    setEditingUserId(null);
    setEditUser(null);
  }

  function toggleSelect(id: string) {
    setSelected(sel => sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]);
  }

  function selectAll() {
    setSelected(users.map((u) => u.id || u._id).filter((id): id is string => Boolean(id)));
  }

  function clearSelected() {
    setSelected([]);
  }

  async function handleBulkDelete() {
    const confirmed = await confirm({
      title: 'Delete selected users?',
      message: `This will permanently delete ${selected.length} selected user(s).`,
      confirmLabel: 'Delete Selected',
      tone: 'danger',
    });
    if (!confirmed) return;
    for (const id of selected) {
      await remove('users', id);
    }
    setUsers((users) => users.filter((u) => {
      const identifier = u.id || u._id;
      return !identifier || !selected.includes(identifier);
    }));
    setSelected([]);
  }

  async function handleBulkExport() {
    await exportDocx('users');
  }

  async function handleBulkExportExcel() {
    await exportExcel('users');
  }

  const userStats = useMemo(() => {
    const adminCount = users.filter((account) => account.role === 'admin').length;
    const studentCount = users.filter((account) => account.role === 'student').length;
    const supportCount = users.filter((account) =>
      ['security_officer', 'chief_security_officer', 'dean_of_students', 'warden', 'secretary', 'registrar', 'maintenance'].includes(account.role)
    ).length;

    return [
      { label: 'Visible Users', value: users.length, tone: 'text-kmuGreen bg-kmuGreen/10' },
      { label: 'Admins', value: adminCount, tone: 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/30' },
      { label: 'Students', value: studentCount, tone: 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/30' },
      { label: 'Staff Roles', value: supportCount, tone: 'text-purple-700 bg-purple-100 dark:text-purple-300 dark:bg-purple-900/30' },
    ];
  }, [users]);

  if (authLoading || (!token && typeof window !== 'undefined')) {
    return <PageSkeleton />;
  }

  if (!user || !canAccessPage(user.role, 'adminUsers')) {
    return <div className="text-red-600">Access denied. Admin privileges required.</div>;
  }


  return (
      <div className="w-full space-y-6">
        {alertDialog}
        <StatsStrip desktopColumnsClass="lg:grid-cols-4">
          {userStats.map((stat) => (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              className="border-slate-200 dark:border-slate-800"
              valueClassName="text-gray-900 dark:text-white"
            />
          ))}
        </StatsStrip>

        {/* Messages */}
        {error && <div className="text-red-600 text-sm mb-2 bg-red-100 dark:bg-red-900/20 p-2 rounded">{error}</div>}

        {/* Filters and Actions */}
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-6">
          <div className="mb-4 space-y-3">
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(220px,1fr)_180px_auto_auto_auto]">
              <input
                type="text"
                placeholder="Search by username, name, or email"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">All Roles</option>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <button type="button" className="rounded bg-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600" onClick={selectAll}>
                Select All
              </button>
              <button type="button" className="rounded bg-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600" onClick={clearSelected}>
                Clear
              </button>
              <button
                type="button"
                className="rounded bg-kmuGreen px-4 py-2 text-sm font-semibold text-white transition hover:bg-kmuOrange"
                onClick={() => setShowCreate(!showCreate)}
              >
                {showCreate ? 'Cancel New User' : 'Add New User'}
              </button>
            </div>

            {selected.length > 0 && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <button type="button" className="rounded bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700" onClick={handleBulkDelete}>
                  Delete Selected
                </button>
                <button type="button" className="rounded bg-kmuGreen px-3 py-2 text-sm text-white hover:bg-kmuOrange" onClick={handleBulkExport}>
                  Export Selected (Word)
                </button>
                <button type="button" className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700" onClick={handleBulkExportExcel}>
                  Export Selected (Excel)
                </button>
              </div>
            )}

            {showCreate && (
              <form className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40" onSubmit={handleCreate}>
                <div className="grid gap-4 md:grid-cols-2">
                  {newUser.role === 'student' && <div>
                    <label className="mb-1 block text-gray-700 dark:text-gray-300">Student ID</label>
                    <input
                      type="text"
                      className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      value={newUser.username}
                      onChange={e => setNewUser(u => ({ ...u, username: e.target.value }))}
                      required
                    />
                  </div>}
                  <div>
                    <label className="mb-1 block text-gray-700 dark:text-gray-300">Name</label>
                    <input
                      type="text"
                      className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      value={newUser.name}
                      onChange={e => setNewUser(u => ({ ...u, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-gray-700 dark:text-gray-300">Email</label>
                    <input
                      type="email"
                      className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      value={newUser.email}
                      onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))}
                      required
                    />
                    {newUser.role !== 'student' && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">This email will be used as the login username.</p>}
                  </div>
                  <div>
                    <label className="mb-1 block text-gray-700 dark:text-gray-300">Password</label>
                    <input
                      type="password"
                      className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      value={newUser.password}
                      onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-gray-700 dark:text-gray-300">Role</label>
                    <select
                      className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      value={newUser.role}
                      onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))}
                      required
                    >
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  {newUser.role === 'warden' && (
                    <div>
                      <label className="mb-1 block text-gray-700 dark:text-gray-300">Hostel</label>
                      <input
                        type="text"
                        className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        value={newUser.hostel}
                        onChange={e => setNewUser(u => ({ ...u, hostel: e.target.value }))}
                        placeholder="e.g. Kwacha Hostel"
                        required
                      />
                    </div>
                  )}
                </div>
                <div className="mt-4 flex justify-end">
                  <button type="submit" className="rounded bg-kmuGreen px-4 py-2 text-white transition hover:bg-kmuOrange">
                    Create User
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Users Table */}
          {loading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : (
            <>
            <div className="space-y-4 md:hidden">
              {users.map((u) => {
                const userId = u.id || u._id || "";
                const isEditing = userId ? editingUserId === userId : false;

                return (
                  <div key={userId || `${u.username}-${u.role}`} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selected.includes(userId)}
                        onChange={() => userId && toggleSelect(userId)}
                        className="mt-1"
                      />
                      <div className="min-w-0 flex-1">
                        {isEditing && editUser ? (
                          <div className="space-y-3">
                            {editUser.role === 'student' ? (
                              <input
                                type="text"
                                className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                value={editUser.username}
                                onChange={e => setEditUser((eu: any) => ({ ...eu, username: e.target.value }))}
                                placeholder="Student ID"
                              />
                            ) : (
                              <div className="rounded border border-dashed border-gray-300 px-2 py-2 text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
                                Login: {editUser.email || 'Email required'}
                              </div>
                            )}
                            <input
                              type="text"
                              className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                              value={editUser.name}
                              onChange={e => setEditUser((eu: any) => ({ ...eu, name: e.target.value }))}
                            />
                            <input
                              type="email"
                              className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                              value={editUser.email || ''}
                              onChange={e => setEditUser((eu: any) => ({ ...eu, email: e.target.value }))}
                            />
                            <select
                              className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                              value={editUser.role}
                              onChange={e => setEditUser((eu: any) => ({ ...eu, role: e.target.value }))}
                            >
                              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                            {editUser.role === 'warden' && (
                              <input
                                type="text"
                                className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                value={editUser.hostel || ''}
                                onChange={e => setEditUser((eu: any) => ({ ...eu, hostel: e.target.value }))}
                                placeholder="Hostel"
                                required
                              />
                            )}
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              <button type="button" className="bg-kmuGreen text-white px-3 py-2 rounded text-xs" onClick={handleEdit}>Save</button>
                              <button type="button" className="bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-2 rounded text-xs" onClick={cancelEdit}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="font-medium text-gray-900 dark:text-white">{getLoginIdentifier(u)}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">{u.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{u.email || 'No email set'}</div>
                            <div className="mt-2">
                              <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                                {u.role}
                              </span>
                              {u.role === 'warden' && u.hostel && (
                                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Hostel: {u.hostel}</div>
                              )}
                            </div>
                            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                              <button type="button" className="bg-blue-500 text-white px-3 py-2 rounded text-xs hover:bg-blue-600 transition" onClick={() => startEdit(u)}>Edit</button>
                              <button type="button" className="bg-amber-600 text-white px-3 py-2 rounded text-xs hover:bg-amber-700 transition" onClick={() => openResetPasswordDialog(u)}>Reset Password</button>
                              <button type="button" className="bg-red-600 text-white px-3 py-2 rounded text-xs hover:bg-red-700 transition" onClick={() => handleDelete(userId)}>Delete</button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="hidden md:block overflow-x-auto -mx-3 md:mx-0">
              <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg shadow text-sm md:text-base">
                <thead className="bg-kmuGreen text-white">
                  <tr>
                    <th className="py-2 px-2 md:px-4 text-left">
                      <input 
                        type="checkbox" 
                        checked={selected.length === users.length && users.length > 0}
                        onChange={e => e.target.checked ? selectAll() : clearSelected()} 
                      />
                    </th>
                    <th className="py-2 px-2 md:px-4 text-left">Login Identifier</th>
                    <th className="py-2 px-2 md:px-4 text-left hidden sm:table-cell">Name</th>
                    <th className="py-2 px-2 md:px-4 text-left hidden lg:table-cell">Email</th>
                    <th className="py-2 px-2 md:px-4 text-left">Role</th>
                    <th className="py-2 px-2 md:px-4 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const userId = u.id || u._id || "";
                    const isEditing = editingUserId === userId;
                    
                    return (
                      <tr key={userId} className="border-b border-gray-200 dark:border-gray-600">
                        <td className="py-2 px-2 md:px-4">
                          <input 
                            type="checkbox" 
                            checked={selected.includes(userId)} 
                            onChange={() => userId && toggleSelect(userId)} 
                          />
                        </td>
                        {isEditing && editUser ? (
                          <>
                            <td className="py-2 px-2 md:px-4">
                              {editUser.role === 'student' ? (
                                <input
                                  type="text"
                                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                  value={editUser.username}
                                  onChange={e => setEditUser((eu: any) => ({ ...eu, username: e.target.value }))}
                                  placeholder="Student ID"
                                />
                              ) : (
                                <span className="text-sm text-gray-500 dark:text-gray-400">{editUser.email || 'Email required'}</span>
                              )}
                            </td>
                            <td className="py-2 px-2 md:px-4 hidden sm:table-cell">
                              <input 
                                type="text" 
                                className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" 
                                value={editUser.name} 
                                onChange={e => setEditUser((eu: any) => ({ ...eu, name: e.target.value }))} 
                              />
                            </td>
                            <td className="py-2 px-2 md:px-4 hidden lg:table-cell">
                              <input
                                type="email"
                                className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                value={editUser.email || ''}
                                onChange={e => setEditUser((eu: any) => ({ ...eu, email: e.target.value }))}
                              />
                            </td>
                            <td className="py-2 px-2 md:px-4">
                              <select 
                                className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" 
                                value={editUser.role} 
                                onChange={e => setEditUser((eu: any) => ({ ...eu, role: e.target.value }))}
                              >
                                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                              </select>
                              {editUser.role === 'warden' && (
                                <input
                                  type="text"
                                  className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                  value={editUser.hostel || ''}
                                  onChange={e => setEditUser((eu: any) => ({ ...eu, hostel: e.target.value }))}
                                  placeholder="Hostel"
                                  required
                                />
                              )}
                            </td>
                            <td className="py-2 px-2 md:px-4">
                              <div className="flex flex-col sm:flex-row gap-1">
                                <button 
                                  className="bg-kmuGreen text-white px-2 py-1 rounded text-xs hover:bg-kmuOrange transition" 
                                  onClick={handleEdit}
                                >
                                  Save
                                </button>
                                <button 
                                  className="bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs hover:bg-gray-400 dark:hover:bg-gray-500 transition" 
                                  onClick={cancelEdit}
                                >
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-2 px-2 md:px-4 text-gray-900 dark:text-white">
                              <div className="font-medium">{getLoginIdentifier(u)}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 sm:hidden">{u.name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 lg:hidden">{u.email || 'No email set'}</div>
                            </td>
                            <td className="py-2 px-2 md:px-4 text-gray-900 dark:text-white hidden sm:table-cell">{u.name}</td>
                            <td className="py-2 px-2 md:px-4 text-gray-900 dark:text-white hidden lg:table-cell">{u.email || 'No email set'}</td>
                            <td className="py-2 px-2 md:px-4 text-gray-900 dark:text-white">
                              <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                                {u.role}
                              </span>
                              {u.role === 'warden' && u.hostel && (
                                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{u.hostel}</div>
                              )}
                            </td>
                            <td className="py-2 px-2 md:px-4">
                              <div className="flex flex-col sm:flex-row gap-1">
                                <button 
                                  className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 transition" 
                                  onClick={() => startEdit(u)}
                                >
                                  Edit
                                </button>
                                <button 
                                  className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 transition" 
                                  onClick={() => handleDelete(userId)}
                                >
                                  Delete
                                </button>
                                <button
                                  className="bg-amber-600 text-white px-2 py-1 rounded text-xs hover:bg-amber-700 transition"
                                  onClick={() => openResetPasswordDialog(u)}
                                >
                                  Reset Password
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>

        {confirmDialog}

        {resetPasswordUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
            <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
              <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Reset Password</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Set a new temporary password for <span className="font-semibold text-gray-700 dark:text-gray-200">{resetPasswordUser.username}</span>.
                </p>
              </div>
              <form onSubmit={handleAdminResetPassword} className="space-y-4 px-6 py-5">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Temporary Password</label>
                  <input
                    type="password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-kmuGreen focus:outline-none focus:ring-2 focus:ring-kmuGreen/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    placeholder="Minimum 6 characters"
                    minLength={6}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Temporary Password</label>
                  <input
                    type="password"
                    value={resetPasswordConfirm}
                    onChange={(e) => setResetPasswordConfirm(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-kmuGreen focus:outline-none focus:ring-2 focus:ring-kmuGreen/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    placeholder="Re-enter temporary password"
                    minLength={6}
                    required
                  />
                </div>
                <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                  Share this temporary password securely. The user can change it after signing in.
                </div>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeResetPasswordDialog}
                    disabled={resettingPassword}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resettingPassword}
                    className="rounded-lg bg-kmuGreen px-4 py-2 text-sm font-semibold text-white transition hover:bg-kmuOrange disabled:opacity-60"
                  >
                    {resettingPassword ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
  );
}
