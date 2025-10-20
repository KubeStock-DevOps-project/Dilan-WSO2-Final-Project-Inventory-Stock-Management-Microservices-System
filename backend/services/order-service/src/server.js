require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const winston = require("winston");

const app = express();
const PORT = process.env.PORT || 3005;

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "order-service" },
  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
    new winston.transports.Console({ format: winston.format.simple() }),
  ],
});

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    service: "order-service",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// Placeholder routes - implement full functionality as shown in other services
app.get("/api/orders", (req, res) => {
  res.json({ success: true, message: "Order service operational", data: [] });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.listen(PORT, () => {
  logger.info(`Order Service running on port ${PORT}`);
});

module.exports = app;
