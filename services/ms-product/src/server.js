require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const logger = require("./config/logger");
const errorHandler = require("./middlewares/error.middleware");
const {
  metricsMiddleware,
  getMetrics,
  getContentType,
  updateDbMetrics,
} = require("./middlewares/metrics");
const pool = require("./config/database");
const { runMigrations } = require("./config/migrationRunner");
const categoryRoutes = require("./routes/category.routes");
const productRoutes = require("./routes/product.routes");
const pricingRoutes = require("./routes/pricing.routes");
const productLifecycleRoutes = require("./routes/productLifecycle.routes");

const app = express();
const PORT = process.env.PORT || 3002;

// Database configuration for migrations
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "product_catalog_db",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  ssl: process.env.DB_HOST && process.env.DB_HOST.includes('rds.amazonaws.com') ? { rejectUnauthorized: false } : false,
};

// Update database metrics every 30 seconds
setInterval(() => {
  updateDbMetrics(pool.pool);
}, 30000);

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Prometheus metrics middleware
app.use(metricsMiddleware);

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
    features: {
      dynamicPricing: true,
      lifecycleManagement: true,
      bulkDiscounts: true,
      approvalWorkflow: true,
    },
    timestamp: new Date().toISOString(),
  });
});

// Prometheus metrics endpoint
app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", getContentType());
    const metrics = await getMetrics();
    res.send(metrics);
  } catch (error) {
    logger.error("Error generating metrics", error);
    res.status(500).send("Error generating metrics");
  }
});

// Routes - gateway strips /api/product prefix before forwarding
app.use("/pricing", pricingRoutes);
app.use("/lifecycle", productLifecycleRoutes);
app.use("/categories", categoryRoutes);
app.use("/", productRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use(errorHandler);

const HOST = process.env.HOST || '127.0.0.1';

// Start server after migrations
const startServer = async () => {
  try {
    await runMigrations(dbConfig, logger);
  } catch (error) {
    logger.error("Migration failed:", error);
    process.exit(1);
  }

  const server = app.listen(PORT, HOST, () => {
    logger.info(`Product Catalog Service running on http://${HOST}:${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV}`);
    logger.info(`Metrics available at http://${HOST}:${PORT}/metrics`);
  });

  // Graceful shutdown
  const gracefulShutdown = (signal) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);

    server.close(() => {
      logger.info("HTTP server closed");

      pool.end(() => {
        logger.info("Database connections closed");
        process.exit(0);
      });
    });

    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 30000);
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
};

startServer();

module.exports = app;
