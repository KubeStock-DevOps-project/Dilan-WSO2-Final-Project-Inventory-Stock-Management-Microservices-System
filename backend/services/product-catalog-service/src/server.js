require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const logger = require("./config/logger");
const errorHandler = require("./middlewares/error.middleware");
const categoryRoutes = require("./routes/category.routes");
const productRoutes = require("./routes/product.routes");

const app = express();
const PORT = process.env.PORT || 3002;

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
    service: "product-catalog-service",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Product Catalog Service running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
