const logger = require("../config/logger");

const errorHandler = (err, req, res, next) => {
  logger.error("Error:", {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  // PostgreSQL unique constraint violation
  if (err.code === "23505") {
    return res.status(400).json({
      success: false,
      message: "Duplicate entry",
      error: err.detail,
    });
  }

  // PostgreSQL foreign key constraint violation
  if (err.code === "23503") {
    return res.status(400).json({
      success: false,
      message: "Referenced record not found",
      error: err.detail,
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token expired",
    });
  }

  // Default error
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;
