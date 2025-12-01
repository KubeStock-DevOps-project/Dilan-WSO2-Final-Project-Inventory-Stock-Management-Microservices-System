export const API_ENDPOINTS = {
  // Note: User authentication is handled by Asgardeo
  // No local auth endpoints needed

  // Product Catalog Service
  PRODUCTS: {
    BASE: "/api/products",
    SEARCH: "/api/products/search",
    BY_IDS: "/api/products/by-ids",
  },
  CATEGORIES: "/api/categories",

  // Inventory Service
  INVENTORY: {
    BASE: "/api/inventory",
    ADJUST: "/api/inventory/adjust",
    RESERVE: "/api/inventory/reserve",
    RELEASE: "/api/inventory/release",
    MOVEMENTS: "/api/inventory/movements",
  },

  // Supplier Service
  SUPPLIERS: "/api/suppliers",
  PURCHASE_ORDERS: "/api/purchase-orders",

  // Order Service
  ORDERS: "/api/orders",

  // Health Checks
  HEALTH: {
    PRODUCT: "/health",
    INVENTORY: "/health",
    SUPPLIER: "/health",
    ORDER: "/health",
  },
};

export const SERVICES = {
  PRODUCT: import.meta.env.VITE_PRODUCT_SERVICE_URL || "http://localhost:3002",
  INVENTORY:
    import.meta.env.VITE_INVENTORY_SERVICE_URL || "http://localhost:3003",
  SUPPLIER:
    import.meta.env.VITE_SUPPLIER_SERVICE_URL || "http://localhost:3004",
  ORDER: import.meta.env.VITE_ORDER_SERVICE_URL || "http://localhost:3005",
};
