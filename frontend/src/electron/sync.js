const { getStudents, addStudent, updateStudent, deleteStudent } = require('./lowdb');
const { API_BASE_URL } = require('../config/constants');

// Track local changes (for demo, use a simple array; in production, use a more robust queue)
let changeQueue = [];

function isOnline() {
    return typeof navigator !== 'undefined' && navigator.onLine;
}

async function syncStudents(token) {
    await pushChanges(token);
    await pullUpdates(token);
}

function queueChange(type, data, token) {
    changeQueue.push({ type, data });
    // Optionally persist queue to disk for crash safety
    if (isOnline() && token) {
        syncStudents(token);
    }
}

async function pushChanges(token) {
    for (const change of changeQueue) {
        try {
            if (change.type === 'add') {
                await fetchWithAuth(`${API_BASE_URL}/students`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(change.data),
                }, () => token, (newToken) => token = newToken);
            } else if (change.type === 'update') {
                await fetchWithAuth(`${API_BASE_URL}/students/${change.data._id || change.data.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(change.data),
                }, () => token, (newToken) => token = newToken);
            } else if (change.type === 'delete') {
                await fetchWithAuth(`${API_BASE_URL}/students/${change.data._id || change.data.id}`, {
                    method: 'DELETE',
                    headers: {},
                }, () => token, (newToken) => token = newToken);
            }
        } catch (err) {
            // If any push fails, stop and try again later
            break;
        }
    }
    // Clear queue if all succeeded
    changeQueue = [];
}

async function pullUpdates(token) {
    try {
        const res = await fetchWithAuth(`${API_BASE_URL}/students`, {
            headers: {},
        }, () => token, (newToken) => token = newToken);
        if (!res.ok) throw new Error(await res.text());
        const remoteStudents = await res.json();
        // Replace local DB with remote data
        const localStudents = await getStudents();
        for (const s of localStudents) {
            await deleteStudent(s.id || s._id);
        }
        for (const s of remoteStudents) {
            await addStudent(s);
        }
    } catch (err) {
        // Log error for debugging
        console.error('Failed to pull updates:', err);
    }
}

function setupSync(token) {
    window.addEventListener('online', () => {
        syncStudents(token);
    });
    // Initial sync if online
    if (isOnline() && token) {
        syncStudents(token);
    }
}

// Add fetchWithAuth helper
async function fetchWithAuth(url, options, getToken, setToken) {
    let token = getToken();
    let res = await fetch(url, {
        ...options,
        headers: {
            ...(options.headers || {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
    });
    if (res.status === 401) {
        // Try to refresh token
        const refreshRes = await fetch(`${API_BASE_URL}/refresh-token`, { method: 'POST', credentials: 'include' });
        if (refreshRes.ok) {
            const data = await refreshRes.json();
            if (data.token) {
                setToken(data.token);
                token = data.token;
                res = await fetch(url, {
                    ...options,
                    headers: {
                        ...(options.headers || {}),
                        Authorization: `Bearer ${token}`,
                    },
                    credentials: 'include',
                });
            }
        }
    }
    return res;
}

module.exports = { queueChange, syncStudents, setupSync };