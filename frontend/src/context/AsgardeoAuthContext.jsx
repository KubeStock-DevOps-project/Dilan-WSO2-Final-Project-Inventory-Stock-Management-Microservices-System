import { createContext, useContext, useState, useEffect } from "react";
import { useAuthContext } from "@asgardeo/auth-react";
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

export const AsgardeoAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Asgardeo hooks
  const {
    state,
    signIn,
    signOut,
    getBasicUserInfo,
    getIDToken,
    getAccessToken,
  } = useAuthContext();

  /**
   * Get actual JWT access token
   * Tries multiple methods to ensure we get a valid JWT
   */
  const getRealAccessToken = async () => {
    try {
      // Method 1: Try getIDToken (ID tokens are always JWTs)
      const idToken = await getIDToken();
      if (idToken && idToken.length > 100 && idToken.startsWith("ey")) {
        return idToken;
      }

      // Method 2: Check sessionStorage for access token
      const sessionData = sessionStorage.getItem(
        `session_data-${import.meta.env.VITE_ASGARDEO_CLIENT_ID}`
      );
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        if (parsed.access_token && parsed.access_token.length > 100) {
          return parsed.access_token;
        }
      }

      // Method 3: Fallback to getAccessToken()
      const accessToken = await getAccessToken();
      return accessToken;
    } catch (error) {
      console.error("Error getting access token:", error);
      return null;
    }
  };

  /**
   * Map Asgardeo groups/roles to application roles
   */
  const mapAsgardeoRoleToAppRole = (groups) => {
    if (!groups || groups.length === 0) {
      return "warehouse_staff"; // Default role
    }

    // Check for admin role
    if (groups.some((g) => g.toLowerCase().includes("admin"))) {
      return "admin";
    }

    // Check for warehouse staff
    if (
      groups.some(
        (g) =>
          g.toLowerCase().includes("warehouse") ||
          g.toLowerCase().includes("staff")
      )
    ) {
      return "warehouse_staff";
    }

    // Check for supplier
    if (groups.some((g) => g.toLowerCase().includes("supplier"))) {
      return "supplier";
    }

    return "warehouse_staff";
  };

  // Sync Asgardeo state with our user state
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (state.isAuthenticated) {
          // Get user info from Asgardeo
          const basicUserInfo = await getBasicUserInfo();

          // Get JWT access token
          const accessToken = await getRealAccessToken();

          // Map Asgardeo user to our user format
          const mappedUser = {
            id: basicUserInfo.sub,
            sub: basicUserInfo.sub, // Asgardeo unique ID
            username:
              basicUserInfo.username || basicUserInfo.email?.split("@")[0],
            email: basicUserInfo.email,
            fullName: basicUserInfo.name || "",
            role: mapAsgardeoRoleToAppRole(basicUserInfo.groups || []),
            groups: basicUserInfo.groups || [],
            asgardeoUser: basicUserInfo,
          };

          setUser(mappedUser);

          // Store token for API calls
          if (accessToken) {
            localStorage.setItem("token", accessToken);
          }
        } else {
          setUser(null);
          localStorage.removeItem("token");
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [state.isAuthenticated]);

  const login = async () => {
    try {
      await signIn();
    } catch (error) {
      console.error("Login error:", error);
      toast.error(`Login failed: ${error.message || "Please try again"}`);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut();
      setUser(null);
      localStorage.removeItem("token");
      sessionStorage.removeItem("has_navigated");
      toast.success("Logged out successfully");
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Logout failed");
    }
  };

  const updateUser = (userData) => {
    setUser((prev) => ({
      ...prev,
      ...userData,
    }));
  };

  // Handle post-login navigation
  useEffect(() => {
    if (user && !loading) {
      const hasNavigated = sessionStorage.getItem("has_navigated");

      if (!hasNavigated) {
        const role = user.role;
        if (role === "admin") {
          navigate("/dashboard/admin");
        } else if (role === "warehouse_staff") {
          navigate("/dashboard/warehouse");
        } else if (role === "supplier") {
          navigate("/dashboard/supplier");
        } else {
          navigate("/products");
        }

        sessionStorage.setItem("has_navigated", "true");
        toast.success(`Welcome back, ${user.username}!`);
      }
    }
  }, [user, loading]);

  const value = {
    user,
    loading: loading || state.isLoading,
    login,
    logout,
    updateUser,
    isAuthenticated: state.isAuthenticated,
    hasRole: (roles) => {
      if (!user) return false;
      if (Array.isArray(roles)) {
        return roles.includes(user.role);
      }
      return user.role === roles;
    },
    getAccessToken: getRealAccessToken,
    getIDToken,
    asgardeoState: state,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Backward compatibility
export const AuthProvider = AsgardeoAuthProvider;
