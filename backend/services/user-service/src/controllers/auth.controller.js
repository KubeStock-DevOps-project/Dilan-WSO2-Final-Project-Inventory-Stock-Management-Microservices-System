const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const logger = require("../config/logger");

class AuthController {
  async register(req, res) {
    try {
      const { username, email, password, full_name, role } = req.body;

      // Check if user already exists
      const existingUserByEmail = await User.findByEmail(email);
      if (existingUserByEmail) {
        return res.status(400).json({
          success: false,
          message: "Email already registered",
        });
      }

      const existingUserByUsername = await User.findByUsername(username);
      if (existingUserByUsername) {
        return res.status(400).json({
          success: false,
          message: "Username already taken",
        });
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, 10);

      // Create user
      const user = await User.create({
        username,
        email,
        password_hash,
        full_name,
        role: role || "warehouse_staff",
      });

      logger.info(`New user registered: ${user.email}`);

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
        },
      });
    } catch (error) {
      logger.error("Registration error:", error);
      res.status(500).json({
        success: false,
        message: "Error registering user",
        error: error.message,
      });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Check if user is active
      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          message: "Account is deactivated",
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(
        password,
        user.password_hash
      );
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
      );

      logger.info(`User logged in: ${user.email}`);

      res.json({
        success: true,
        message: "Login successful",
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
          },
        },
      });
    } catch (error) {
      logger.error("Login error:", error);
      res.status(500).json({
        success: false,
        message: "Error logging in",
        error: error.message,
      });
    }
  }

  async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          is_active: user.is_active,
          created_at: user.created_at,
        },
      });
    } catch (error) {
      logger.error("Get profile error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching profile",
        error: error.message,
      });
    }
  }

  async updateProfile(req, res) {
    try {
      const { full_name, username } = req.body;
      const userId = req.user.id;

      const updateData = {};
      if (full_name) updateData.full_name = full_name;
      if (username) updateData.username = username;

      const updatedUser = await User.update(userId, updateData);

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      logger.info(`User profile updated: ${updatedUser.email}`);

      res.json({
        success: true,
        message: "Profile updated successfully",
        data: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          full_name: updatedUser.full_name,
          role: updatedUser.role,
        },
      });
    } catch (error) {
      logger.error("Update profile error:", error);
      res.status(500).json({
        success: false,
        message: "Error updating profile",
        error: error.message,
      });
    }
  }

  async changePassword(req, res) {
    try {
      const { current_password, new_password } = req.body;
      const userId = req.user.id;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(
        current_password,
        user.password_hash
      );
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      // Hash new password
      const password_hash = await bcrypt.hash(new_password, 10);

      await User.update(userId, { password_hash });

      logger.info(`Password changed for user: ${user.email}`);

      res.json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      logger.error("Change password error:", error);
      res.status(500).json({
        success: false,
        message: "Error changing password",
        error: error.message,
      });
    }
  }
}

module.exports = new AuthController();
