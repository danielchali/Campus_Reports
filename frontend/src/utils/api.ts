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

export async function registerStudent(studentData: any) {
  const res = await fetch(`${API_BASE_URL}/student-signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(studentData)
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Student signup failed');
  return res.json();
}

// Generic CRUD helpers
export async function getAll(resource: string, query?: string | Record<string, string>) {
  let url = `${API_BASE_URL}/${resource}`;
  if (query) {
    const params = typeof query === 'string' ? query : new URLSearchParams(query).toString();
    url += `?${params}`;
  }
  const res = await fetch(url, {
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

type AssistantMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export async function chatWithAssistant(params: {
  messages: AssistantMessage[];
  systemPrompt: string;
  pathname: string;
}) {
  const { messages, systemPrompt, pathname } = params;

  const response = await fetch(`${API_BASE_URL}/ai-assistant/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ messages, systemPrompt, pathname }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'Unable to get assistant response');
  }

  return data as { reply: string; model?: string };
}

export async function streamChatWithAssistant(
  params: {
    messages: AssistantMessage[];
    systemPrompt: string;
    pathname: string;
  },
  onToken: (token: string) => void
) {
  const response = await fetch(`${API_BASE_URL}/ai-assistant/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(params),
  });

  if (!response.ok || !response.body) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error || 'Unable to stream assistant response');
  }

  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  let buffer = '';
  let fullText = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const eventBlock of events) {
      const lines = eventBlock
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const raw = line.slice(5).trim();
        if (raw === '[DONE]') return fullText;

        try {
          const payload = JSON.parse(raw);
          const token = payload?.choices?.[0]?.delta?.content;
          if (typeof token === 'string' && token.length > 0) {
            fullText += token;
            onToken(token);
          }
        } catch {
          // Ignore malformed chunks and continue streaming.
        }
      }
    }
  }

  return fullText;
}
