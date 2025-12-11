# 🚀 KubeStock Test Runner Guide

This document provides a complete overview of the **Test Runner Service**, how to use it, and how it fits into the KubeStock architecture.

---

## 1. Overview

The **Test Runner** is a dedicated microservice responsible for executing performance and reliability tests against the KubeStock application. It uses **k6**, a modern load testing tool, to simulate user traffic and verify system health.

### Key Features
*   **Web Dashboard:** Easy-to-use UI to trigger tests and view real-time logs.
*   **Smoke Tests:** Quickly verify that all microservices are "UP".
*   **Load Tests:** Simulate high user traffic to stress test the system.
*   **Direct Service Targeting:** Ability to bypass the API Gateway and test specific microservices directly.

---

## 2. Accessing the Dashboard

Once deployed (locally or in a cluster), the Test Runner Dashboard is available at:

> **URL:** `http://localhost:3007`

---

## 3. How to Run Tests

### A. Simple Mode (Gateway Testing)
*Best for: Integration testing, verifying routing rules.*

1.  Open the Dashboard.
2.  **Test Type:** Select `Smoke Test` or `Load Test`.
3.  **Target URL:** Leave as default (`http://api-gateway:80`).
4.  **Click "Start Test Run"**.

**What happens?**
The test runner sends all requests through the **API Gateway**. This simulates real external user traffic entering your system.

### B. Advanced Mode (Direct Service Testing)
*Best for: High-volume load testing, debugging specific services, bypassing rate limits.*

1.  Open the Dashboard.
2.  Click **"⚙️ Advanced: Direct Service URLs"**.
3.  Enter the internal URL for the service you want to target (e.g., `Product Service URL`).
    *   *Docker Example:* `http://ms-product:3001`
    *   *Local Example:* `http://host.docker.internal:3001`
4.  **Click "Start Test Run"**.

**What happens?**
The test runner bypasses the Gateway and sends traffic **directly** to the specific microservice container you defined.

---

## 4. Test Types Explained

### 🟢 Smoke Test (`smoke.js`)
**Goal:** Health Check.
**Behavior:**
*   Runs with **1 Virtual User (VU)**.
*   Sends a request to **Every** microservice (Product, Inventory, Supplier, Order, Identity).
*   **Pass Criteria:** All services must return a `200 OK` status.
*   **Usage:** Run this after every deployment to ensure the system is stable.

### 🔴 Load Test (`load.js`)
**Goal:** Stress / Performance Test.
**Behavior:**
*   Runs with **Multiple VUs** (configurable).
*   Aggressively hits specific endpoints to test capacity.
*   **Dynamic Targeting:**
    *   If you provide a **Product URL**, it hammers the Product Service.
    *   If you provide an **Inventory URL**, it hammers the Inventory Service.
    *   If you provide **Multiple URLs**, it randomly distributes traffic between them.
    *   **Default:** Hammers the Product Service via Gateway.
*   **Usage:** Run this to find bottlenecks or test autoscaling rules.

---

## 5. API Reference

You can also trigger tests programmatically (e.g., from CI/CD pipelines).

### `POST /api/tests/run`

**Request Body:**
```json
{
  "testType": "smoke",          // "smoke" or "load"
  "vus": 10,                    // Number of Virtual Users
  "duration": "30s",            // Duration (e.g., "10s", "5m")
  "targetUrl": "http://api-gateway:80",
  "serviceUrls": {              // Optional: For direct targeting
    "product": "http://ms-product:3001",
    "inventory": "http://ms-inventory:3002"
  }
}
```

**Response:**
```json
{
  "message": "Test started",
  "testId": "1765450222050"
}
```

### `GET /api/tests/:id/status`
Get the current status of a running test (`running`, `completed`, `failed`).

### `GET /api/tests/:id/logs`
Get the console output logs of the test execution.

---

## 6. Project Structure

The Test Runner code is located in `services/test-runner`:

*   `src/server.js`: The NodeJS/Express backend that orchestrates k6.
*   `src/public/index.html`: The Frontend Dashboard UI.
*   `src/k6/smoke.js`: The Smoke Test logic.
*   `src/k6/load.js`: The Load Test logic.
*   `Dockerfile`: Instructions for building the service image.

---

## 7. Troubleshooting

**Q: The test fails immediately with "Connection Refused".**
A: Ensure your `Target URL` is reachable from inside the Test Runner container. If you are running locally, use `host.docker.internal` instead of `localhost`.

**Q: I set a specific service URL, but it's ignored.**
A: Check which test you are running.
*   **Smoke Test:** Will prioritize checking **all** services. Direct URLs only affect the specific service call, others still go to Gateway.
*   **Load Test:** Supports dynamic targeting fully.


