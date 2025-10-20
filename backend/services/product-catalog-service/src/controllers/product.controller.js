const Product = require("../models/product.model");
const logger = require("../config/logger");

class ProductController {
  async createProduct(req, res) {
    try {
      const {
        sku,
        name,
        description,
        category_id,
        size,
        color,
        unit_price,
        attributes,
      } = req.body;

      const product = await Product.create({
        sku,
        name,
        description,
        category_id,
        size,
        color,
        unit_price,
        attributes,
      });

      logger.info(`Product created: ${product.sku} - ${product.name}`);

      res.status(201).json({
        success: true,
        message: "Product created successfully",
        data: product,
      });
    } catch (error) {
      logger.error("Create product error:", error);
      res.status(500).json({
        success: false,
        message: "Error creating product",
        error: error.message,
      });
    }
  }

  async getAllProducts(req, res) {
    try {
      const { category_id, is_active, search } = req.query;

      const filters = {};
      if (category_id) filters.category_id = parseInt(category_id);
      if (is_active !== undefined) filters.is_active = is_active === "true";
      if (search) filters.search = search;

      const products = await Product.findAll(filters);

      res.json({
        success: true,
        count: products.length,
        data: products,
      });
    } catch (error) {
      logger.error("Get all products error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching products",
        error: error.message,
      });
    }
  }

  async getProductById(req, res) {
    try {
      const { id } = req.params;

      const product = await Product.findById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      logger.error("Get product by ID error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching product",
        error: error.message,
      });
    }
  }

  async getProductBySku(req, res) {
    try {
      const { sku } = req.params;

      const product = await Product.findBySku(sku);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      logger.error("Get product by SKU error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching product",
        error: error.message,
      });
    }
  }

  async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const updatedProduct = await Product.update(id, updateData);

      if (!updatedProduct) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      logger.info(
        `Product updated: ${updatedProduct.sku} - ${updatedProduct.name}`
      );

      res.json({
        success: true,
        message: "Product updated successfully",
        data: updatedProduct,
      });
    } catch (error) {
      logger.error("Update product error:", error);
      res.status(500).json({
        success: false,
        message: "Error updating product",
        error: error.message,
      });
    }
  }

  async deleteProduct(req, res) {
    try {
      const { id } = req.params;

      const deletedProduct = await Product.delete(id);

      if (!deletedProduct) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      logger.info(
        `Product deleted: ${deletedProduct.sku} - ${deletedProduct.name}`
      );

      res.json({
        success: true,
        message: "Product deleted successfully",
      });
    } catch (error) {
      logger.error("Delete product error:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting product",
        error: error.message,
      });
    }
  }

  async getProductsByIds(req, res) {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid or empty product IDs array",
        });
      }

      const products = await Product.findByIds(ids);

      res.json({
        success: true,
        count: products.length,
        data: products,
      });
    } catch (error) {
      logger.error("Get products by IDs error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching products",
        error: error.message,
      });
    }
  }
}

module.exports = new ProductController();
