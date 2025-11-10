# API Testing Guide - Business Logic

This guide provides test scenarios for the new business logic implementation.

## Prerequisites
- All services running (user, product, inventory, order, supplier)
- Database migrations applied
- Test data available (users, products, inventory)

## Test Tools
Use any of these:
- Thunder Client (VS Code Extension)
- Postman
- PowerShell with Invoke-RestMethod
- cURL

---

## Test Scenario 1: Order Creation with Stock Reservation

### 1.1 Check Initial Inventory
```http
GET http://localhost:3003/api/inventory/product/4
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 4,
    "product_id": 4,
    "quantity": 100,
    "reserved_quantity": 0,
    "reorder_level": 10
  }
}
```

### 1.2 Create Order (Will Reserve Stock)
```http
POST http://localhost:3005/api/orders
Content-Type: application/json

{
  "customer_id": 5,
  "shipping_address": "123 Test Street, Test City",
  "payment_method": "credit_card",
  "payment_status": "paid",
  "notes": "Test order for stock reservation",
  "items": [
    {
      "product_id": 4,
      "sku": "42",
      "product_name": "Test Product",
      "quantity": 10,
      "unit_price": 100.00
    }
  ]
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": 8,
    "order_number": "ORD-...",
    "customer_id": 5,
    "status": "pending",
    "total_amount": 1110.00,
    "items": [...],
    "totals": {
      "subtotal": 1000.00,
      "tax": 100.00,
      "shipping": 10.00,
      "total": 1110.00
    }
  }
}
```

### 1.3 Verify Stock is Reserved
```http
GET http://localhost:3003/api/inventory/product/4
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 4,
    "product_id": 4,
    "quantity": 100,
    "reserved_quantity": 10,  // ← INCREASED
    "reorder_level": 10
  }
}
```

**Available Stock = 100 - 10 = 90**

### 1.4 Check Stock Movement History
```http
GET http://localhost:3003/api/inventory/history/4?limit=5
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "movement_type": "reserved",
      "quantity": -10,
      "reference_id": "8",
      "notes": "Stock reserved for order #8"
    }
  ]
}
```

---

## Test Scenario 2: Order Shipped (Stock Deduction)

### 2.1 Update Order Status to Shipped
```http
PATCH http://localhost:3005/api/orders/8/status
Content-Type: application/json

{
  "status": "shipped"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Order status updated successfully",
  "data": {
    "id": 8,
    "status": "shipped",
    ...
  }
}
```

### 2.2 Verify Stock is Deducted
```http
GET http://localhost:3003/api/inventory/product/4
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 4,
    "product_id": 4,
    "quantity": 90,  // ← DECREASED from 100
    "reserved_quantity": 0,  // ← RELEASED
    "reorder_level": 10
  }
}
```

### 2.3 Check Stock Movement History
```http
GET http://localhost:3003/api/inventory/history/4?limit=5
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "movement_type": "sale",
      "quantity": -10,
      "reference_id": "8",
      "notes": "Stock sold - Order #8 completed"
    },
    {
      "movement_type": "reserved",
      "quantity": -10,
      "reference_id": "8",
      "notes": "Stock reserved for order #8"
    }
  ]
}
```

---

## Test Scenario 3: Order Cancellation (Stock Release)

### 3.1 Create Another Order
```http
POST http://localhost:3005/api/orders
Content-Type: application/json

{
  "customer_id": 5,
  "shipping_address": "123 Test Street",
  "payment_method": "credit_card",
  "payment_status": "pending",
  "notes": "Order to be cancelled",
  "items": [
    {
      "product_id": 4,
      "sku": "42",
      "product_name": "Test Product",
      "quantity": 5,
      "unit_price": 100.00
    }
  ]
}
```

### 3.2 Check Reserved Stock
```http
GET http://localhost:3003/api/inventory/product/4
```

**Expected:**
- `quantity`: 90
- `reserved_quantity`: 5

### 3.3 Cancel the Order
```http
PATCH http://localhost:3005/api/orders/9/status
Content-Type: application/json

{
  "status": "cancelled"
}
```

### 3.4 Verify Stock is Released
```http
GET http://localhost:3003/api/inventory/product/4
```

**Expected:**
- `quantity`: 90 (unchanged)
- `reserved_quantity`: 0 (released)

---

## Test Scenario 4: Low Stock Alert

### 4.1 Check Current Stock Level
```http
GET http://localhost:3003/api/inventory/product/4
```

Note the `reorder_level` (e.g., 10)

### 4.2 Create Orders to Reduce Stock Below Reorder Level
Create multiple orders until stock goes below reorder level.

```http
POST http://localhost:3005/api/orders
{
  "customer_id": 5,
  "shipping_address": "123 Test Street",
  "payment_method": "credit_card",
  "payment_status": "paid",
  "items": [
    {
      "product_id": 4,
      "sku": "42",
      "product_name": "Test Product",
      "quantity": 85,  // Reduce stock significantly
      "unit_price": 100.00
    }
  ]
}
```

### 4.3 Ship the Order (Triggers Stock Check)
```http
PATCH http://localhost:3005/api/orders/{order_id}/status
Content-Type: application/json

{
  "status": "shipped"
}
```

### 4.4 Check Low Stock Alerts
```http
GET http://localhost:3003/api/inventory/alerts?status=active
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "product_id": 4,
      "sku": "42",
      "current_quantity": 5,
      "reorder_level": 10,
      "alert_type": "low_stock",
      "status": "active",
      "warehouse_location": "A-12",
      "created_at": "2025-11-10T..."
    }
  ]
}
```

### 4.5 Check Reorder Suggestions
```http
GET http://localhost:3003/api/inventory/reorder-suggestions?status=pending
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "product_id": 4,
      "sku": "42",
      "current_quantity": 5,
      "suggested_quantity": 95,  // max_stock_level - current
      "status": "pending",
      "created_at": "2025-11-10T..."
    }
  ]
}
```

---

## Test Scenario 5: Bulk Stock Check

### 5.1 Check Multiple Products at Once
```http
POST http://localhost:3003/api/inventory/bulk-check
Content-Type: application/json

{
  "items": [
    {
      "product_id": 4,
      "sku": "42",
      "quantity": 100
    },
    {
      "product_id": 5,
      "sku": "SKU-005",
      "quantity": 20
    }
  ]
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "allAvailable": false,
    "items": [
      {
        "product_id": 4,
        "sku": "42",
        "available": false,
        "reason": "Insufficient stock",
        "currentStock": 5,
        "requested": 100,
        "shortage": 95
      },
      {
        "product_id": 5,
        "sku": "SKU-005",
        "available": true,
        "currentStock": 50,
        "requested": 20
      }
    ],
    "unavailableItems": [
      {
        "product_id": 4,
        "sku": "42",
        "available": false,
        "reason": "Insufficient stock",
        "currentStock": 5,
        "requested": 100,
        "shortage": 95
      }
    ]
  }
}
```

---

## Test Scenario 6: Receive Stock from Supplier

### 6.1 Receive Stock
```http
POST http://localhost:3003/api/inventory/receive
Content-Type: application/json

{
  "product_id": 4,
  "quantity": 100,
  "supplier_order_id": "PO-12345",
  "notes": "Stock received from ABC Supplier"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Stock received successfully",
  "data": {
    "product_id": 4,
    "quantity": 105,  // Increased
    "reserved_quantity": 0
  }
}
```

### 6.2 Verify Low Stock Alert is Resolved
```http
GET http://localhost:3003/api/inventory/alerts?status=active
```

**Expected:** No alerts for product 4 (alert status changed to "resolved")

---

## Test Scenario 7: Inventory Analytics

### 7.1 Get Overall Analytics
```http
GET http://localhost:3003/api/inventory/analytics
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "total_products": 10,
    "total_stock": 1250,
    "total_reserved": 15,
    "low_stock_products": 2,
    "out_of_stock_products": 0,
    "avg_stock_per_product": 125.0
  }
}
```

---

## Test Scenario 8: Invalid Operations

### 8.1 Try to Create Order with Insufficient Stock
```http
POST http://localhost:3005/api/orders
Content-Type: application/json

{
  "customer_id": 5,
  "shipping_address": "123 Test Street",
  "payment_method": "credit_card",
  "payment_status": "paid",
  "items": [
    {
      "product_id": 4,
      "sku": "42",
      "product_name": "Test Product",
      "quantity": 1000,  // More than available
      "unit_price": 100.00
    }
  ]
}
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Stock not available for some items: ..."
}
```

### 8.2 Try Invalid Status Transition
```http
PATCH http://localhost:3005/api/orders/8/status
Content-Type: application/json

{
  "status": "pending"  // Try to go back from shipped to pending
}
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Invalid status transition from shipped to pending"
}
```

---

## PowerShell Test Script

```powershell
# Base URLs
$INVENTORY_URL = "http://localhost:3003/api/inventory"
$ORDER_URL = "http://localhost:3005/api/orders"

# Test 1: Create Order
$orderData = @{
    customer_id = 5
    shipping_address = "Test Address"
    payment_method = "credit_card"
    payment_status = "paid"
    notes = "PowerShell test"
    items = @(
        @{
            product_id = 4
            sku = "42"
            product_name = "Test Product"
            quantity = 10
            unit_price = 100.00
        }
    )
} | ConvertTo-Json -Depth 10

$order = Invoke-RestMethod -Uri $ORDER_URL -Method Post -Body $orderData -ContentType "application/json"
Write-Host "Order Created: $($order.data.order_number)" -ForegroundColor Green

# Test 2: Check Reserved Stock
$inventory = Invoke-RestMethod -Uri "$INVENTORY_URL/product/4" -Method Get
Write-Host "Reserved Stock: $($inventory.data.reserved_quantity)" -ForegroundColor Yellow

# Test 3: Ship Order
$orderId = $order.data.id
$statusData = @{ status = "shipped" } | ConvertTo-Json
$shipped = Invoke-RestMethod -Uri "$ORDER_URL/$orderId/status" -Method Patch -Body $statusData -ContentType "application/json"
Write-Host "Order Shipped" -ForegroundColor Green

# Test 4: Check Stock After Shipping
$inventory = Invoke-RestMethod -Uri "$INVENTORY_URL/product/4" -Method Get
Write-Host "Available Stock: $($inventory.data.quantity)" -ForegroundColor Cyan
Write-Host "Reserved Stock: $($inventory.data.reserved_quantity)" -ForegroundColor Cyan

# Test 5: Get Analytics
$analytics = Invoke-RestMethod -Uri "$INVENTORY_URL/analytics" -Method Get
Write-Host "`nInventory Analytics:" -ForegroundColor Magenta
Write-Host "Total Products: $($analytics.data.total_products)"
Write-Host "Total Stock: $($analytics.data.total_stock)"
Write-Host "Low Stock Products: $($analytics.data.low_stock_products)"
```

---

## Expected Business Logic Flow

### Order Creation:
1. ✅ Customer validated
2. ✅ Products validated and enriched
3. ✅ Stock availability checked (including reserved stock)
4. ✅ Totals calculated (subtotal + tax + shipping)
5. ✅ Order created with "pending" status
6. ✅ Order items created
7. ✅ Stock reserved in inventory
8. ✅ Stock movement logged as "reserved"

### Order Shipped:
1. ✅ Status transition validated (pending → shipped)
2. ✅ Order status updated
3. ✅ Actual stock deducted
4. ✅ Reserved stock released
5. ✅ Stock movement logged as "sale"
6. ✅ Low stock check triggered
7. ✅ Alerts and suggestions created if needed
8. ✅ Status change logged in audit trail

### Order Cancelled:
1. ✅ Status transition validated
2. ✅ Order status updated to "cancelled"
3. ✅ Reserved stock released
4. ✅ Stock movement logged as "released"
5. ✅ Status change logged

---

## Success Criteria

After running all tests, verify:

- ✅ Orders can be created successfully
- ✅ Stock is reserved when order is created
- ✅ Stock is deducted when order is shipped
- ✅ Stock is released when order is cancelled
- ✅ Low stock alerts are generated
- ✅ Reorder suggestions are created
- ✅ Stock movements are logged
- ✅ Order status history is recorded
- ✅ Invalid transitions are rejected
- ✅ Insufficient stock prevents order creation
- ✅ Analytics show accurate data

---

## Troubleshooting

### Issue: "Customer not found"
**Solution:** Ensure user with customer_id exists in user_service

### Issue: "Product not found"
**Solution:** Ensure product exists in product-catalog-service

### Issue: "Stock not available"
**Solution:** Check inventory quantity and reserved_quantity

### Issue: "Invalid status transition"
**Solution:** Follow the allowed status transitions diagram

### Issue: Services not communicating
**Solution:** 
- Check all services are running
- Verify Docker network connectivity
- Check service URLs in environment variables

---

## Monitoring

### Check Service Logs:
```bash
# Order Service
docker logs order-service --tail 50 -f

# Inventory Service
docker logs inventory-service --tail 50 -f
```

### Check Database:
```bash
# Connect to PostgreSQL
docker exec -it ims-postgres psql -U postgres -d inventory_db

# Check reserved stock
SELECT product_id, sku, quantity, reserved_quantity FROM inventory;

# Check stock alerts
SELECT * FROM stock_alerts WHERE status = 'active';

# Check order status history
docker exec -it ims-postgres psql -U postgres -d order_db
SELECT * FROM order_status_history ORDER BY changed_at DESC LIMIT 10;
```

---

## Conclusion

This testing guide covers all major business logic scenarios. Run through these tests to verify the system is working correctly with proper stock management, order workflows, and business rules enforcement.
