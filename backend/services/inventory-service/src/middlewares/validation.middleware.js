const Joi = require("joi");

const createInventorySchema = Joi.object({
  product_id: Joi.number().integer().positive().required(),
  sku: Joi.string().required(),
  quantity: Joi.number().integer().min(0).default(0),
  warehouse_location: Joi.string().max(100).optional().allow(""),
  reorder_level: Joi.number().integer().min(0).default(10),
  max_stock_level: Joi.number().integer().min(0).default(1000),
});

const adjustStockSchema = Joi.object({
  product_id: Joi.number().integer().positive().required(),
  sku: Joi.string().required(),
  movement_type: Joi.string()
    .valid("in", "out", "adjustment", "damaged", "expired", "returned")
    .required(),
  quantity: Joi.number().integer().positive().required(),
  notes: Joi.string().max(500).optional().allow(""),
  performed_by: Joi.number().integer().positive().optional(),
});

const reserveStockSchema = Joi.object({
  product_id: Joi.number().integer().positive().required(),
  quantity: Joi.number().integer().positive().required(),
});

const releaseStockSchema = Joi.object({
  product_id: Joi.number().integer().positive().required(),
  quantity: Joi.number().integer().positive().required(),
});

const updateInventorySchema = Joi.object({
  warehouse_location: Joi.string().max(100).optional(),
  reorder_level: Joi.number().integer().min(0).optional(),
  max_stock_level: Joi.number().integer().min(0).optional(),
});

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }

    next();
  };
};

module.exports = {
  validateCreateInventory: validate(createInventorySchema),
  validateAdjustStock: validate(adjustStockSchema),
  validateReserveStock: validate(reserveStockSchema),
  validateReleaseStock: validate(releaseStockSchema),
  validateUpdateInventory: validate(updateInventorySchema),
};
