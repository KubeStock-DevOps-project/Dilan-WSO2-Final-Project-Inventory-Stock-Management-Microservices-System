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

/**
 * Simplified Asgardeo Auth Provider
 * Leverages Asgardeo SDK's built-in token handling
 */
export const AsgardeoAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Asgardeo SDK hooks - these handle all token management automatically
  const {
    state,
    signIn,
    signOut,
    getBasicUserInfo,
    getAccessToken,
    getIDToken,
  } = useAuthContext();

  /**
   * Map Asgardeo groups to application roles
   */
  const mapGroupsToRole = (groups = []) => {
    const groupsLower = groups.map(g => g.toLowerCase());
    
    if (groupsLower.some(g => g.includes("admin"))) return "admin";
    if (groupsLower.some(g => g.includes("warehouse") || g.includes("staff"))) return "warehouse_staff";
    if (groupsLower.some(g => g.includes("supplier"))) return "supplier";
    
    return "warehouse_staff"; // Default role
  };

  // Initialize user when authentication state changes
  useEffect(() => {
    const initUser = async () => {
      if (state.isAuthenticated) {
        try {
          const userInfo = await getBasicUserInfo();
          
          const mappedUser = {
            id: userInfo.sub,
            sub: userInfo.sub,
            username: userInfo.username || userInfo.email?.split("@")[0],
            email: userInfo.email,
            fullName: userInfo.displayName || userInfo.name || "",
            firstName: userInfo.givenName || "",
            lastName: userInfo.familyName || "",
            role: mapGroupsToRole(userInfo.groups),
            groups: userInfo.groups || [],
          };
          
          setUser(mappedUser);
        } catch (error) {
          console.error("Error getting user info:", error);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    initUser();
  }, [state.isAuthenticated, getBasicUserInfo]);

  // Handle post-login navigation (only once per session)
  useEffect(() => {
    if (user && !loading && !sessionStorage.getItem("has_navigated")) {
      const dashboards = {
        admin: "/dashboard/admin",
        warehouse_staff: "/dashboard/warehouse",
        supplier: "/dashboard/supplier",
      };
      
      navigate(dashboards[user.role] || "/products");
      sessionStorage.setItem("has_navigated", "true");
      toast.success(`Welcome, ${user.firstName || user.username}!`);
    }
  }, [user, loading, navigate]);

  const login = async () => {
    try {
      await signIn();
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Login failed. Please try again.");
      throw error;
    }
  };

  const logout = async () => {
    try {
      sessionStorage.removeItem("has_navigated");
      await signOut();
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Logout failed");
    }
  };

  /**
   * Open Asgardeo My Account page for profile management
   */
  const openMyAccount = () => {
    const baseUrl = import.meta.env.VITE_ASGARDEO_BASE_URL || "https://api.asgardeo.io/t/kubestock";
    const orgName = baseUrl.split("/t/")[1];
    const myAccountUrl = `https://myaccount.asgardeo.io/t/${orgName}`;
    window.open(myAccountUrl, "_blank");
  };

  /**
   * Open Asgardeo Console for user management (admin only)
   */
  const openUserManagement = () => {
    const baseUrl = import.meta.env.VITE_ASGARDEO_BASE_URL || "https://api.asgardeo.io/t/kubestock";
    const orgName = baseUrl.split("/t/")[1];
    const consoleUrl = `https://console.asgardeo.io/t/${orgName}/users`;
    window.open(consoleUrl, "_blank");
  };

  const value = {
    user,
    loading: loading || state.isLoading,
    isAuthenticated: state.isAuthenticated,
    login,
    logout,
    openMyAccount,
    openUserManagement,
    // Asgardeo SDK methods - use these directly for API calls
    getAccessToken,
    getIDToken,
    // Role checking utility
    hasRole: (roles) => {
      if (!user) return false;
      return Array.isArray(roles) ? roles.includes(user.role) : user.role === roles;
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Backward compatibility export
export const AuthProvider = AsgardeoAuthProvider;
