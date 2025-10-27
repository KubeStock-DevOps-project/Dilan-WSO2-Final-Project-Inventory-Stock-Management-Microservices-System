import axios from "axios";
import { SERVICES, API_ENDPOINTS } from "../utils/constants";

const orderApi = axios.create({
  baseURL: SERVICES.ORDER,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests
orderApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const orderService = {
  // Orders CRUD
  getAllOrders: async (params) => {
    const response = await orderApi.get(API_ENDPOINTS.ORDERS, { params });
    return response.data;
  },

  getOrderById: async (id) => {
    const response = await orderApi.get(`${API_ENDPOINTS.ORDERS}/${id}`);
    return response.data;
  },

  createOrder: async (orderData) => {
    const response = await orderApi.post(API_ENDPOINTS.ORDERS, orderData);
    return response.data;
  },

  updateOrder: async (id, orderData) => {
    const response = await orderApi.put(
      `${API_ENDPOINTS.ORDERS}/${id}`,
      orderData
    );
    return response.data;
  },

  updateOrderStatus: async (id, status) => {
    const response = await orderApi.patch(
      `${API_ENDPOINTS.ORDERS}/${id}/status`,
      { status }
    );
    return response.data;
  },

  deleteOrder: async (id) => {
    const response = await orderApi.delete(`${API_ENDPOINTS.ORDERS}/${id}`);
    return response.data;
  },

  // Stats
  getOrderStats: async () => {
    const response = await orderApi.get(`${API_ENDPOINTS.ORDERS}/stats`);
    return response.data;
  },
};
