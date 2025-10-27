import { createContext, useContext, useState, useEffect } from "react";
import { authService } from "../services/authService";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in on mount
    const storedUser = authService.getStoredUser();
    const token = authService.getToken();

    if (storedUser && token) {
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  const login = async (credentials) => {
    try {
      const data = await authService.login(credentials);

      // Ensure user data exists
      if (!data.user) {
        throw new Error("Invalid response from server");
      }

      setUser(data.user);
      toast.success("Login successful!");

      // Redirect based on role
      const role = data.user.role;
      if (role === "admin") {
        navigate("/dashboard/admin");
      } else if (role === "warehouse_staff") {
        navigate("/dashboard/warehouse");
      } else if (role === "supplier") {
        navigate("/dashboard/supplier");
      } else {
        navigate("/products");
      }

      return data;
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || "Login failed";
      toast.error(message);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const data = await authService.register(userData);
      toast.success("Registration successful! Please login.");
      navigate("/login");
      return data;
    } catch (error) {
      const message = error.response?.data?.error || "Registration failed";
      toast.error(message);
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user,
    hasRole: (roles) => {
      if (!user) return false;
      if (Array.isArray(roles)) {
        return roles.includes(user.role);
      }
      return user.role === roles;
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
