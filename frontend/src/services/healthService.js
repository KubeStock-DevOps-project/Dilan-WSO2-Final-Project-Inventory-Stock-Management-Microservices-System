import axios from 'axios';
import { SERVICES } from '../utils/constants';

export const healthService = {
  checkUserService: async () => {
    try {
      const response = await axios.get(`${SERVICES.USER}/health`, { timeout: 5000 });
      return { status: 'healthy', service: 'User Service', data: response.data };
    } catch (error) {
      return { status: 'unhealthy', service: 'User Service', error: error.message };
    }
  },

  checkProductService: async () => {
    try {
      const response = await axios.get(`${SERVICES.PRODUCT}/health`, { timeout: 5000 });
      return { status: 'healthy', service: 'Product Catalog Service', data: response.data };
    } catch (error) {
      return { status: 'unhealthy', service: 'Product Catalog Service', error: error.message };
    }
  },

  checkInventoryService: async () => {
    try {
      const response = await axios.get(`${SERVICES.INVENTORY}/health`, { timeout: 5000 });
      return { status: 'healthy', service: 'Inventory Service', data: response.data };
    } catch (error) {
      return { status: 'unhealthy', service: 'Inventory Service', error: error.message };
    }
  },

  checkSupplierService: async () => {
    try {
      const response = await axios.get(`${SERVICES.SUPPLIER}/health`, { timeout: 5000 });
      return { status: 'healthy', service: 'Supplier Service', data: response.data };
    } catch (error) {
      return { status: 'unhealthy', service: 'Supplier Service', error: error.message };
    }
  },

  checkOrderService: async () => {
    try {
      const response = await axios.get(`${SERVICES.ORDER}/health`, { timeout: 5000 });
      return { status: 'healthy', service: 'Order Service', data: response.data };
    } catch (error) {
      return { status: 'unhealthy', service: 'Order Service', error: error.message };
    }
  },

  checkAllServices: async () => {
    const results = await Promise.all([
      healthService.checkUserService(),
      healthService.checkProductService(),
      healthService.checkInventoryService(),
      healthService.checkSupplierService(),
      healthService.checkOrderService(),
    ]);
    return results;
  },
};
