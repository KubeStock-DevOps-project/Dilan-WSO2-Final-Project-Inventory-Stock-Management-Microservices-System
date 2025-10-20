import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Package,
  Boxes,
  Users,
  Truck,
  ShoppingCart,
  Activity,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../utils/helpers';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { user } = useAuth();

  const menuItems = [
    {
      name: 'Dashboard',
      path: user?.role === 'admin' ? '/dashboard/admin' : user?.role === 'warehouse_staff' ? '/dashboard/warehouse' : '/dashboard/supplier',
      icon: LayoutDashboard,
      roles: ['admin', 'warehouse_staff', 'supplier'],
    },
    {
      name: 'Products',
      path: '/products',
      icon: Package,
      roles: ['admin', 'warehouse_staff', 'supplier'],
    },
    {
      name: 'Categories',
      path: '/categories',
      icon: Boxes,
      roles: ['admin', 'warehouse_staff'],
    },
    {
      name: 'Inventory',
      path: '/inventory',
      icon: Boxes,
      roles: ['admin', 'warehouse_staff'],
    },
    {
      name: 'Suppliers',
      path: '/suppliers',
      icon: Truck,
      roles: ['admin', 'warehouse_staff'],
    },
    {
      name: 'Purchase Orders',
      path: '/purchase-orders',
      icon: ShoppingCart,
      roles: ['admin', 'warehouse_staff', 'supplier'],
    },
    {
      name: 'Orders',
      path: '/orders',
      icon: ShoppingCart,
      roles: ['admin', 'warehouse_staff'],
    },
    {
      name: 'Health Monitor',
      path: '/health',
      icon: Activity,
      roles: ['admin'],
    },
  ];

  const filteredMenuItems = menuItems.filter((item) =>
    item.roles.includes(user?.role)
  );

  return (
    <div
      className={cn(
        'bg-dark-900 text-white transition-all duration-300 flex flex-col',
        isOpen ? 'w-64' : 'w-20'
      )}
    >
      {/* Logo */}
      <div className="p-6 border-b border-dark-700 flex items-center justify-between">
        {isOpen && (
          <div>
            <h1 className="text-2xl font-bold gradient-text bg-gradient-orange">IMS</h1>
            <p className="text-xs text-dark-400 mt-1">Inventory System</p>
          </div>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg hover:bg-dark-800 transition-colors"
        >
          {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-2">
          {filteredMenuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center px-4 py-3 rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-dark-300 hover:bg-dark-800 hover:text-white'
                  )
                }
              >
                <item.icon size={20} className="flex-shrink-0" />
                {isOpen && <span className="ml-3">{item.name}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User Info */}
      {isOpen && user && (
        <div className="p-4 border-t border-dark-700">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
              {user.username?.charAt(0).toUpperCase()}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{user.username}</p>
              <p className="text-xs text-dark-400 capitalize">{user.role?.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
