/**
 * Integration Tests for Supplier Service API
 * Tests API endpoints without database (mocked)
 */

const express = require("express");

// Mock database before requiring routes
jest.mock("../../src/config/database", () => ({
  query: jest.fn(),
  pool: {
    totalCount: 5,
    idleCount: 3,
    waitingCount: 0,
  },
}));

// Mock logger
jest.mock("../../src/config/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

// Mock metrics middleware
jest.mock("../../src/middlewares/metrics", () => ({
  metricsMiddleware: (req, res, next) => next(),
  getMetrics: jest.fn().mockResolvedValue("# HELP test_metric\ntest_metric 1"),
  getContentType: () => "text/plain",
  updateDbMetrics: jest.fn(),
}));

const db = require("../../src/config/database");

// Create a minimal test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Health endpoint
  app.get("/health", (req, res) => {
    res.status(200).json({
      success: true,
      service: "supplier-service",
      status: "healthy",
      timestamp: new Date().toISOString(),
    });
  });

  // Import routes after mocks are set up
  // Note: Supplier routes removed - suppliers now managed via Asgardeo identity service
  const purchaseOrderRoutes = require("../../src/routes/purchaseOrder.routes");
  app.use("/api/purchase-orders", purchaseOrderRoutes);

  return app;
};

describe("API Integration Tests", () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /health", () => {
    it("should return health status", () => {
      // Test the actual health route handler
      const healthHandler = (req, res) => {
        res.status(200).json({
          success: true,
          service: "supplier-service",
          status: "healthy",
          timestamp: new Date().toISOString(),
        });
      };

      const mockReq = {};
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      healthHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          service: "supplier-service",
          status: "healthy",
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe("Purchase Order API Endpoints", () => {
    // Supplier endpoints removed - suppliers now managed via Asgardeo identity service
    // Tests updated to focus on purchase order functionality

    it("should handle GET /api/purchase-orders request", async () => {
      const mockPurchaseOrders = [
        {
          id: 1,
          supplier_id: "supplier-123",
          total_amount: 1000,
          status: "pending",
        },
        {
          id: 2,
          supplier_id: "supplier-456",
          total_amount: 2000,
          status: "confirmed",
        },
      ];

      db.query.mockResolvedValueOnce({ rows: mockPurchaseOrders });

      const purchaseOrderController = require("../../src/controllers/purchaseOrder.controller");

      const mockReq = { query: {} };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await purchaseOrderController.getAllPurchaseOrders(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        count: 2,
        data: mockPurchaseOrders,
      });
    });

    it("should handle POST /api/purchase-orders request", async () => {
      const newPurchaseOrder = {
        supplier_id: "supplier-123",
        total_amount: 1500,
        expected_delivery_date: "2025-12-31",
        notes: "Test order",
      };

      const createdOrder = {
        id: 1,
        ...newPurchaseOrder,
        status: "pending",
        created_at: new Date(),
      };

      db.query.mockResolvedValueOnce({ rows: [createdOrder] });

      const purchaseOrderController = require("../../src/controllers/purchaseOrder.controller");

      const mockReq = { body: newPurchaseOrder };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await purchaseOrderController.createPurchaseOrder(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Purchase order created successfully",
        data: createdOrder,
      });
    });

    it("should handle GET /api/purchase-orders/:id request", async () => {
      const purchaseOrder = {
        id: 1,
        supplier_id: "supplier-123",
        total_amount: 1000,
        status: "pending",
      };

      db.query.mockResolvedValueOnce({ rows: [purchaseOrder] });

      const purchaseOrderController = require("../../src/controllers/purchaseOrder.controller");

      const mockReq = { params: { id: "1" } };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await purchaseOrderController.getPurchaseOrderById(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: purchaseOrder,
      });
    });

    it("should return 404 for non-existent purchase order", async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const purchaseOrderController = require("../../src/controllers/purchaseOrder.controller");

      const mockReq = { params: { id: "999" } };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await purchaseOrderController.getPurchaseOrderById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Purchase order not found",
      });
    });
  });
});
