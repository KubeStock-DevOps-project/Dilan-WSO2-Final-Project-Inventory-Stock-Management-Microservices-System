import { createApiClient } from "../utils/axios";
import { SERVICES, API_ENDPOINTS } from "../utils/constants";

const supplierApi = createApiClient(SERVICES.SUPPLIER);

export const supplierService = {
  // Suppliers
  getAllSuppliers: async (params) => {
    const response = await supplierApi.get(API_ENDPOINTS.SUPPLIERS, { params });
    return response.data;
  },

  getSupplierById: async (id) => {
    const response = await supplierApi.get(`${API_ENDPOINTS.SUPPLIERS}/${id}`);
    return response.data;
  },

  createSupplier: async (supplierData) => {
    const response = await supplierApi.post(API_ENDPOINTS.SUPPLIERS, supplierData);
    return response.data;
  },

  updateSupplier: async (id, supplierData) => {
    const response = await supplierApi.put(`${API_ENDPOINTS.SUPPLIERS}/${id}`, supplierData);
    return response.data;
  },

  deleteSupplier: async (id) => {
    const response = await supplierApi.delete(`${API_ENDPOINTS.SUPPLIERS}/${id}`);
    return response.data;
  },

  // My Profile (for supplier users)
  getMyProfile: async () => {
    const response = await supplierApi.get(`${API_ENDPOINTS.SUPPLIERS}/profile/me`);
    return response.data;
  },

  updateMyProfile: async (profileData) => {
    const response = await supplierApi.put(`${API_ENDPOINTS.SUPPLIERS}/profile/me`, profileData);
    return response.data;
  },

  // Purchase Orders
  getAllPurchaseOrders: async (params) => {
    const response = await supplierApi.get(API_ENDPOINTS.PURCHASE_ORDERS, { params });
    return response.data;
  },

  getPurchaseOrderById: async (id) => {
    const response = await supplierApi.get(`${API_ENDPOINTS.PURCHASE_ORDERS}/${id}`);
    return response.data;
  },

  createPurchaseOrder: async (orderData) => {
    const response = await supplierApi.post(API_ENDPOINTS.PURCHASE_ORDERS, orderData);
    return response.data;
  },

  updatePurchaseOrderStatus: async (id, status, notes) => {
    const response = await supplierApi.put(`${API_ENDPOINTS.PURCHASE_ORDERS}/${id}/status`, {
      status,
      notes,
    });
    return response.data;
  },

  // For suppliers to respond to requests
  getPendingRequests: async (supplierId) => {
    const response = await supplierApi.get(
      `${API_ENDPOINTS.PURCHASE_ORDERS}/supplier/${supplierId}/pending`
    );
    return response.data;
  },

  respondToRequest: async (id, response_status, notes) => {
    const response = await supplierApi.post(
      `${API_ENDPOINTS.PURCHASE_ORDERS}/${id}/supplier-response`,
      { response_status, notes }
    );
    return response.data;
  },

  // Supplier Ratings
  getSupplierRatings: async (supplierId) => {
    const response = await supplierApi.get(`${API_ENDPOINTS.SUPPLIERS}/${supplierId}/ratings`);
    return response.data;
  },

  rateSupplier: async (supplierId, ratingData) => {
    const response = await supplierApi.post(
      `${API_ENDPOINTS.SUPPLIERS}/${supplierId}/ratings`,
      ratingData
    );
    return response.data;
  },
};
