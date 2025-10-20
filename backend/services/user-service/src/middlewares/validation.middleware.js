const Joi = require("joi");

const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  full_name: Joi.string().min(2).max(100).optional(),
  role: Joi.string().valid("admin", "warehouse_staff", "supplier").optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const updateProfileSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(50).optional(),
  full_name: Joi.string().min(2).max(100).optional(),
});

const changePasswordSchema = Joi.object({
  current_password: Joi.string().required(),
  new_password: Joi.string().min(6).required(),
});

const createUserSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  full_name: Joi.string().min(2).max(100).optional(),
  role: Joi.string().valid("admin", "warehouse_staff", "supplier").required(),
});

const updateUserSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(50).optional(),
  email: Joi.string().email().optional(),
  full_name: Joi.string().min(2).max(100).optional(),
  role: Joi.string().valid("admin", "warehouse_staff", "supplier").optional(),
  is_active: Joi.boolean().optional(),
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
  validateRegister: validate(registerSchema),
  validateLogin: validate(loginSchema),
  validateUpdateProfile: validate(updateProfileSchema),
  validateChangePassword: validate(changePasswordSchema),
  validateCreateUser: validate(createUserSchema),
  validateUpdateUser: validate(updateUserSchema),
};
