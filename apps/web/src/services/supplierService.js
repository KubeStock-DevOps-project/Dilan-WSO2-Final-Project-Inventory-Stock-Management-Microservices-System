import apiClient from "../utils/axios";
import { API } from "../utils/constants";

export const supplierService = {
  // Suppliers
  getAllSuppliers: async (params) => {
    const response = await apiClient.get(API.supplier.base(), { params });
    return response.data;
  },

  getSupplierById: async (id) => {
    const response = await apiClient.get(API.supplier.byId(id));
    return response.data;
  },

  createSupplier: async (supplierData) => {
    const response = await apiClient.post(API.supplier.base(), supplierData);
    return response.data;
  },

  updateSupplier: async (id, supplierData) => {
    const response = await apiClient.put(API.supplier.byId(id), supplierData);
    return response.data;
  },

  deleteSupplier: async (id) => {
    const response = await apiClient.delete(API.supplier.byId(id));
    return response.data;
  },

  // My Profile (for supplier users)
  getMyProfile: async () => {
    const response = await apiClient.get(API.supplier.myProfile());
    return response.data;
  },

  updateMyProfile: async (profileData) => {
    const response = await apiClient.put(API.supplier.myProfile(), profileData);
    return response.data;
  },

  // Purchase Orders
  getAllPurchaseOrders: async (params) => {
    const response = await apiClient.get(API.supplier.purchaseOrders(), {
      params,
    });
    return response.data;
  },

  getPurchaseOrderById: async (id) => {
    const response = await apiClient.get(API.supplier.purchaseOrderById(id));
    return response.data;
  },

  createPurchaseOrder: async (orderData) => {
    const response = await apiClient.post(
      API.supplier.purchaseOrders(),
      orderData
    );
    return response.data;
  },

  updatePurchaseOrder: async (id, orderData) => {
    const response = await apiClient.put(
      API.supplier.purchaseOrderById(id),
      orderData
    );
    return response.data;
  },

  deletePurchaseOrder: async (id) => {
    const response = await apiClient.delete(API.supplier.purchaseOrderById(id));
    return response.data;
  },

  updatePOStatus: async (id, status, notes) => {
    const response = await apiClient.patch(
      API.supplier.purchaseOrderStatus(id),
      { status, notes }
    );
    return response.data;
  },

  receivePurchaseOrder: async (id, data) => {
    const response = await apiClient.patch(
      API.supplier.purchaseOrderReceive(id),
      data
    );
    return response.data;
  },

  // For suppliers to respond to requests
  getPendingRequests: async (supplierId) => {
    const response = await apiClient.get(
      API.supplier.supplierPending(supplierId)
    );
    return response.data;
  },

  respondToRequest: async (id, response_status, notes) => {
    const response = await apiClient.post(API.supplier.supplierResponse(id), {
      response_status,
      notes,
    });
    return response.data;
  },

  // Supplier Ratings
  getSupplierRatings: async (supplierId) => {
    const response = await apiClient.get(API.supplier.ratings(supplierId));
    return response.data;
  },

  rateSupplier: async (supplierId, ratingData) => {
    const response = await apiClient.post(
      API.supplier.ratings(supplierId),
      ratingData
    );
    return response.data;
  },
};
