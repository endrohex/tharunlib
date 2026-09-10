/**
 * Centralized API Client
 * Wraps fetch calls with Firebase ID Token authentication for protected endpoints
 */
const api = {
  /**
   * Helper to retrieve current Firebase ID Token
   */
  async getAuthToken() {
    if (typeof firebase !== 'undefined' && firebase.auth) {
      const user = firebase.auth().currentUser;
      if (user) {
        return await user.getIdToken();
      }
    }
    return localStorage.getItem('firebase_id_token') || null;
  },

  /**
   * Core request method
   */
  async request(endpoint, options = {}) {
    const headers = options.headers || {};
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';

    const token = await this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(endpoint, config);
      const data = await response.json();

      if (!response.ok) {
        // If unauthorized, could clear token or redirect to login
        if (response.status === 401 && !window.location.pathname.includes('login.html')) {
          console.warn('Authentication expired or unauthorized');
        }
        const error = new Error(data.error || `HTTP error ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err.message);
      throw err;
    }
  },

  get(endpoint, params = {}) {
    const url = new URL(endpoint, window.location.origin);
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        url.searchParams.append(key, params[key]);
      }
    });
    return this.request(url.toString(), { method: 'GET' });
  },

  post(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  put(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  patch(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },
};
