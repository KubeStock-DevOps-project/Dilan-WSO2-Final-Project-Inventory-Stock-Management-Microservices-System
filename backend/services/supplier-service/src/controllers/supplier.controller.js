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

  // Get supplier performance metrics
  async getSupplierPerformance(req, res) {
    try {
      const { id } = req.params;

      const supplier = await Supplier.findById(id);

      if (!supplier) {
        return res.status(404).json({
          success: false,
          message: "Supplier not found",
        });
      }

      // Calculate performance percentage
      const totalDeliveries = supplier.on_time_deliveries + supplier.late_deliveries;
      const onTimePercentage = totalDeliveries > 0
        ? ((supplier.on_time_deliveries / totalDeliveries) * 100).toFixed(2)
        : 0;

      res.json({
        success: true,
        data: {
          supplier_id: supplier.id,
          supplier_name: supplier.name,
          total_orders: supplier.total_orders,
          on_time_deliveries: supplier.on_time_deliveries,
          late_deliveries: supplier.late_deliveries,
          on_time_percentage: parseFloat(onTimePercentage),
          average_delivery_days: parseFloat(supplier.average_delivery_days || 0),
          last_delivery_date: supplier.last_delivery_date,
          rating: parseFloat(supplier.rating || 0),
        },
      });
    } catch (error) {
      logger.error(`Get supplier performance error:`, error);
      res.status(500).json({
        success: false,
        message: "Error fetching supplier performance",
        error: error.message,
      });
    }
  }

  // Get current supplier's profile (for supplier role)
  async getMyProfile(req, res) {
    try {
      const supplierId = req.user.id; // From auth middleware

      const supplier = await Supplier.findById(supplierId);

      if (!supplier) {
        return res.status(404).json({
          success: false,
          message: "Supplier profile not found",
        });
      }

      res.json({
        success: true,
        data: supplier,
      });
    } catch (error) {
      logger.error(`Get supplier profile error:`, error);
      res.status(500).json({
        success: false,
        message: "Error fetching profile",
        error: error.message,
      });
    }
  }

  // Update supplier profile (for supplier role)
  async updateMyProfile(req, res) {
    try {
      const supplierId = req.user.id; // From auth middleware
      const allowedFields = ["contact_person", "email", "phone", "address"];
      
      const updateData = {};
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: "No valid fields to update",
        });
      }

      const supplier = await Supplier.update(supplierId, updateData);

      if (!supplier) {
        return res.status(404).json({
          success: false,
          message: "Supplier profile not found",
        });
      }

      logger.info(`Supplier ${supplierId} updated their profile`);

      res.json({
        success: true,
        message: "Profile updated successfully",
        data: supplier,
      });
    } catch (error) {
      logger.error(`Update supplier profile error:`, error);
      res.status(500).json({
        success: false,
        message: "Error updating profile",
        error: error.message,
      });
    }
  }
}

module.exports = new SupplierController();
