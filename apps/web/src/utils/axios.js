import axios from "axios";

/**
 * Get config value with runtime config taking precedence over build-time env
 */
const getConfig = (key, defaultValue = "") => {
  if (typeof window !== 'undefined' && window.__RUNTIME_CONFIG__ && window.__RUNTIME_CONFIG__[key]) {
    const value = window.__RUNTIME_CONFIG__[key];
    if (!value.startsWith('__') || !value.endsWith('__')) {
      return value;
    }
  }
  return import.meta.env[key] || defaultValue;
};

/**
 * Get access token from Asgardeo session storage
 * The Asgardeo SDK stores tokens in sessionStorage with a specific key pattern
 */
const getAsgardeoToken = () => {
  const clientId = getConfig('VITE_ASGARDEO_CLIENT_ID');
  
  // Try session storage first (default Asgardeo storage)
  const sessionData = sessionStorage.getItem(`session_data-instance_0`);
  if (sessionData) {
    try {
      const parsed = JSON.parse(sessionData);
      if (parsed.access_token) {
        return parsed.access_token;
      }
    } catch {
      // Parse error, try other methods
    }
  }

  // Try with client ID pattern
  const clientSessionData = sessionStorage.getItem(`session_data-${clientId}`);
  if (clientSessionData) {
    try {
      const parsed = JSON.parse(clientSessionData);
      if (parsed.access_token) {
        return parsed.access_token;
      }
    } catch {
      // Parse error
    }
  }

  // Fallback: search all session storage for Asgardeo token
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key.includes("session_data")) {
      try {
        const data = JSON.parse(sessionStorage.getItem(key));
        if (data.access_token) {
          return data.access_token;
        }
      } catch {
        // Continue searching
      }
    }
  }

  return null;
};

/**
 * Pre-configured axios instance with automatic Asgardeo token injection
 * Use this instead of plain axios for authenticated API calls
 */
const apiClient = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - inject Asgardeo token
apiClient.interceptors.request.use(
  (config) => {
    const token = getAsgardeoToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear session and redirect to login
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
