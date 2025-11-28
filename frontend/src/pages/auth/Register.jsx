import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AsgardeoAuthContext";
import Button from "../../components/common/Button";
import { UserPlus, Shield } from "lucide-react";

const Register = () => {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleAsgardeoSignup = async () => {
    setLoading(true);
    try {
      // Redirect to Asgardeo login/signup page
      await login();
    } catch (error) {
      console.error("Registration error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary-100 rounded-full">
            <Shield className="w-8 h-8 text-primary-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-dark-900">Create Account</h2>
        <p className="text-dark-600 mt-2">
          Secure authentication with Asgardeo
        </p>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-dark-200">
        <div className="space-y-6">
          <div className="text-center p-6 bg-primary-50 rounded-lg">
            <h3 className="text-lg font-semibold text-dark-900 mb-2">
              Sign Up with Asgardeo
            </h3>
            <p className="text-dark-600 mb-4">
              This application uses WSO2 Asgardeo for secure authentication.
              Click below to create your account through Asgardeo.
            </p>
            <Button
              onClick={handleAsgardeoSignup}
              variant="primary"
              className="w-full flex items-center justify-center gap-2"
              loading={loading}
            >
              <Shield className="w-5 h-5" />
              {loading ? "Redirecting..." : "Sign Up with Asgardeo"}
            </Button>
          </div>

          <div className="text-center">
            <p className="text-dark-600">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center text-sm text-dark-500">
        <p>© 2025 Inventory Management System. All rights reserved.</p>
      </div>
    </div>
  );
};

export default Register;
