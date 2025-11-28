import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AsgardeoAuthContext";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { LogIn, Shield } from "lucide-react";

const Login = () => {
  const { login, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Redirect if already authenticated
  useEffect(() => {
    console.log("🔍 Checking auth status:", { isAuthenticated, user });
    if (isAuthenticated && user) {
      console.log("✅ User is authenticated, redirecting...");
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
    }
  }, [isAuthenticated, user, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear error for this field
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("🔐 Login form submitted");

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      console.log("❌ Validation errors:", validationErrors);
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      console.log("🚀 Calling login function...");
      await login(formData);
      console.log("✅ Login function completed");
    } catch (error) {
      console.error("❌ Login error in component:", error);
      console.error("  Error type:", typeof error);
      console.error("  Error details:", {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
      });
      setErrors({
        general: error.message || "Login failed. Please try again.",
      });
    } finally {
      setLoading(false);
      console.log("🏁 Login process finished");
    }
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-dark-900">Welcome Back!</h2>
        <p className="text-dark-600 mt-2">
          Sign in to your account to continue
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Input
          label="Email Address"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          placeholder="Enter your email"
          required
        />

        <Input
          label="Password"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          placeholder="Enter your password"
          required
        />

        <div className="flex items-center justify-between mb-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="rounded border-dark-300 text-primary focus:ring-primary"
            />
            <span className="ml-2 text-sm text-dark-600">Remember me</span>
          </label>
          <Link
            to="/forgot-password"
            className="text-sm text-primary hover:text-primary-700"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          loading={loading}
        >
          <LogIn size={18} className="mr-2" />
          Sign In
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-dark-600">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-primary hover:text-primary-700 font-medium"
          >
            Sign up
          </Link>
        </p>
      </div>

      {/* Demo Credentials */}
      <div className="mt-6 p-4 bg-dark-100 rounded-lg">
        <p className="text-xs font-semibold text-dark-700 mb-2">
          Demo Credentials:
        </p>
        <p className="text-xs text-dark-600">Email: admin@ims.com</p>
        <p className="text-xs text-dark-600">Password: admin123</p>
      </div>
    </div>
  );
};

export default Login;
