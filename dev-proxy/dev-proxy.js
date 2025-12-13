/**
 * =============================================================================
 * KubeStock - Development Reverse Proxy (Node.js/Express)
 * =============================================================================
 * This is an alternative to nginx for local development.
 * Runs on port 5173 and routes requests to appropriate services.
 *
 * Advantages:
 * - No nginx installation required
 * - Cross-platform (works on Linux, macOS, Windows)
 * - Easy to customize with JavaScript
 * - Built-in WebSocket support for Vite HMR
 * =============================================================================
 */

import express from "express";
import http from "http";
import httpProxy from "http-proxy";

const app = express();
const proxy = httpProxy.createProxyServer({
  ws: true, // Enable WebSocket proxying for Vite HMR
  changeOrigin: true,
});

// Configuration
const PORT = (() => {
  const raw = process.env.PROXY_PORT;
  if (raw == null || raw === "") return 5173;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) throw new Error(`Invalid PROXY_PORT: ${raw}`);
  return n;
})();
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const SERVICES = {
  product: process.env.PRODUCT_SERVICE_URL || "http://localhost:3002",
  inventory: process.env.INVENTORY_SERVICE_URL || "http://localhost:3003",
  supplier: process.env.SUPPLIER_SERVICE_URL || "http://localhost:3004",
  order: process.env.ORDER_SERVICE_URL || "http://localhost:3005",
  identity: process.env.IDENTITY_SERVICE_URL || "http://localhost:3006",
};

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Gateway health check
app.get("/api/gateway/health", (req, res) => {
  res.json({ status: "healthy", gateway: "node-express" });
});

// API routes - proxy to backend services
Object.entries(SERVICES).forEach(([service, url]) => {
  app.use(`/api/${service}`, (req, res, next) => {
    // Express strips /api/<service> from req.url
    // Save original for logging
    const originalPath = req.url || "/";

    // Normalize the path for proxying
    if (!req.url || req.url === "") {
      req.url = "/";
    }

    console.log(`  → Proxying ${service}: ${originalPath} to ${url}${req.url}`);

    proxy.web(
      req,
      res,
      {
        target: url,
        changeOrigin: true,
      },
      (err) => {
        if (err) {
          console.error(`  ✗ Proxy error for ${service}:`, err.message);
          next(err);
        }
      }
    );
  });
});

// Frontend - proxy everything else to Vite dev server
app.use((req, res) => {
  proxy.web(req, res, { target: FRONTEND_URL });
});

// Create HTTP server
const server = http.createServer(app);

// WebSocket support for Vite HMR
server.on("upgrade", (req, socket, head) => {
  console.log("🔌 WebSocket upgrade:", req.url);
  socket.on("error", (e) => {
    console.error("❌ Client WS socket error:", e?.message || e);
  });
  proxy.ws(req, socket, head, { target: FRONTEND_URL });
});

// Error handling
proxy.on("error", (err, req, res) => {
  console.error("❌ Proxy error:", err.message);
  // For WS upgrades, `res` can be a net.Socket; ensure it doesn't hang.
  if (res && typeof res.destroy === "function" && !res.writableEnded) {
    res.destroy();
    return;
  }
  if (res.writeHead && !res.headersSent) {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: "Bad Gateway",
        message: err.message,
      })
    );
  }
});

// Start server
server.listen(PORT, () => {
  console.log("");
  console.log("🚀 KubeStock Development Proxy Started");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  🌐 Main Application:     http://localhost:${PORT}`);
  console.log(
    `  🔍 Gateway Health:       http://localhost:${PORT}/api/gateway/health`
  );
  console.log("");
  console.log("  📊 Backend Services:");
  Object.entries(SERVICES).forEach(([service, url]) => {
    console.log(`     • ${service.padEnd(12)}: ${url} → /api/${service}`);
  });
  console.log("");
  console.log(`  ⚛️  Frontend Dev Server: ${FRONTEND_URL}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  console.log("✨ Ready for development! Press Ctrl+C to stop.");
  console.log("");
});
