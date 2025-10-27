import axios from "axios";
import { SERVICES, API_ENDPOINTS } from "../utils/constants";

const supplierApi = axios.create({
  baseURL: SERVICES.SUPPLIER,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests
supplierApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
    const response = await supplierApi.post(
      API_ENDPOINTS.SUPPLIERS,
      supplierData
    );
    return response.data;
  },

  updateSupplier: async (id, supplierData) => {
    const response = await supplierApi.put(
      `${API_ENDPOINTS.SUPPLIERS}/${id}`,
      supplierData
    );
    return response.data;
  },

  deleteSupplier: async (id) => {
    const response = await supplierApi.delete(
      `${API_ENDPOINTS.SUPPLIERS}/${id}`
    );
    return response.data;
  },

  // Purchase Orders CRUD
  getAllPurchaseOrders: async (params) => {
    const response = await supplierApi.get(API_ENDPOINTS.PURCHASE_ORDERS, {
      params,
    });
    return response.data;
  },

  getPurchaseOrderById: async (id) => {
    const response = await supplierApi.get(
      `${API_ENDPOINTS.PURCHASE_ORDERS}/${id}`
    );
    return response.data;
  },

  createPurchaseOrder: async (poData) => {
    const response = await supplierApi.post(
      API_ENDPOINTS.PURCHASE_ORDERS,
      poData
    );
    return response.data;
  },

  updatePurchaseOrder: async (id, poData) => {
    const response = await supplierApi.put(
      `${API_ENDPOINTS.PURCHASE_ORDERS}/${id}`,
      poData
    );
    return response.data;
  },

  updatePOStatus: async (id, status) => {
    const response = await supplierApi.patch(
      `${API_ENDPOINTS.PURCHASE_ORDERS}/${id}/status`,
      { status }
    );
    return response.data;
  },

  deletePurchaseOrder: async (id) => {
    const response = await supplierApi.delete(
      `${API_ENDPOINTS.PURCHASE_ORDERS}/${id}`
    );
    return response.data;
  },

  // Stats
  getPurchaseOrderStats: async () => {
    const response = await supplierApi.get(
      `${API_ENDPOINTS.PURCHASE_ORDERS}/stats`
    );
    return response.data;
  },
};
