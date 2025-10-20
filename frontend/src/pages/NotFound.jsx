import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import Button from '../components/common/Button';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-dark-50 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold gradient-text">404</h1>
        <h2 className="text-3xl font-semibold text-dark-900 mt-4">Page Not Found</h2>
        <p className="text-dark-600 mt-2 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/">
          <Button variant="primary">
            <Home size={18} className="mr-2" />
            Go Home
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
