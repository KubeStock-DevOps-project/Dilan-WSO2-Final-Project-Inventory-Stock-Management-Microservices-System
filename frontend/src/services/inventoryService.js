import axios from 'axios';
import { SERVICES, API_ENDPOINTS } from '../utils/constants';

const inventoryApi = axios.create({
  baseURL: SERVICES.INVENTORY,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
inventoryApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const inventoryService = {
  // Inventory
  getAllInventory: async (params) => {
    const response = await inventoryApi.get(API_ENDPOINTS.INVENTORY.BASE, { params });
    return response.data;
  },

  getInventoryByProductId: async (productId) => {
    const response = await inventoryApi.get(`${API_ENDPOINTS.INVENTORY.BASE}/product/${productId}`);
    return response.data;
  },

  adjustStock: async (adjustmentData) => {
    const response = await inventoryApi.post(API_ENDPOINTS.INVENTORY.ADJUST, adjustmentData);
    return response.data;
  },

  reserveStock: async (reservationData) => {
    const response = await inventoryApi.post(API_ENDPOINTS.INVENTORY.RESERVE, reservationData);
    return response.data;
  },

  releaseStock: async (releaseData) => {
    const response = await inventoryApi.post(API_ENDPOINTS.INVENTORY.RELEASE, releaseData);
    return response.data;
  },

  // Stock Movements
  getStockMovements: async (params) => {
    const response = await inventoryApi.get(API_ENDPOINTS.STOCK_MOVEMENTS, { params });
    return response.data;
  },

  getStockMovementsByProductId: async (productId) => {
    const response = await inventoryApi.get(`${API_ENDPOINTS.STOCK_MOVEMENTS}/product/${productId}`);
    return response.data;
  },
};
