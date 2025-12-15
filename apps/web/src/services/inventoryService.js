import apiClient from "../utils/axios";
import { API } from "../utils/constants";

export const inventoryService = {
  // Inventory
  getAllInventory: async (params) => {
    const response = await apiClient.get(API.inventory.base(), { params });
    return response.data;
  },

  getInventoryByProductId: async (productId) => {
    const response = await apiClient.get(API.inventory.byProductId(productId));
    return response.data;
  },

  // Alias for component compatibility
  getInventoryByProduct: async (productId) => {
    const response = await apiClient.get(API.inventory.byProductId(productId));
    return response.data;
  },

  getInventoryBySku: async (sku) => {
    const response = await apiClient.get(API.inventory.bySku(sku));
    return response.data;
  },

  createInventory: async (inventoryData) => {
    const response = await apiClient.post(API.inventory.base(), inventoryData);
    return response.data;
  },

  updateInventory: async (id, inventoryData) => {
    const response = await apiClient.put(API.inventory.byId(id), inventoryData);
    return response.data;
  },

  // Stock Adjustments
  adjustStock: async (adjustmentData) => {
    const response = await apiClient.post(
      API.inventory.adjust(),
      adjustmentData
    );
    return response.data;
  },

  // Stock Movements
  getStockMovements: async (params) => {
    const response = await apiClient.get(API.inventory.movements(), { params });
    return response.data;
  },

  // Reservations
  reserveStock: async (reservationData) => {
    const response = await apiClient.post(
      API.inventory.reserve(),
      reservationData
    );
    return response.data;
  },

  releaseReservation: async (releaseData) => {
    const response = await apiClient.post(API.inventory.release(), releaseData);
    return response.data;
  },

  // Alerts
  getLowStockAlerts: async () => {
    const response = await apiClient.get(API.inventory.alerts());
    return response.data;
  },

  acknowledgeAlert: async (id) => {
    const response = await apiClient.post(API.inventory.acknowledgeAlert(id));
    return response.data;
  },

  getReorderSuggestions: async () => {
    const response = await apiClient.get(API.inventory.reorderSuggestions());
    return response.data;
  },

  // Bulk operations
  bulkCheckAvailability: async (items) => {
    const response = await apiClient.post(API.inventory.bulkCheck(), { items });
    return response.data;
  },

  // Analytics
  getAnalytics: async () => {
    const response = await apiClient.get(API.inventory.analytics());
    return response.data;
  },
};
