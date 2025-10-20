export const API_ENDPOINTS = {
  // User Service
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    PROFILE: '/api/auth/profile',
    CHANGE_PASSWORD: '/api/auth/change-password',
  },
  USERS: '/api/users',
  
  // Product Catalog Service
  PRODUCTS: {
    BASE: '/api/products',
    SEARCH: '/api/products/search',
    BY_IDS: '/api/products/by-ids',
  },
  CATEGORIES: '/api/categories',
  
  // Inventory Service
  INVENTORY: {
    BASE: '/api/inventory',
    ADJUST: '/api/inventory/adjust',
    RESERVE: '/api/inventory/reserve',
    RELEASE: '/api/inventory/release',
  },
  STOCK_MOVEMENTS: '/api/stock-movements',
  
  // Supplier Service
  SUPPLIERS: '/api/suppliers',
  PURCHASE_ORDERS: '/api/purchase-orders',
  
  // Order Service
  ORDERS: '/api/orders',
  
  // Health Checks
  HEALTH: {
    USER: '/health',
    PRODUCT: '/health',
    INVENTORY: '/health',
    SUPPLIER: '/health',
    ORDER: '/health',
  },
};

export const SERVICES = {
  USER: import.meta.env.VITE_USER_SERVICE_URL || 'http://localhost:3001',
  PRODUCT: import.meta.env.VITE_PRODUCT_SERVICE_URL || 'http://localhost:3002',
  INVENTORY: import.meta.env.VITE_INVENTORY_SERVICE_URL || 'http://localhost:3003',
  SUPPLIER: import.meta.env.VITE_SUPPLIER_SERVICE_URL || 'http://localhost:3004',
  ORDER: import.meta.env.VITE_ORDER_SERVICE_URL || 'http://localhost:3005',
};
