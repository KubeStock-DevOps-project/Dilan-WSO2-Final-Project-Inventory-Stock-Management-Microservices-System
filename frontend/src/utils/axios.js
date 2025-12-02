import axios from "axios";

/**
 * Get access token from Asgardeo session storage
 * The Asgardeo SDK stores tokens in sessionStorage with a specific key pattern
 */
const getAsgardeoToken = () => {
  const clientId = import.meta.env.VITE_ASGARDEO_CLIENT_ID;
  
  // Try session storage first (default Asgardeo storage)
  const sessionData = sessionStorage.getItem(`session_data-instance_0`);
  if (sessionData) {
    try {
      const parsed = JSON.parse(sessionData);
      if (parsed.access_token) {
        return parsed.access_token;
      }
    } catch (e) {
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
    } catch (e) {
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
      } catch (e) {
        // Continue searching
      }
    }
  }

  return null;
};

/**
 * Create an axios instance with automatic Asgardeo token injection
 */
export const createApiClient = (baseURL) => {
  const instance = axios.create({
    baseURL,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Request interceptor - inject Asgardeo token
  instance.interceptors.request.use(
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
  instance.interceptors.response.use(
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

  return instance;
};

export default createApiClient;
