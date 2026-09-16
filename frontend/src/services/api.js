const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Perform a generic fetch request with error handling.
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  let data = null;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMessage = data?.detail || data?.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(errorMessage);
  }

  return data;
}

/* =========================================================================
   Authentication API
   ========================================================================= */

export async function apiRegister(email, password) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function apiLogin(email, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function apiGetMe(token) {
  return request('/auth/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/* =========================================================================
   Sessions API (Phase 3)
   ========================================================================= */

export async function apiCreateSession(token, title) {
  return request('/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title: title || undefined }),
  });
}

export async function apiGetSessions(token) {
  return request('/sessions', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function apiGetSession(token, sessionId) {
  return request(`/sessions/${sessionId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function apiDeleteSession(token, sessionId) {
  return request(`/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/* =========================================================================
   Health Diagnostics API
   ========================================================================= */

export async function checkBackendHealth() {
  const start = performance.now();
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      headers: {
        'Accept': 'application/json',
      },
    });
    const latency = Math.round(performance.now() - start);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return {
      success: true,
      latency,
      data,
    };
  } catch (error) {
    const latency = Math.round(performance.now() - start);
    return {
      success: false,
      latency,
      error: error.message || 'Unable to connect to backend server',
    };
  }
}
