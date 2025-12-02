import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AsgardeoAuthContext";
import { Shield, Loader2 } from "lucide-react";

/**
 * Simplified Login Page
 * Just redirects to Asgardeo for authentication
 */
const Login = () => {
  const { login, isAuthenticated, loading, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const dashboards = {
        admin: "/dashboard/admin",
        warehouse_staff: "/dashboard/warehouse",
        supplier: "/dashboard/supplier",
      };
      navigate(dashboards[user.role] || "/products", { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo/Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
              <Shield className="w-8 h-8 text-orange-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Inventory Management System
            </h1>
            <p className="text-gray-500 mt-2">
              Secure authentication powered by Asgardeo
            </p>
          </div>

          {/* Login Button */}
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <Shield className="w-5 h-5" />
            Sign in with Asgardeo
          </button>

          {/* Info */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-sm text-gray-500 text-center">
              Don't have an account? Contact your administrator or{" "}
              <a
                href={`https://myaccount.asgardeo.io/t/${
                  import.meta.env.VITE_ASGARDEO_BASE_URL?.split("/t/")[1] || "kubestock"
                }/register`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-600 hover:text-orange-700 font-medium"
              >
                sign up here
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-400 mt-6">
          Protected by WSO2 Asgardeo Identity Platform
        </p>
      </div>
    </div>
  );
};

export default Login;
