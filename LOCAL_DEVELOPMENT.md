# Local Development Quick Start Guide

This guide explains how to run the full stack locally with PostgreSQL in Docker and services running manually.

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ and npm
- Git Bash or similar shell (for Windows)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend (React + Vite)                     │
│                       http://localhost:5173                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Asgardeo (Authentication)                    │
│              https://api.asgardeo.io/t/YOUR_ORG                  │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   Product     │   │   Inventory   │   │   Supplier    │
│   Catalog     │   │   Service     │   │   Service     │
│   :3002       │   │   :3003       │   │   :3004       │
└───────────────┘   └───────────────┘   └───────────────┘
        │                     │                     │
        │           ┌─────────┼─────────┐           │
        │           ▼         ▼         ▼           │
        │     ┌───────────────────────────────┐     │
        │     │        Order Service          │     │
        │     │            :3005              │     │
        │     └───────────────────────────────┘     │
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
                    ┌───────────────────┐
                    │    PostgreSQL     │
                    │   (Docker :5432)  │
                    │                   │
                    │  - product_catalog_db │
                    │  - inventory_db   │
                    │  - supplier_db    │
                    │  - order_db       │
                    └───────────────────┘
```

## Step 1: Start PostgreSQL

```bash
cd backend

# Start PostgreSQL only (databases will be initialized from init.sql)
docker-compose -f docker-compose.postgres.yml up -d

# Verify PostgreSQL is running
docker ps
# Should show: ims-postgres container

# Check logs if needed
docker logs ims-postgres
```

## Step 2: Run Database Migrations (if needed)

The `init.sql` script creates all tables automatically on first run. If you need to apply additional migrations:

```bash
# Connect to PostgreSQL and run migration scripts manually
docker exec -it ims-postgres psql -U postgres -d inventory_db -f /path/to/migration.sql
```

## Step 3: Install Dependencies

```bash
# Backend services (run in separate terminals or use a script)
cd backend/services/product-catalog-service && npm install
cd backend/services/inventory-service && npm install
cd backend/services/supplier-service && npm install
cd backend/services/order-service && npm install

# Frontend
cd frontend && npm install
```

## Step 4: Start Backend Services

Open **4 separate terminals** and run each service:

### Terminal 1: Product Catalog Service (Port 3002)
```bash
cd backend/services/product-catalog-service
npm run dev
```

### Terminal 2: Inventory Service (Port 3003)
```bash
cd backend/services/inventory-service
npm run dev
```

### Terminal 3: Supplier Service (Port 3004)
```bash
cd backend/services/supplier-service
npm run dev
```

### Terminal 4: Order Service (Port 3005)
```bash
cd backend/services/order-service
npm run dev
```

## Step 5: Start Frontend

```bash
cd frontend
npm run dev
```

Frontend will be available at: http://localhost:5173

## Step 6: Configure Asgardeo (First Time Setup)

1. Go to https://console.asgardeo.io
2. Create a Single Page Application (SPA)
3. Configure authorized redirect URLs:
   - Sign-in redirect: `http://localhost:5173`
   - Sign-out redirect: `http://localhost:5173`
4. Copy the Client ID
5. Update `frontend/.env`:
   ```
   VITE_ASGARDEO_BASE_URL=https://api.asgardeo.io/t/YOUR_ORG_NAME
   VITE_ASGARDEO_CLIENT_ID=YOUR_CLIENT_ID
   ```

## Verifying Everything Works

### Health Checks
```bash
curl http://localhost:3002/health  # Product Catalog
curl http://localhost:3003/health  # Inventory
curl http://localhost:3004/health  # Supplier
curl http://localhost:3005/health  # Order
```

### Frontend
Open http://localhost:5173 in your browser. You should see the login page.

## Stopping Services

```bash
# Stop PostgreSQL
cd backend
docker-compose -f docker-compose.postgres.yml down

# Stop each Node.js service with Ctrl+C in their respective terminals
```

## Environment Files

All `.env` files are pre-configured for localhost development:

| Service | Port | Database |
|---------|------|----------|
| Product Catalog | 3002 | product_catalog_db |
| Inventory | 3003 | inventory_db |
| Supplier | 3004 | supplier_db |
| Order | 3005 | order_db |
| Frontend | 5173 | N/A |
| PostgreSQL | 5432 | N/A |

## Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker ps

# Check PostgreSQL logs
docker logs ims-postgres

# Manually connect to verify
docker exec -it ims-postgres psql -U postgres -l
```

### Service Not Starting
- Check if the port is already in use
- Verify `.env` file exists in the service directory
- Check for missing dependencies: `npm install`

### Frontend Not Connecting to Backend
- Ensure all backend services are running
- Check CORS is enabled (it is by default)
- Verify service URLs in `frontend/.env`
