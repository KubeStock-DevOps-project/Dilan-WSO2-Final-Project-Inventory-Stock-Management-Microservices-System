/**
 * Identity Service
 * Handles user management via Asgardeo SCIM2 proxy
 * Only admins can use these endpoints
 */
import apiClient from "../utils/axios";
import { API } from "../utils/constants";

export const identityService = {
  // ============================================
  // Supplier User Management
  // ============================================

  /**
   * Get all suppliers (users in supplier group)
   */
  listSuppliers: async () => {
    const response = await apiClient.get(API.identity.suppliers());
    return response.data;
  },

  /**
   * Create a new supplier user
   * @param {Object} supplierData - { email, firstName, lastName, phone }
   */
  createSupplier: async (supplierData) => {
    const response = await apiClient.post(
      API.identity.suppliers(),
      supplierData
    );
    return response.data;
  },

  // ============================================
  // Warehouse Staff User Management
  // ============================================

  /**
   * Get all warehouse staff (users in warehouse_staff group)
   */
  listWarehouseStaff: async () => {
    const response = await apiClient.get(API.identity.staff());
    return response.data;
  },

  /**
   * Create a new warehouse staff user
   * @param {Object} staffData - { email, firstName, lastName, phone }
   */
  createWarehouseStaff: async (staffData) => {
    const response = await apiClient.post(API.identity.staff(), staffData);
    return response.data;
  },

  // ============================================
  // Generic User Operations
  // ============================================

  /**
   * Get user by ID
   */
  getUser: async (userId) => {
    const response = await apiClient.get(API.identity.userById(userId));
    return response.data;
  },

  /**
   * Delete a user (supplier or staff)
   */
  deleteUser: async (userId) => {
    const response = await apiClient.delete(API.identity.userById(userId));
    return response.data;
  },

  // ============================================
  // Group Management
  // ============================================

  /**
   * List all groups
   */
  listGroups: async () => {
    const response = await apiClient.get(API.identity.groups());
    return response.data;
  },
};

export default identityService;
