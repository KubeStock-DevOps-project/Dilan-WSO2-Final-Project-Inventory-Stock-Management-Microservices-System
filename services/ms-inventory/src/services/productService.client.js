const axios = require("axios");
const logger = require("../config/logger");

const PRODUCT_SERVICE_URL =
  process.env.PRODUCT_CATALOG_SERVICE_URL || process.env.PRODUCT_SERVICE_URL || "http://localhost:3002";

class ProductServiceClient {
  static async getProductById(productId) {
    try {
      const response = await axios.get(`${PRODUCT_SERVICE_URL}/${productId}`);
      return response.data.data;
    } catch (error) {
      logger.error(`Error fetching product ${productId}:`, error.message);
      throw new Error("Failed to fetch product details");
    }
  }

  static async getProductBySku(sku) {
    try {
      const response = await axios.get(`${PRODUCT_SERVICE_URL}/sku/${sku}`);
      return response.data.data;
    } catch (error) {
      logger.error(`Error fetching product with SKU ${sku}:`, error.message);
      throw new Error("Failed to fetch product details");
    }
  }

  static async getProductsByIds(productIds) {
    try {
      const response = await axios.post(`${PRODUCT_SERVICE_URL}/batch`, {
        ids: productIds,
      });
      return response.data.data;
    } catch (error) {
      logger.error("Error fetching products batch:", error.message);
      throw new Error("Failed to fetch products");
    }
  }
}

module.exports = ProductServiceClient;
