const logger = require("../config/logger");

const errorHandler = (err, req, res, next) => {
  logger.error("Error:", {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  if (err.code === "23505") {
    return res.status(400).json({
      success: false,
      message: "Duplicate entry",
      error: err.detail,
    });
  }

  if (err.code === "23503") {
    return res.status(400).json({
      success: false,
      message: "Referenced record not found",
      error: err.detail,
    });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;
