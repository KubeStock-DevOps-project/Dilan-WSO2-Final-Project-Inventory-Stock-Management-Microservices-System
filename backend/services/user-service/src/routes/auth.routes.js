const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { authenticateAsgardeo } = require("../middlewares/asgardeo.middleware");
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
router.get("/profile", authenticateAsgardeo, authController.getProfile);
router.put(
  "/profile",
  authenticateAsgardeo,
  validateUpdateProfile,
  authController.updateProfile
);
router.put(
  "/change-password",
  authenticateAsgardeo,
  validateChangePassword,
  authController.changePassword
);

module.exports = router;
