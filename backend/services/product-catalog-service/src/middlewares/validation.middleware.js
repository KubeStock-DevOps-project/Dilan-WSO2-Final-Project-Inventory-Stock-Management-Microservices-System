const Joi = require("joi");

const createCategorySchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(500).optional().allow(""),
});

const updateCategorySchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  description: Joi.string().max(500).optional().allow(""),
});

const createProductSchema = Joi.object({
  sku: Joi.string().min(2).max(50).required(),
  name: Joi.string().min(2).max(200).required(),
  description: Joi.string().max(1000).optional().allow(""),
  category_id: Joi.number().integer().positive().optional(),
  size: Joi.string().max(20).optional().allow(""),
  color: Joi.string().max(50).optional().allow(""),
  unit_price: Joi.number().positive().precision(2).required(),
  attributes: Joi.object().optional(),
});

const updateProductSchema = Joi.object({
  sku: Joi.string().min(2).max(50).optional(),
  name: Joi.string().min(2).max(200).optional(),
  description: Joi.string().max(1000).optional().allow(""),
  category_id: Joi.number().integer().positive().optional().allow(null),
  size: Joi.string().max(20).optional().allow(""),
  color: Joi.string().max(50).optional().allow(""),
  unit_price: Joi.number().positive().precision(2).optional(),
  attributes: Joi.object().optional(),
  is_active: Joi.boolean().optional(),
});

const getProductsByIdsSchema = Joi.object({
  ids: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
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
  validateCreateCategory: validate(createCategorySchema),
  validateUpdateCategory: validate(updateCategorySchema),
  validateCreateProduct: validate(createProductSchema),
  validateUpdateProduct: validate(updateProductSchema),
  validateGetProductsByIds: validate(getProductsByIdsSchema),
};
