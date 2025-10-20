import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden opacity-10">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-white rounded-full blur-3xl"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-white rounded-full blur-3xl"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md animate-slide-up"
      >
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-orange p-6 text-white text-center">
            <h1 className="text-3xl font-bold font-poppins">IMS</h1>
            <p className="text-sm opacity-90 mt-1">Inventory Management System</p>
          </div>

          {/* Content Area */}
          <div className="p-8">
            <Outlet />
          </div>

          {/* Footer */}
          <div className="bg-dark-50 px-8 py-4 text-center">
            <p className="text-xs text-dark-500">
              © 2025 Inventory Management System. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
