# API Testing Guide

Complete guide for testing all microservices endpoints using cURL and Postman.

## Prerequisites
- All services running via `docker-compose up`
- Postman installed (optional)

## 1. User Service Tests (Port 3001)

### Register New User
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@ims.com",
    "password": "admin123",
    "full_name": "System Administrator",
    "role": "admin"
  }'
```

### Login and Get Token
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ims.com",
    "password": "admin123"
  }'
```

**Save the token from response for subsequent requests**

### Get User Profile (with JWT)
```bash
curl -X GET http://localhost:3001/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

### Update Profile
```bash
curl -X PUT http://localhost:3001/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Updated Admin Name"
  }'
```

### Get All Users (Admin Only)
```bash
curl -X GET http://localhost:3001/api/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

## 2. Product Catalog Service Tests (Port 3002)

### Create Category
```bash
curl -X POST http://localhost:3002/api/categories \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Electronics",
    "description": "Electronic devices and accessories"
  }'
```

### Get All Categories
```bash
curl -X GET http://localhost:3002/api/categories
```

### Create Product
```bash
curl -X POST http://localhost:3002/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "LAP-001",
    "name": "Business Laptop",
    "description": "High-performance laptop for business use",
    "category_id": 1,
    "size": "15 inch",
    "color": "Silver",
    "unit_price": 1299.99,
    "attributes": {
      "brand": "TechCorp",
      "processor": "Intel i7",
      "ram": "16GB",
      "storage": "512GB SSD",
      "warranty": "2 years"
    }
  }'
```

### Get All Products
```bash
curl -X GET http://localhost:3002/api/products
```

### Get Product by ID
```bash
curl -X GET http://localhost:3002/api/products/1
```

### Get Product by SKU
```bash
curl -X GET http://localhost:3002/api/products/sku/LAP-001
```

### Update Product
```bash
curl -X PUT http://localhost:3002/api/products/1 \
  -H "Content-Type: application/json" \
  -d '{
    "unit_price": 1199.99,
    "description": "Updated description"
  }'
```

### Search Products
```bash
curl -X GET "http://localhost:3002/api/products?search=laptop&category_id=1&is_active=true"
```

## 3. Inventory Service Tests (Port 3003)

### Create Inventory Entry
```bash
curl -X POST http://localhost:3003/api/inventory \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 1,
    "sku": "LAP-001",
    "quantity": 100,
    "warehouse_location": "A-01-15",
    "reorder_level": 10,
    "max_stock_level": 500
  }'
```

### Get All Inventory
```bash
curl -X GET http://localhost:3003/api/inventory
```

### Get Low Stock Items
```bash
curl -X GET "http://localhost:3003/api/inventory?low_stock=true"
```

### Get Inventory by Product
```bash
curl -X GET http://localhost:3003/api/inventory/product/1
```

### Adjust Stock - Add Items (Stock In)
```bash
curl -X POST http://localhost:3003/api/inventory/adjust \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 1,
    "sku": "LAP-001",
    "movement_type": "in",
    "quantity": 50,
    "notes": "New shipment received",
    "performed_by": 1
  }'
```

### Adjust Stock - Remove Items (Stock Out)
```bash
curl -X POST http://localhost:3003/api/inventory/adjust \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 1,
    "sku": "LAP-001",
    "movement_type": "out",
    "quantity": 10,
    "notes": "Sold items",
    "performed_by": 1
  }'
```

### Record Damaged Items
```bash
curl -X POST http://localhost:3003/api/inventory/adjust \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 1,
    "sku": "LAP-001",
    "movement_type": "damaged",
    "quantity": 2,
    "notes": "Damaged during handling",
    "performed_by": 1
  }'
```

### Reserve Stock (for orders)
```bash
curl -X POST http://localhost:3003/api/inventory/reserve \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 1,
    "quantity": 5
  }'
```

### Release Reserved Stock
```bash
curl -X POST http://localhost:3003/api/inventory/release \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 1,
    "quantity": 5
  }'
```

### Get Stock Movements History
```bash
curl -X GET "http://localhost:3003/api/inventory/movements?product_id=1"
```

### Filter Stock Movements by Type
```bash
curl -X GET "http://localhost:3003/api/inventory/movements?movement_type=in&start_date=2025-01-01"
```

## 4. Supplier Service Tests (Port 3004)

### Health Check
```bash
curl -X GET http://localhost:3004/health
```

### Get Suppliers (Placeholder)
```bash
curl -X GET http://localhost:3004/api/suppliers
```

### Get Purchase Orders (Placeholder)
```bash
curl -X GET http://localhost:3004/api/purchase-orders
```

## 5. Order Service Tests (Port 3005)

### Health Check
```bash
curl -X GET http://localhost:3005/health
```

### Get Orders (Placeholder)
```bash
curl -X GET http://localhost:3005/api/orders
```

## Complete Workflow Example

### 1. Setup Phase
```bash
# Register admin user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","email":"admin@ims.com","password":"admin123","role":"admin"}'

# Login and get token
TOKEN=$(curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ims.com","password":"admin123"}' | jq -r '.data.token')

echo "Token: $TOKEN"
```

### 2. Create Catalog
```bash
# Create category
curl -X POST http://localhost:3002/api/categories \
  -H "Content-Type: application/json" \
  -d '{"name":"Electronics","description":"Electronic items"}'

# Create product
curl -X POST http://localhost:3002/api/products \
  -H "Content-Type: application/json" \
  -d '{"sku":"PROD-001","name":"Laptop","unit_price":999.99,"category_id":1}'
```

### 3. Setup Inventory
```bash
# Create inventory
curl -X POST http://localhost:3003/api/inventory \
  -H "Content-Type: application/json" \
  -d '{"product_id":1,"sku":"PROD-001","quantity":100,"warehouse_location":"A-01"}'

# Add stock
curl -X POST http://localhost:3003/api/inventory/adjust \
  -H "Content-Type: application/json" \
  -d '{"product_id":1,"sku":"PROD-001","movement_type":"in","quantity":50}'
```

### 4. Check Results
```bash
# View products
curl -X GET http://localhost:3002/api/products

# View inventory
curl -X GET http://localhost:3003/api/inventory

# View stock movements
curl -X GET http://localhost:3003/api/inventory/movements
```

## Postman Collection

### Import into Postman

Create a new collection with these variables:
- `base_url`: http://localhost
- `user_port`: 3001
- `product_port`: 3002
- `inventory_port`: 3003
- `supplier_port`: 3004
- `order_port`: 3005
- `jwt_token`: (set after login)

### Environment Setup
```json
{
  "name": "IMS Development",
  "values": [
    { "key": "base_url", "value": "http://localhost" },
    { "key": "user_port", "value": "3001" },
    { "key": "product_port", "value": "3002" },
    { "key": "inventory_port", "value": "3003" },
    { "key": "jwt_token", "value": "" }
  ]
}
```

## Testing Tips

### 1. Save JWT Token Automatically (Postman)
In the Login request Tests tab:
```javascript
var jsonData = pm.response.json();
pm.environment.set("jwt_token", jsonData.data.token);
```

### 2. Use Token in Requests
Authorization Header: `Bearer {{jwt_token}}`

### 3. Test Error Cases
```bash
# Invalid credentials
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"wrong@email.com","password":"wrongpass"}'

# Invalid product data
curl -X POST http://localhost:3002/api/products \
  -H "Content-Type: application/json" \
  -d '{"sku":"","name":"","unit_price":-10}'

# Insufficient stock
curl -X POST http://localhost:3003/api/inventory/reserve \
  -H "Content-Type: application/json" \
  -d '{"product_id":1,"quantity":999999}'
```

### 4. Performance Testing
```bash
# Apache Bench
ab -n 1000 -c 10 http://localhost:3002/api/products

# Artillery
artillery quick --count 10 -n 100 http://localhost:3002/health
```

## Common Issues

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3001 | xargs kill -9
```

### Database Connection Failed
```bash
docker-compose restart postgres
docker-compose logs postgres
```

### Service Not Responding
```bash
docker-compose logs user-service
docker-compose restart user-service
```

## Next Steps

1. Implement complete Supplier Service endpoints
2. Implement complete Order Service endpoints
3. Add integration tests
4. Add load testing
5. Configure API Gateway
6. Add rate limiting
7. Implement caching
8. Add API documentation (Swagger/OpenAPI)
