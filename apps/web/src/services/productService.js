import apiClient from "../utils/axios";
import { API } from "../utils/constants";

export const productService = {
  // Products
  getAllProducts: async (params) => {
    const response = await apiClient.get(API.product.base(), { params });
    return response.data;
  },

  getProductById: async (id) => {
    const response = await apiClient.get(API.product.byId(id));
    return response.data;
  },

  getProductsBySku: async (sku) => {
    const response = await apiClient.get(API.product.bySku(sku));
    return response.data;
  },

  getProductsByIds: async (ids) => {
    const response = await apiClient.post(API.product.batch(), { ids });
    return response.data;
  },

  searchProducts: async (query) => {
    const response = await apiClient.get(API.product.search(), {
      params: { q: query },
    });
    return response.data;
  },

  createProduct: async (productData) => {
    const response = await apiClient.post(API.product.base(), productData);
    return response.data;
  },

  updateProduct: async (id, productData) => {
    const response = await apiClient.put(API.product.byId(id), productData);
    return response.data;
  },

  deleteProduct: async (id) => {
    const response = await apiClient.delete(API.product.byId(id));
    return response.data;
  },

  // Categories
  getAllCategories: async () => {
    const response = await apiClient.get(API.product.categories());
    return response.data;
  },

  getCategoryById: async (id) => {
    const response = await apiClient.get(API.product.categoryById(id));
    return response.data;
  },

  createCategory: async (categoryData) => {
    const response = await apiClient.post(
      API.product.categories(),
      categoryData
    );
    return response.data;
  },

  updateCategory: async (id, categoryData) => {
    const response = await apiClient.put(
      API.product.categoryById(id),
      categoryData
    );
    return response.data;
  },

  deleteCategory: async (id) => {
    const response = await apiClient.delete(API.product.categoryById(id));
    return response.data;
  },

  // Pricing
  calculatePrice: async (productId, quantity, customerId) => {
    const response = await apiClient.post(API.product.calculatePrice(), {
      product_id: productId,
      quantity,
      customer_id: customerId,
    });
    return response.data;
  },

  // Lifecycle
  getProductsByLifecycle: async (state) => {
    const response = await apiClient.get(API.product.lifecycle(state));
    return response.data;
  },

  getProductLifecycleStats: async () => {
    const response = await apiClient.get(API.product.lifecycleStats());
    return response.data;
  },

  getPendingApprovals: async () => {
    const response = await apiClient.get(API.product.pendingApprovals());
    return response.data;
  },

  approveProduct: async (id) => {
    const response = await apiClient.post(API.product.approve(id));
    return response.data;
  },

  rejectProduct: async (id, reason) => {
    const response = await apiClient.post(API.product.reject(id), { reason });
    return response.data;
  },
};
