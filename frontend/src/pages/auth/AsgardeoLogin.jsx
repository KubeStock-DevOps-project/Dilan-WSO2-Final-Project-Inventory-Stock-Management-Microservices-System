import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AsgardeoAuthContext";
import Button from "../../components/common/Button";
import { LogIn, Shield } from "lucide-react";

const Login = () => {
  const { login, loading: authLoading, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleAsgardeoLogin = async () => {
    setLoading(true);
    try {
      await login();
    } catch (error) {
      console.error("Login error:", error);
      setLoading(false);
    }
  };

  if (isAuthenticated) {
    return (
      <div className="text-center">
        <div className="mb-6">
          <Shield className="w-16 h-16 text-orange-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-dark-900">
            Already Logged In
          </h2>
          <p className="text-dark-600 mt-2">
            You are already authenticated with Asgardeo
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-dark-900">Welcome Back!</h2>
        <p className="text-dark-600 mt-2">Sign in with Asgardeo to continue</p>
      </div>

      <div className="space-y-4">
        {/* Asgardeo SSO Login Button */}
        <Button
          onClick={handleAsgardeoLogin}
          disabled={loading || authLoading}
          className="w-full flex items-center justify-center gap-2"
        >
          <Shield className="w-5 h-5" />
          {loading || authLoading ? "Redirecting..." : "Sign in with Asgardeo"}
        </Button>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-dark-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-dark-500">
              Secure authentication powered by WSO2 Asgardeo
            </span>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            About Asgardeo Authentication
          </h3>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Single Sign-On (SSO) across all services</li>
            <li>• Multi-Factor Authentication (MFA) support</li>
            <li>• Social login options (Google, GitHub, etc.)</li>
            <li>• Enterprise-grade security</li>
          </ul>
        </div>
      </div>

      {/* Help Section */}
      <div className="mt-8 text-center space-y-2">
        <p className="text-sm text-dark-600">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-orange-600 hover:text-orange-700 font-medium"
          >
            Register here
          </Link>
        </p>
        <p className="text-xs text-dark-500">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default Login;
