const Supplier = require("../models/supplier.model");
const logger = require("../config/logger");

class SupplierController {
  async createSupplier(req, res) {
    try {
      const supplier = await Supplier.create(req.body);

      logger.info(`Supplier created: ${supplier.name} by user request`);

      res.status(201).json({
        success: true,
        message: "Supplier created successfully",
        data: supplier,
      });
    } catch (error) {
      logger.error("Create supplier error:", error);
      res.status(500).json({
        success: false,
        message: "Error creating supplier",
        error: error.message,
      });
    }
  }

  async getAllSuppliers(req, res) {
    try {
      const { status, search, limit } = req.query;

      const filters = {};
      if (status) filters.status = status;
      if (search) filters.search = search;
      if (limit) filters.limit = parseInt(limit);

      const suppliers = await Supplier.findAll(filters);

      logger.info(
        `Retrieved ${suppliers.length} suppliers with filters:`,
        filters
      );

      res.json({
        success: true,
        count: suppliers.length,
        data: suppliers,
      });
    } catch (error) {
      logger.error("Get all suppliers error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching suppliers",
        error: error.message,
      });
    }
  }

  async getSupplierById(req, res) {
    try {
      const { id } = req.params;

      const supplier = await Supplier.findById(id);

      if (!supplier) {
        logger.warn(`Supplier ${id} not found`);
        return res.status(404).json({
          success: false,
          message: "Supplier not found",
        });
      }

      logger.info(`Retrieved supplier ${id}`);

      res.json({
        success: true,
        data: supplier,
      });
    } catch (error) {
      logger.error(`Get supplier ${req.params.id} error:`, error);
      res.status(500).json({
        success: false,
        message: "Error fetching supplier",
        error: error.message,
      });
    }
  }

  async updateSupplier(req, res) {
    try {
      const { id } = req.params;
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        logger.warn(`Supplier ${id} update validation failed:`, errors.array());
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const supplier = await Supplier.update(id, req.body);

      if (!supplier) {
        logger.warn(`Supplier ${id} not found for update`);
        return res.status(404).json({
          success: false,
          message: "Supplier not found",
        });
      }

      logger.info(`Supplier ${id} updated successfully`);

      res.json({
        success: true,
        message: "Supplier updated successfully",
        data: supplier,
      });
    } catch (error) {
      logger.error(`Update supplier ${req.params.id} error:`, error);
      res.status(500).json({
        success: false,
        message: "Error updating supplier",
        error: error.message,
      });
    }
  }

  async deleteSupplier(req, res) {
    try {
      const { id } = req.params;

      const supplier = await Supplier.delete(id);

      if (!supplier) {
        logger.warn(`Supplier ${id} not found for deletion`);
        return res.status(404).json({
          success: false,
          message: "Supplier not found",
        });
      }

      logger.info(`Supplier ${id} deleted successfully`);

      res.json({
        success: true,
        message: "Supplier deleted successfully",
        data: supplier,
      });
    } catch (error) {
      logger.error(`Delete supplier ${req.params.id} error:`, error);
      res.status(500).json({
        success: false,
        message: "Error deleting supplier",
        error: error.message,
      });
    }
  }
}

module.exports = new SupplierController();
