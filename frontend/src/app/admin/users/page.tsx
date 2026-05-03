"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { getAll, register, update, remove, exportDocx, exportExcel } from '../../../utils/api';
import { canAccessPage } from '../../../utils/access';
import { PageSkeleton, TableSkeleton } from '../../../components/PageSkeleton';


const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'security_officer', label: 'Security Officer' },
  { value: 'chief_security_officer', label: 'Chief Security Officer' },
  { value: 'dean_of_students', label: 'Dean of Students' },
  { value: 'assistant_dean', label: 'Assistant Dean' },
  { value: 'secretary', label: 'Secretary' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'student', label: 'Student' },
  { value: 'general_user', label: 'General User' },
];

export default function UserManagementPage() {
  const { token, user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<any | null>(null);
  const [newUser, setNewUser] = useState({ username: '', name: '', password: '', role: 'security_officer' });
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (!authLoading && !token) {
      router.replace('/login');
    }
  }, [authLoading, token, router]);

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const query: Record<string, string> = {};
      if (search) query.search = search;
      if (roleFilter) query.role = roleFilter;
      const data = await getAll('users', query);
      setUsers(Array.isArray(data) ? data : (data.users || data || []));
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { 
    if (user && canAccessPage(user.role, 'adminUsers')) {
      fetchUsers(); 
    }
  }, [token, user, search, roleFilter]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await register(newUser.username, newUser.password, newUser.name, newUser.role);
      setSuccess('User created successfully!');
      setShowCreate(false);
      setNewUser({ username: '', name: '', password: '', role: 'security_officer' });
      fetchUsers();
    } catch (err: any) {
      console.error('Error creating user:', err);
      setError(err.message || 'Failed to create user');
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await update('users', editUser.id || editUser._id, { 
        username: editUser.username, 
        name: editUser.name, 
        role: editUser.role 
      });
      setSuccess('User updated successfully!');
      setEditUser(null);
      setEditingUserId(null);
      fetchUsers();
    } catch (err: any) {
      console.error('Error updating user:', err);
      setError(err.message || 'Failed to update user');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    setError(null);
    setSuccess(null);
    try {
      await remove('users', id);
      setSuccess('User deleted successfully!');
      fetchUsers();
    } catch (err: any) {
      console.error('Error deleting user:', err);
      setError(err.message || 'Failed to delete user');
    }
  }

  function startEdit(user: any) {
    setEditingUserId(user.id || user._id);
    setEditUser({ ...user });
  }

  function cancelEdit() {
    setEditingUserId(null);
    setEditUser(null);
  }

  function toggleSelect(id: string) {
    setSelected(sel => sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]);
  }

  function selectAll() {
    setSelected(users.map(u => u.id || u._id));
  }

  function clearSelected() {
    setSelected([]);
  }

  async function handleBulkDelete() {
    if (!window.confirm('Delete selected users?')) return;
    for (const id of selected) {
      await remove('users', id);
    }
    setUsers(users => users.filter(u => !selected.includes(u.id || u._id)));
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
      ['security_officer', 'chief_security_officer', 'dean_of_students', 'assistant_dean', 'secretary', 'maintenance'].includes(account.role)
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
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-kmuGreen">User Management</h1>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {userStats.map((stat) => (
            <div key={stat.label} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${stat.tone}`}>
                {stat.label}
              </div>
              <div className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Create User Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <button 
            className="mb-4 bg-kmuGreen text-white px-4 py-2 rounded hover:bg-kmuOrange transition" 
            onClick={() => setShowCreate(!showCreate)}
          >
            {showCreate ? 'Cancel' : 'Add New User'}
          </button>
          {showCreate && (
            <form className="mb-6 space-y-4" onSubmit={handleCreate}>
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1">Username</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                  value={newUser.username} 
                  onChange={e => setNewUser(u => ({ ...u, username: e.target.value }))} 
                  required 
                />
              </div>
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                  value={newUser.name} 
                  onChange={e => setNewUser(u => ({ ...u, name: e.target.value }))} 
                  required 
                />
              </div>
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1">Password</label>
                <input 
                  type="password" 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                  value={newUser.password} 
                  onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))} 
                  required 
                />
              </div>
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1">Role</label>
                <select 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                  value={newUser.role} 
                  onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))} 
                  required
                >
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <button type="submit" className="bg-kmuGreen text-white px-4 py-2 rounded hover:bg-kmuOrange transition">
                Create User
              </button>
            </form>
          )}
        </div>

        {/* Messages */}
        {success && <div className="text-kmuGreen text-sm mb-2 bg-green-100 dark:bg-green-900/20 p-2 rounded">{success}</div>}
        {error && <div className="text-red-600 text-sm mb-2 bg-red-100 dark:bg-red-900/20 p-2 rounded">{error}</div>}

        {/* Filters and Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6 mb-6">
          <div className="mb-4 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="text"
                placeholder="Search by username or name"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
              <select 
                value={roleFilter} 
                onChange={e => setRoleFilter(e.target.value)} 
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="">All Roles</option>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              <button type="button" className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-2 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-600" onClick={selectAll}>
                Select All
              </button>
              <button type="button" className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-2 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-600" onClick={clearSelected}>
                Clear
              </button>
              {selected.length > 0 && (
                <>
                  <button type="button" className="bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700" onClick={handleBulkDelete}>
                    Delete Selected
                  </button>
                  <button type="button" className="bg-kmuGreen text-white px-3 py-2 rounded text-sm hover:bg-kmuOrange" onClick={handleBulkExport}>
                    Export Selected (Word)
                  </button>
                  <button type="button" className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700" onClick={handleBulkExportExcel}>
                    Export Selected (Excel)
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Users Table */}
          {loading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : (
            <>
            <div className="space-y-4 md:hidden">
              {users.map((u) => {
                const userId = u.id || u._id;
                const isEditing = editingUserId === userId;

                return (
                  <div key={userId} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selected.includes(userId)}
                        onChange={() => toggleSelect(userId)}
                        className="mt-1"
                      />
                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <div className="space-y-3">
                            <input
                              type="text"
                              className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                              value={editUser.username}
                              onChange={e => setEditUser((eu: any) => ({ ...eu, username: e.target.value }))}
                            />
                            <input
                              type="text"
                              className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                              value={editUser.name}
                              onChange={e => setEditUser((eu: any) => ({ ...eu, name: e.target.value }))}
                            />
                            <select
                              className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                              value={editUser.role}
                              onChange={e => setEditUser((eu: any) => ({ ...eu, role: e.target.value }))}
                            >
                              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              <button type="button" className="bg-kmuGreen text-white px-3 py-2 rounded text-xs" onClick={handleEdit}>Save</button>
                              <button type="button" className="bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-2 rounded text-xs" onClick={cancelEdit}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="font-medium text-gray-900 dark:text-white">{u.username}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">{u.name}</div>
                            <div className="mt-2">
                              <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                                {u.role}
                              </span>
                            </div>
                            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                              <button type="button" className="bg-blue-500 text-white px-3 py-2 rounded text-xs hover:bg-blue-600 transition" onClick={() => startEdit(u)}>Edit</button>
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
                    <th className="py-2 px-2 md:px-4 text-left">Username</th>
                    <th className="py-2 px-2 md:px-4 text-left hidden sm:table-cell">Name</th>
                    <th className="py-2 px-2 md:px-4 text-left">Role</th>
                    <th className="py-2 px-2 md:px-4 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const userId = u.id || u._id;
                    const isEditing = editingUserId === userId;
                    
                    return (
                      <tr key={userId} className="border-b border-gray-200 dark:border-gray-600">
                        <td className="py-2 px-2 md:px-4">
                          <input 
                            type="checkbox" 
                            checked={selected.includes(userId)} 
                            onChange={() => toggleSelect(userId)} 
                          />
                        </td>
                        {isEditing ? (
                          <>
                            <td className="py-2 px-2 md:px-4">
                              <input 
                                type="text" 
                                className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" 
                                value={editUser.username} 
                                onChange={e => setEditUser((eu: any) => ({ ...eu, username: e.target.value }))} 
                              />
                            </td>
                            <td className="py-2 px-2 md:px-4 hidden sm:table-cell">
                              <input 
                                type="text" 
                                className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" 
                                value={editUser.name} 
                                onChange={e => setEditUser((eu: any) => ({ ...eu, name: e.target.value }))} 
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
                              <div className="font-medium">{u.username}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 sm:hidden">{u.name}</div>
                            </td>
                            <td className="py-2 px-2 md:px-4 text-gray-900 dark:text-white hidden sm:table-cell">{u.name}</td>
                            <td className="py-2 px-2 md:px-4 text-gray-900 dark:text-white">
                              <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                                {u.role}
                              </span>
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
      </div>
  );
}
