const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { authenticateToken } = require("../middlewares/auth.middleware");
const {
  validateRegister,
  validateLogin,
  validateUpdateProfile,
  validateChangePassword,
} = require("../middlewares/validation.middleware");

// Public routes
router.post("/register", validateRegister, authController.register);
router.post("/login", validateLogin, authController.login);

// Protected routes
router.get("/profile", authenticateToken, authController.getProfile);
router.put(
  "/profile",
  authenticateToken,
  validateUpdateProfile,
  authController.updateProfile
);
router.put(
  "/change-password",
  authenticateToken,
  validateChangePassword,
  authController.changePassword
);

module.exports = router;
