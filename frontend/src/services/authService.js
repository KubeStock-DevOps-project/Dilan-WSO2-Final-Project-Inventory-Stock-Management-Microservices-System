import api from "../utils/axios";
import { API_ENDPOINTS } from "../utils/constants";

export const authService = {
  login: async (credentials) => {
    try {
      const response = await api.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
      console.log("Login response:", response.data); // Debug log

      // Backend returns data nested in response.data.data
      const { token, user } = response.data.data;

      if (!token || !user) {
        throw new Error("Invalid response from server - missing token or user");
      }

      if (token) {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
      }

      return { token, user };
    } catch (error) {
      console.error(
        "Login service error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  register: async (userData) => {
    const response = await api.post(API_ENDPOINTS.AUTH.REGISTER, userData);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },

  getCurrentUser: async () => {
    const response = await api.get(API_ENDPOINTS.AUTH.PROFILE);
    return response.data;
  },

  changePassword: async (passwordData) => {
    const response = await api.post(
      API_ENDPOINTS.AUTH.CHANGE_PASSWORD,
      passwordData
    );
    return response.data;
  },

  getStoredUser: () => {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  },

  getToken: () => {
    return localStorage.getItem("token");
  },

  isAuthenticated: () => {
    return !!localStorage.getItem("token");
  },
};
