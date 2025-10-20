import axios from 'axios';
import { SERVICES, API_ENDPOINTS } from '../utils/constants';

const productApi = axios.create({
  baseURL: SERVICES.PRODUCT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
productApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
};
