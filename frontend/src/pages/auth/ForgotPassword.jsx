import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { Mail, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setError('Email is required');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Email is invalid');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Simulate API call (replace with actual forgot password API)
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setEmailSent(true);
      toast.success('Password reset instructions sent to your email');
    } catch (error) {
      toast.error('Failed to send reset email');
      console.error('Forgot password error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-dark-900 mb-2">Check Your Email</h2>
        <p className="text-dark-600 mb-6">
          We've sent password reset instructions to:
        </p>
        <p className="text-primary font-medium mb-6">{email}</p>
        <p className="text-sm text-dark-500 mb-8">
          Didn't receive the email? Check your spam folder or{' '}
          <button
            onClick={() => {
              setEmailSent(false);
              setEmail('');
            }}
            className="text-primary hover:text-primary-700 font-medium"
          >
            try again
          </button>
        </p>
        <Link to="/login">
          <Button variant="outline" className="w-full">
            Back to Login
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail size={32} className="text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-dark-900">Forgot Password?</h2>
        <p className="text-dark-600 mt-2">
          Enter your email and we'll send you instructions to reset your password
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Input
          label="Email Address"
          type="email"
          name="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError('');
          }}
          error={error}
          placeholder="Enter your email"
          required
        />

        <Button
          type="submit"
          variant="primary"
          className="w-full mb-4"
          loading={loading}
        >
          Send Reset Instructions
        </Button>

        <Link to="/login">
          <Button variant="ghost" className="w-full">
            Back to Login
          </Button>
        </Link>
      </form>
    </div>
  );
};

export default ForgotPassword;
