# Order Management Service

Complete Node.js microservice for sales order processing with inventory management.

## API Endpoints

### Orders
- POST /api/orders - Create order (reserves/deducts inventory)
- GET /api/orders - List all orders
- GET /api/orders/:id - Get order details
- PUT /api/orders/:id - Update order
- PUT /api/orders/:id/status - Update order status
- DELETE /api/orders/:id - Cancel order (releases inventory)

## Features
- Order creation with automatic inventory deduction
- Stock reservation system
- Order status tracking (pending → confirmed → processing → shipped → delivered)
- Inter-service communication with Product, Inventory, and User services
- Transaction support for order consistency
- Automatic inventory release on cancellation

## Order Statuses
- **pending**: Order created, awaiting confirmation
- **confirmed**: Order confirmed, stock reserved
- **processing**: Order being prepared
- **shipped**: Order dispatched
- **delivered**: Order completed
- **cancelled**: Order cancelled, stock released

## Environment Variables
```
PORT=3005
DB_HOST=postgres
DB_NAME=order_db
PRODUCT_SERVICE_URL=http://product-catalog-service:3002
INVENTORY_SERVICE_URL=http://inventory-service:3003
USER_SERVICE_URL=http://user-service:3001
```
