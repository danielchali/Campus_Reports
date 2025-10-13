import { API_BASE_URL } from '../config/constants';

function getToken() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export { authHeaders };

// Generic authenticated fetch function
export async function authFetch(url: string, options: RequestInit = {}, token?: string | null) {
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : authHeaders()),
    ...options.headers,
  };

  return fetch(url, {
    ...options,
    headers,
  });
}

export async function login(username: string, password: string) {
  console.log('Attempting login to:', `${API_BASE_URL}/login`);
  try {
    const res = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    console.log('Login response status:', res.status);
    if (!res.ok) {
      const errorData = await res.json();
      console.error('Login error:', errorData);
      throw new Error(errorData.error || 'Login failed');
    }
    const data = await res.json();
    console.log('Login successful:', data);
    return data;
  } catch (error) {
    console.error('Login fetch error:', error);
    throw error;
  }
}

export async function register(username: string, password: string, name?: string, role?: string) {
  const res = await fetch(`${API_BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ username, password, name, role })
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Register failed');
  return res.json();
}

// Generic CRUD helpers
export async function getAll(resource: string) {
  const res = await fetch(`${API_BASE_URL}/${resource}`, {
    headers: { ...authHeaders() }
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Fetch failed');
  return res.json();
}

export async function getById(resource: string, id: string) {
  const res = await fetch(`${API_BASE_URL}/${resource}/${id}`, {
    headers: { ...authHeaders() }
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Fetch failed');
  return res.json();
}

export async function create(resource: string, data: any) {
  const res = await fetch(`${API_BASE_URL}/${resource}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Create failed');
  return res.json();
}

export async function update(resource: string, id: string, data: any) {
  const res = await fetch(`${API_BASE_URL}/${resource}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Update failed');
  return res.json();
}

export async function remove(resource: string, id: string) {
  const res = await fetch(`${API_BASE_URL}/${resource}/${id}`, {
    method: 'DELETE',
    headers: { ...authHeaders() }
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Delete failed');
  return res.json();
}

// Profile
export async function getProfile() {
  const res = await fetch(`${API_BASE_URL}/users/me`, {
    headers: { ...authHeaders() }
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Fetch failed');
  return res.json();
}

export async function updateProfile(data: any) {
  const res = await fetch(`${API_BASE_URL}/users/me`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Update failed');
  return res.json();
}

export async function changePassword(oldPassword: string, newPassword: string) {
  const res = await fetch(`${API_BASE_URL}/users/me/password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ oldPassword, newPassword })
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Password change failed');
  return res.json();
}

// Bulk DOCX export
export async function exportDocx(resource: string) {
  const res = await fetch(`${API_BASE_URL}/${resource}/export-docx`, {
    method: 'POST',
    headers: { ...authHeaders() }
  });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${resource}_export.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// Bulk DOCX export - List format (better for portrait paper)
export async function exportDocxList(resource: string) {
  const res = await fetch(`${API_BASE_URL}/${resource}/export-docx-list`, {
    method: 'POST',
    headers: { ...authHeaders() }
  });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${resource}_list_export.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// Bulk Excel export
export async function exportExcel(resource: string) {
  const res = await fetch(`${API_BASE_URL}/${resource}/export-excel`, {
    method: 'GET',
    headers: { ...authHeaders() }
  });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${resource}_export.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// Improved data fetching with better error handling
export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Fetch error for ${url}:`, error);
    throw error;
  }
}