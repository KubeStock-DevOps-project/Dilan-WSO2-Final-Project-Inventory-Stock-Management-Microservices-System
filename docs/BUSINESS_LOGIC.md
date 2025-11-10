# Business Logic Implementation Guide

## Overview
This document describes the business logic and workflows implemented in the Inventory Management Microservices System.

## Architecture Patterns

### 1. **Microservices Communication**
- **Service-to-Service HTTP Calls**: Using Axios for synchronous communication
- **Transaction Management**: Database transactions for data consistency
- **Error Handling**: Proper rollback and error propagation

### 2. **Design Patterns Used**
- **Service Layer Pattern**: Business logic separated from controllers
- **Repository Pattern**: Data access through model layer
- **Transaction Script Pattern**: Complex business workflows in service classes

---

## Core Business Workflows

### 1. Order Processing Workflow

#### Order Creation Flow
```
1. Validate Customer → 2. Validate Products → 3. Check Stock Availability
    ↓                        ↓                           ↓
4. Calculate Totals → 5. Create Order → 6. Create Order Items
    ↓                        ↓                           ↓
7. Reserve Stock → 8. Save to Database → 9. Send Notifications
```

#### Implementation Details

**Step-by-Step Process:**

1. **Customer Validation**
   - Verify customer exists in User Service
   - Check if customer account is active
   - Prevent orders from inactive/deleted customers

2. **Product Validation & Enrichment**
   - Fetch product details from Product Catalog Service
   - Verify products are active and available
   - Auto-fill SKU and product name if not provided
   - Validate pricing against current product prices

3. **Stock Availability Check**
   - Call Inventory Service bulk check endpoint
   - Verify available stock (total - reserved) for each item
   - Return detailed unavailability information if insufficient
   - Prevent overselling

4. **Total Calculation**
   - Calculate subtotal from all items
   - Apply 10% tax
   - Add shipping (free over $100, otherwise $10)
   - Return breakdown of costs

5. **Order & Items Creation**
   - Generate unique order number: `ORD-{timestamp}-{random}`
   - Create order with `pending` status
   - Batch create all order items
   - Use database transaction for atomicity

6. **Stock Reservation**
   - Reserve stock in Inventory Service for all items
   - Prevents stock from being sold to multiple orders
   - Stock shows as "reserved" until order is shipped

7. **Post-Order Actions** (Async)
   - Send order confirmation email
   - Notify warehouse for fulfillment
   - Generate invoice
   - Update customer order history

---

### 2. Order Status Lifecycle

#### Valid Status Transitions
```
pending → confirmed → processing → shipped → delivered → completed
    ↓           ↓           ↓           ↓          ↓
  cancelled   cancelled  cancelled   returned   returned
                                          ↓
                                      refunded
```

#### Status Change Actions

| Status | Action | Inventory Impact | Description |
|--------|--------|------------------|-------------|
| **pending** | Order created | Stock reserved | Order awaiting confirmation |
| **confirmed** | Order approved | Stock remains reserved | Order accepted, ready to process |
| **processing** | Order being prepared | Stock remains reserved | Warehouse picking items |
| **shipped** | Order dispatched | **Stock deducted** | Stock actually removed from inventory |
| **delivered** | Customer received | No change | Customer has the goods |
| **completed** | Order finalized | No change | Order successfully completed |
| **cancelled** | Order cancelled | **Stock released** | Reserved stock returned to available |
| **returned** | Customer returned | **Stock returned** | Items returned to warehouse |
| **refunded** | Money refunded | No change | Customer refunded |

#### Implementation
- **Status Validation**: Only valid transitions allowed
- **Audit Trail**: All status changes logged in `order_status_history`
- **Automatic Actions**: Each status triggers specific inventory operations
- **Idempotency**: Prevents duplicate status changes

---

### 3. Inventory Management

#### Stock Reservation System

**Purpose**: Prevent overselling by reserving stock for pending orders

**How It Works:**
```javascript
Available Stock = Total Quantity - Reserved Quantity
```

**Operations:**

1. **Reserve Stock** (`/api/inventory/reserve`)
   - Called when order is created
   - Increases `reserved_quantity`
   - Stock shows as unavailable to other orders
   - Logged as "reserved" movement type

2. **Release Stock** (`/api/inventory/release`)
   - Called when order is cancelled
   - Decreases `reserved_quantity`
   - Stock becomes available again
   - Logged as "released" movement type

3. **Confirm Deduction** (`/api/inventory/confirm-deduction`)
   - Called when order is shipped
   - Decreases both `quantity` and `reserved_quantity`
   - Actual stock removal
   - Logged as "sale" movement type

4. **Return Stock** (`/api/inventory/return`)
   - Called when order is returned
   - Increases `quantity`
   - Stock added back to inventory
   - Logged as "return" movement type

#### Low Stock Management

**Automatic Low Stock Detection:**
- Triggered after every stock deduction
- Checks if `available_stock <= reorder_level`
- Creates alert in `stock_alerts` table
- Generates reorder suggestion in `reorder_suggestions` table

**Low Stock Alert Process:**
```
Stock Deducted → Check Levels → Below Threshold? → Create Alert
       ↓                                                ↓
Calculate Shortage                              Suggest Reorder
       ↓                                                ↓
Notify Purchasing                              Auto-Generate PO (optional)
```

**Reorder Calculation:**
```javascript
Suggested Reorder Quantity = max_stock_level - current_quantity
```

---

### 4. Stock Movement Tracking

**All Stock Changes Are Logged:**

| Movement Type | Description | Quantity Sign |
|--------------|-------------|---------------|
| `in` | Stock received (purchase) | + |
| `out` | Stock sold or removed | - |
| `reserved` | Reserved for order | - (virtual) |
| `released` | Reservation cancelled | + (virtual) |
| `sale` | Actual sale (order shipped) | - |
| `return` | Customer return | + |
| `purchase` | Supplier delivery | + |
| `adjustment` | Manual adjustment | +/- |
| `damage` | Damaged/lost stock | - |

**Stock Movement Log Includes:**
- Product ID and SKU
- Quantity change
- Movement type
- Reference ID (Order ID, PO ID, etc.)
- Timestamp
- Notes/reason

---

## API Endpoints

### Inventory Service - Business Logic Endpoints

#### 1. Bulk Stock Check
```http
POST /api/inventory/bulk-check
Content-Type: application/json

{
  "items": [
    {
      "product_id": 1,
      "sku": "PROD-001",
      "quantity": 10
    },
    {
      "product_id": 2,
      "sku": "PROD-002",
      "quantity": 5
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "allAvailable": false,
    "items": [
      {
        "product_id": 1,
        "sku": "PROD-001",
        "available": true,
        "currentStock": 50,
        "requested": 10
      },
      {
        "product_id": 2,
        "sku": "PROD-002",
        "available": false,
        "reason": "Insufficient stock",
        "currentStock": 3,
        "requested": 5,
        "shortage": 2
      }
    ],
    "unavailableItems": [
      {
        "product_id": 2,
        "sku": "PROD-002",
        "available": false,
        "reason": "Insufficient stock",
        "currentStock": 3,
        "requested": 5,
        "shortage": 2
      }
    ]
  }
}
```

#### 2. Reserve Stock
```http
POST /api/inventory/reserve
Content-Type: application/json

{
  "product_id": 1,
  "quantity": 10,
  "order_id": 123
}
```

#### 3. Release Reserved Stock
```http
POST /api/inventory/release
Content-Type: application/json

{
  "product_id": 1,
  "quantity": 10,
  "order_id": 123
}
```

#### 4. Confirm Stock Deduction (Order Shipped)
```http
POST /api/inventory/confirm-deduction
Content-Type: application/json

{
  "product_id": 1,
  "quantity": 10,
  "order_id": 123
}
```

#### 5. Return Stock (Order Returned)
```http
POST /api/inventory/return
Content-Type: application/json

{
  "product_id": 1,
  "quantity": 10,
  "order_id": 123
}
```

#### 6. Receive Stock from Supplier
```http
POST /api/inventory/receive
Content-Type: application/json

{
  "product_id": 1,
  "quantity": 100,
  "supplier_order_id": "PO-12345",
  "notes": "Delivery from ABC Supplier"
}
```

#### 7. Get Low Stock Alerts
```http
GET /api/inventory/alerts?status=active
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "product_id": 5,
      "sku": "PROD-005",
      "current_quantity": 5,
      "reorder_level": 10,
      "alert_type": "low_stock",
      "status": "active",
      "warehouse_location": "A-12",
      "actual_quantity": 8,
      "reserved_quantity": 3,
      "created_at": "2025-11-10T10:30:00Z"
    }
  ]
}
```

#### 8. Get Reorder Suggestions
```http
GET /api/inventory/reorder-suggestions?status=pending
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "product_id": 5,
      "sku": "PROD-005",
      "current_quantity": 5,
      "suggested_quantity": 95,
      "status": "pending",
      "created_at": "2025-11-10T10:30:00Z"
    }
  ]
}
```

#### 9. Get Inventory Analytics
```http
GET /api/inventory/analytics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_products": 150,
    "total_stock": 5430,
    "total_reserved": 230,
    "low_stock_products": 12,
    "out_of_stock_products": 3,
    "avg_stock_per_product": 36.2
  }
}
```

#### 10. Get Stock History
```http
GET /api/inventory/history/5?limit=50
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 145,
      "product_id": 5,
      "quantity": -10,
      "movement_type": "sale",
      "reference_id": "123",
      "notes": "Stock sold - Order #123 completed",
      "created_at": "2025-11-10T10:30:00Z"
    },
    {
      "id": 144,
      "product_id": 5,
      "quantity": -10,
      "movement_type": "reserved",
      "reference_id": "123",
      "notes": "Stock reserved for order #123",
      "created_at": "2025-11-10T10:25:00Z"
    }
  ]
}
```

---

### Order Service - Enhanced Endpoints

#### 1. Create Order (With Business Logic)
```http
POST /api/orders
Content-Type: application/json

{
  "customer_id": 5,
  "shipping_address": "123 Main St, City, Country",
  "payment_method": "credit_card",
  "payment_status": "paid",
  "notes": "Leave at front door",
  "items": [
    {
      "product_id": 4,
      "sku": "PROD-004",
      "product_name": "Widget Pro",
      "quantity": 10,
      "unit_price": 100.00
    }
  ]
}
```

**What Happens:**
1. ✅ Validates customer exists and is active
2. ✅ Validates products exist and are available
3. ✅ Checks stock availability (including reserved stock)
4. ✅ Calculates accurate totals (subtotal + tax + shipping)
5. ✅ Creates order with "pending" status
6. ✅ Creates order items
7. ✅ Reserves stock in inventory
8. ✅ Returns complete order with breakdown

**Response:**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": 123,
    "order_number": "ORD-1699876543000-8NJADGTGA",
    "customer_id": 5,
    "status": "pending",
    "total_amount": 1110.00,
    "items": [
      {
        "id": 234,
        "order_id": 123,
        "product_id": 4,
        "sku": "PROD-004",
        "product_name": "Widget Pro",
        "quantity": 10,
        "unit_price": 100.00,
        "total_price": 1000.00
      }
    ],
    "totals": {
      "subtotal": 1000.00,
      "tax": 100.00,
      "shipping": 10.00,
      "total": 1110.00
    }
  }
}
```

#### 2. Update Order Status (With Business Logic)
```http
PATCH /api/orders/123/status
Content-Type: application/json

{
  "status": "shipped"
}
```

**What Happens:**
1. ✅ Validates status transition is allowed
2. ✅ Updates order status
3. ✅ Executes status-specific logic (e.g., deduct stock when shipped)
4. ✅ Logs status change to audit trail
5. ✅ Returns updated order

---

## Database Schema

### New Tables

#### 1. stock_alerts
```sql
CREATE TABLE stock_alerts (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL,
  sku VARCHAR(100) NOT NULL,
  current_quantity INTEGER NOT NULL,
  reorder_level INTEGER NOT NULL,
  alert_type VARCHAR(50) NOT NULL, -- 'low_stock', 'out_of_stock', 'overstock'
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'resolved', 'ignored'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id, alert_type)
);
```

#### 2. reorder_suggestions
```sql
CREATE TABLE reorder_suggestions (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL,
  sku VARCHAR(100) NOT NULL,
  current_quantity INTEGER NOT NULL,
  suggested_quantity INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'ordered'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  processed_by INTEGER,
  notes TEXT
);
```

#### 3. order_status_history
```sql
CREATE TABLE order_status_history (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  changed_by INTEGER,
  notes TEXT
);
```

### Modified Tables

#### inventory
```sql
-- Added column:
reserved_quantity INTEGER DEFAULT 0
```

---

## Testing the Business Logic

### Test Scenario 1: Complete Order Flow

```bash
# 1. Create an order
POST http://localhost:3005/api/orders
{
  "customer_id": 1,
  "shipping_address": "Test Address",
  "payment_method": "credit_card",
  "payment_status": "paid",
  "items": [
    { "product_id": 1, "sku": "SKU-001", "product_name": "Product 1", "quantity": 5, "unit_price": 50 }
  ]
}

# 2. Check inventory - stock should be reserved
GET http://localhost:3003/api/inventory/product/1

# 3. Update order status to shipped
PATCH http://localhost:3005/api/orders/{order_id}/status
{ "status": "shipped" }

# 4. Check inventory again - stock should be deducted
GET http://localhost:3003/api/inventory/product/1

# 5. Check stock movements
GET http://localhost:3003/api/inventory/history/1
```

### Test Scenario 2: Order Cancellation

```bash
# 1. Create an order (reserves stock)
POST http://localhost:3005/api/orders
{ ... }

# 2. Cancel the order
PATCH http://localhost:3005/api/orders/{order_id}/status
{ "status": "cancelled" }

# 3. Verify stock was released
GET http://localhost:3003/api/inventory/product/1
```

### Test Scenario 3: Low Stock Alert

```bash
# 1. Check current stock levels
GET http://localhost:3003/api/inventory

# 2. Create orders to reduce stock below reorder level
POST http://localhost:3005/api/orders
{ ... }

# 3. Check low stock alerts
GET http://localhost:3003/api/inventory/alerts

# 4. Check reorder suggestions
GET http://localhost:3003/api/inventory/reorder-suggestions
```

---

## Benefits of This Implementation

### 1. **Data Integrity**
- Database transactions ensure consistency
- Stock reservations prevent overselling
- Audit trail for all changes

### 2. **Business Rules Enforcement**
- Only valid status transitions allowed
- Stock availability checked before order creation
- Automatic low stock detection and alerts

### 3. **Scalability**
- Service layer separates business logic from controllers
- Easy to add new workflows
- Can add message queues later for async processing

### 4. **Traceability**
- Complete audit trail of order status changes
- Detailed stock movement history
- Low stock alerts and reorder suggestions tracked

### 5. **Flexibility**
- Easy to modify business rules
- Can add custom validation
- Extensible for new features

---

## Future Enhancements

### 1. **Event-Driven Architecture**
- Replace HTTP calls with message queue (RabbitMQ/Kafka)
- Publish events: `OrderCreated`, `StockLow`, `OrderShipped`
- Asynchronous processing for better performance

### 2. **Notification System**
- Email notifications for order confirmations
- SMS alerts for low stock
- Push notifications for order status changes

### 3. **Advanced Analytics**
- Sales forecasting
- Inventory turnover analysis
- Supplier performance metrics
- Demand prediction

### 4. **Automated Procurement**
- Automatic purchase order generation
- Supplier integration APIs
- Approval workflows

### 5. **Multi-Warehouse Support**
- Stock allocation across warehouses
- Transfer requests between locations
- Location-based order fulfillment

---

## Conclusion

This implementation provides a solid foundation for a production-ready inventory management system with:
- ✅ Proper microservices communication
- ✅ Business logic separation
- ✅ Data integrity and consistency
- ✅ Comprehensive audit trails
- ✅ Stock reservation system
- ✅ Automatic alerts and suggestions
- ✅ Flexible and extensible architecture

The system is ready for real-world use with proper validation, error handling, and business rules enforcement.
