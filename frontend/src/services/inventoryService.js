import axios from "axios";
import { SERVICES, API_ENDPOINTS } from "../utils/constants";

const inventoryApi = axios.create({
  baseURL: SERVICES.INVENTORY,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests
inventoryApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const inventoryService = {
  // Inventory CRUD
  createInventory: async (inventoryData) => {
    const response = await inventoryApi.post(
      API_ENDPOINTS.INVENTORY.BASE,
      inventoryData
    );
    return response.data;
  },

  getAllInventory: async (params) => {
    const response = await inventoryApi.get(API_ENDPOINTS.INVENTORY.BASE, {
      params,
    });
    return response.data;
  },

  getInventoryById: async (id) => {
    const response = await inventoryApi.get(
      `${API_ENDPOINTS.INVENTORY.BASE}/${id}`
    );
    return response.data;
  },

  getInventoryByProductId: async (productId) => {
    const response = await inventoryApi.get(
      `${API_ENDPOINTS.INVENTORY.BASE}/product/${productId}`
    );
    return response.data;
  },

  updateInventory: async (productId, updateData) => {
    const response = await inventoryApi.put(
      `${API_ENDPOINTS.INVENTORY.BASE}/product/${productId}`,
      updateData
    );
    return response.data;
  },

  deleteInventory: async (productId) => {
    const response = await inventoryApi.delete(
      `${API_ENDPOINTS.INVENTORY.BASE}/product/${productId}`
    );
    return response.data;
  },

  // Stock Operations
  adjustStock: async (adjustmentData) => {
    const response = await inventoryApi.post(
      API_ENDPOINTS.INVENTORY.ADJUST,
      adjustmentData
    );
    return response.data;
  },

  reserveStock: async (reservationData) => {
    const response = await inventoryApi.post(
      API_ENDPOINTS.INVENTORY.RESERVE,
      reservationData
    );
    return response.data;
  },

  releaseStock: async (releaseData) => {
    const response = await inventoryApi.post(
      API_ENDPOINTS.INVENTORY.RELEASE,
      releaseData
    );
    return response.data;
  },

  // Stock Movements
  getStockMovements: async (params) => {
    const response = await inventoryApi.get(API_ENDPOINTS.INVENTORY.MOVEMENTS, {
      params,
    });
    return response.data;
  },

  getStockMovementsByProductId: async (productId) => {
    const response = await inventoryApi.get(
      `${API_ENDPOINTS.INVENTORY.BASE}/product/${productId}/movements`
    );
    return response.data;
  },
};
