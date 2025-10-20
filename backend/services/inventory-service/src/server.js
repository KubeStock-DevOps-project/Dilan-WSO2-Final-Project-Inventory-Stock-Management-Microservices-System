require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const logger = require("./config/logger");
const errorHandler = require("./middlewares/error.middleware");
const inventoryRoutes = require("./routes/inventory.routes");

const app = express();
const PORT = process.env.PORT || 3003;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });
  next();
});

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    service: "inventory-service",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/inventory", inventoryRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Inventory Service running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
