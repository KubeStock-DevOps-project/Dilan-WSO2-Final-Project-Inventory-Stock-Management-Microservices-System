import { Menu, Bell, LogOut, User, ExternalLink } from "lucide-react";
import { useAuth } from "../../context/AsgardeoAuthContext";
import { useState } from "react";

const Navbar = ({ toggleSidebar }) => {
  const { user, logout, openMyAccount } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <nav className="bg-white shadow-sm border-b border-dark-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left Side */}
        <div className="flex items-center">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-dark-100 transition-colors"
          >
            <Menu size={24} className="text-dark-700" />
          </button>
          <h2 className="ml-4 text-xl font-semibold text-dark-900">
            Inventory Management System
          </h2>
        </div>

        {/* Right Side */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button className="p-2 rounded-lg hover:bg-dark-100 transition-colors relative">
            <Bell size={20} className="text-dark-700" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-dark-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-semibold text-sm">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-dark-900">
                  {user?.username}
                </p>
                <p className="text-xs text-dark-500 capitalize">
                  {user?.role?.replace("_", " ")}
                </p>
              </div>
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-dark-200 py-1 z-50">
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    openMyAccount();
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-dark-700 hover:bg-dark-50"
                >
                  <User size={16} className="mr-2" />
                  My Account
                  <ExternalLink size={12} className="ml-auto text-dark-400" />
                </button>
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    logout();
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut size={16} className="mr-2" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
