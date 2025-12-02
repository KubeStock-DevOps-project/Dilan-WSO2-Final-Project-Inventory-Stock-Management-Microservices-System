import { createApiClient } from "../utils/axios";
import { SERVICES, API_ENDPOINTS } from "../utils/constants";

const productApi = createApiClient(SERVICES.PRODUCT);

export const productService = {
  // Products
  getAllProducts: async (params) => {
    const response = await productApi.get(API_ENDPOINTS.PRODUCTS.BASE, { params });
    return response.data;
  },

  getProductById: async (id) => {
    const response = await productApi.get(`${API_ENDPOINTS.PRODUCTS.BASE}/${id}`);
    return response.data;
  },

  getProductsBySku: async (sku) => {
    const response = await productApi.get(`${API_ENDPOINTS.PRODUCTS.BASE}/sku/${sku}`);
    return response.data;
  },

  getProductsByIds: async (ids) => {
    const response = await productApi.post(API_ENDPOINTS.PRODUCTS.BY_IDS, { ids });
    return response.data;
  },

  searchProducts: async (query) => {
    const response = await productApi.get(API_ENDPOINTS.PRODUCTS.SEARCH, {
      params: { q: query },
    });
    return response.data;
  },

  createProduct: async (productData) => {
    const response = await productApi.post(API_ENDPOINTS.PRODUCTS.BASE, productData);
    return response.data;
  },

  updateProduct: async (id, productData) => {
    const response = await productApi.put(`${API_ENDPOINTS.PRODUCTS.BASE}/${id}`, productData);
    return response.data;
  },

  deleteProduct: async (id) => {
    const response = await productApi.delete(`${API_ENDPOINTS.PRODUCTS.BASE}/${id}`);
    return response.data;
  },

  // Categories
  getAllCategories: async () => {
    const response = await productApi.get(API_ENDPOINTS.CATEGORIES);
    return response.data;
  },

  getCategoryById: async (id) => {
    const response = await productApi.get(`${API_ENDPOINTS.CATEGORIES}/${id}`);
    return response.data;
  },

  createCategory: async (categoryData) => {
    const response = await productApi.post(API_ENDPOINTS.CATEGORIES, categoryData);
    return response.data;
  },

  updateCategory: async (id, categoryData) => {
    const response = await productApi.put(`${API_ENDPOINTS.CATEGORIES}/${id}`, categoryData);
    return response.data;
  },

  deleteCategory: async (id) => {
    const response = await productApi.delete(`${API_ENDPOINTS.CATEGORIES}/${id}`);
    return response.data;
  },

  // Pricing
  calculatePrice: async (productId, quantity, customerId) => {
    const response = await productApi.post("/api/pricing/calculate", {
      product_id: productId,
      quantity,
      customer_id: customerId,
    });
    return response.data;
  },

  // Lifecycle
  getProductsByLifecycle: async (state) => {
    const response = await productApi.get(`/api/products/lifecycle/${state}`);
    return response.data;
  },

  getPendingApprovals: async () => {
    const response = await productApi.get("/api/products/pending-approvals");
    return response.data;
  },

  approveProduct: async (id) => {
    const response = await productApi.post(`/api/products/${id}/approve`);
    return response.data;
  },

  rejectProduct: async (id, reason) => {
    const response = await productApi.post(`/api/products/${id}/reject`, { reason });
    return response.data;
  },
};
