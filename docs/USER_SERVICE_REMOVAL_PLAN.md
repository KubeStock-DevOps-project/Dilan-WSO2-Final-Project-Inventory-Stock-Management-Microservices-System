# User Service Removal Plan

> **Document Version:** 1.1  
> **Created:** December 1, 2025  
> **Updated:** December 2, 2025  
> **Status:** ✅ IMPLEMENTED  
> **Target Architecture:** Istio + Asgardeo (No Local User Service)

---

## Executive Summary

This document outlines the plan to **completely remove the User Service** from the backend and rely entirely on **WSO2 Asgardeo** for all user identity and authentication needs. This simplifies the architecture, eliminates duplicate user data, and follows cloud-native best practices.

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Target Architecture](#target-architecture)
3. [What Gets Removed](#what-gets-removed)
4. [What Gets Modified](#what-gets-modified)
5. [Migration Steps](#migration-steps)
6. [Database Changes](#database-changes)
7. [Frontend Changes](#frontend-changes)
8. [Backend Service Changes](#backend-service-changes)
9. [Risk Assessment](#risk-assessment)
10. [Rollback Plan](#rollback-plan)

---

## Current State Analysis

### User Service Functionality (Port 3001)

| Feature | Implementation | Actually Used? |
|---------|---------------|----------------|
| Local Registration | `POST /api/auth/register` | ❌ NO - UI redirects to Asgardeo |
| Local Login | `POST /api/auth/login` | ❌ NO - UI uses Asgardeo SSO |
| JWT Token Generation | `jsonwebtoken` library | ❌ NO - Using Asgardeo tokens |
| Password Hashing | `bcrypt` library | ❌ NO - Passwords in Asgardeo |
| Get Profile | `GET /api/auth/profile` | ⚠️ Rarely - Frontend uses Asgardeo userinfo |
| Update Profile | `PUT /api/auth/profile` | ⚠️ Rarely - Can update in Asgardeo |
| Change Password | `PUT /api/auth/change-password` | ❌ NO - Asgardeo handles this |
| Admin CRUD Users | `GET/POST/PUT/DELETE /api/users/*` | ⚠️ Limited - Only user count shown |

### Database: `users` Table

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,              -- Integer ID (problem for Asgardeo)
    username VARCHAR(50) UNIQUE,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255),          -- NOT NEEDED with Asgardeo
    full_name VARCHAR(100),
    role VARCHAR(20),                    -- Duplicates Asgardeo groups
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Current Dependencies

| Component | Dependency Type | Impact |
|-----------|----------------|--------|
| `suppliers.user_id` | Foreign Key (INTEGER) | Needs migration to `asgardeo_sub` |
| `stock_movements.performed_by` | Audit Reference (INTEGER) | Needs migration |
| `AdminDashboard.jsx` | API Call | Shows "Total Users" count |
| `userService.js` | Frontend Service | CRUD operations |

---

## Target Architecture

### Authentication Flow (After Removal)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  @asgardeo/auth-react                                            │   │
│  │  • Login via Asgardeo SSO                                        │   │
│  │  • Get user info (sub, email, groups) from ID token             │   │
│  │  • Store JWT in localStorage for API calls                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ JWT Token in Authorization header
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         ISTIO SERVICE MESH                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  RequestAuthentication + AuthorizationPolicy                     │   │
│  │  • Validates JWT signature against Asgardeo JWKS                │   │
│  │  • Enforces JWT presence on protected routes                    │   │
│  │  • Passes validated claims to backend via headers               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ x-jwt-claim-sub, x-jwt-claim-email
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          BACKEND SERVICES                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐   │
│  │  Product    │ │  Inventory  │ │  Supplier   │ │  Order          │   │
│  │  Catalog    │ │  Service    │ │  Service    │ │  Service        │   │
│  │             │ │             │ │             │ │                 │   │
│  │ Trust Istio │ │ Trust Istio │ │ Trust Istio │ │ Trust Istio     │   │
│  │ Use sub/    │ │ Use sub/    │ │ Use sub/    │ │ Use sub/        │   │
│  │ email as ID │ │ email as ID │ │ email as ID │ │ email as ID     │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────┘   │
│                                                                          │
│  ╳ NO USER SERVICE ╳                                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

### User Identity Source

| Data | Source | How to Access |
|------|--------|---------------|
| User ID | Asgardeo `sub` claim | JWT token / Istio header |
| Email | Asgardeo `email` claim | JWT token / Istio header |
| Username | Asgardeo `username` or `preferred_username` | JWT token |
| Full Name | Asgardeo `name` or `given_name + family_name` | JWT token |
| Roles | Asgardeo `groups` claim | JWT token |
| Profile Picture | Asgardeo `picture` claim | JWT token |

---

## What Gets Removed

### Backend Files to DELETE

```
backend/services/user-service/                    # ENTIRE DIRECTORY
├── src/
│   ├── server.js
│   ├── config/
│   │   ├── asgardeo.config.js
│   │   ├── database.js
│   │   └── logger.js
│   ├── controllers/
│   │   ├── auth.controller.js                   # Local auth logic
│   │   └── user.controller.js                   # User CRUD
│   ├── middlewares/
│   │   ├── auth.middleware.js                   # Legacy JWT validation
│   │   ├── asgardeo.middleware.js              # Redundant with Istio
│   │   ├── error.middleware.js
│   │   ├── metrics.js
│   │   └── validation.middleware.js
│   ├── models/
│   │   └── user.model.js                        # User DB operations
│   └── routes/
│       ├── auth.routes.js                       # /api/auth/*
│       └── user.routes.js                       # /api/users/*
├── Dockerfile
├── package.json
└── .env.example
```

### Shared Backend Files to DELETE

```
backend/middleware/asgardeo.middleware.js        # Move validation to Istio
backend/config/asgardeo.config.js                # No longer needed
```

### Database Objects to DROP

```sql
-- Drop the entire users table
DROP TABLE IF EXISTS users CASCADE;

-- Drop user_service_db (if separate database)
DROP DATABASE IF EXISTS user_service_db;
```

### Frontend Files to DELETE

```
frontend/src/services/authService.js             # Local auth API calls
frontend/src/context/AuthContext.jsx             # Legacy auth context (unused)
frontend/src/pages/auth/AsgardeoLogin.jsx        # Duplicate login page
frontend/src/pages/auth/ForgotPassword.jsx       # Asgardeo handles this
```

### Docker/K8s Resources to DELETE

```
k8s/base/services/user-service/                  # Kubernetes manifests
docker-compose.yml                               # Remove user-service entry
```

---

## What Gets Modified

### Frontend Modifications

#### 1. `frontend/src/services/userService.js` → DELETE or SIMPLIFY

**Option A: Delete entirely** (if admin user management not needed)

**Option B: Replace with Asgardeo SCIM API** (if admin needs user list)

```javascript
// NEW: userService.js using Asgardeo SCIM 2.0 API
import axios from 'axios';

const ASGARDEO_SCIM_URL = import.meta.env.VITE_ASGARDEO_BASE_URL + '/scim2';

export const userService = {
  // Get all users from Asgardeo (requires admin scope)
  getAllUsers: async () => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${ASGARDEO_SCIM_URL}/Users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return {
      data: response.data.Resources.map(u => ({
        id: u.id,
        username: u.userName,
        email: u.emails?.[0]?.value,
        full_name: u.name?.formatted || `${u.name?.givenName} ${u.name?.familyName}`,
        role: u.groups?.[0]?.display || 'warehouse_staff',
        is_active: u.active
      }))
    };
  }
};
```

#### 2. `frontend/src/pages/dashboards/AdminDashboard.jsx`

```diff
- import { userService } from "../../services/userService";

  const fetchDashboardData = async () => {
    const [products, inventory, movements] = await Promise.all([
      productService.getAllProducts(),
      inventoryService.getAllInventory(),
-     userService.getAllUsers().catch(() => ({ data: [] })),
      inventoryService.getStockMovements({ limit: 6 }).catch(() => ({ data: [] })),
    ]);

    setStats({
      totalProducts: products.data?.length || 0,
      totalInventory: inventory.data?.reduce((sum, item) => sum + item.quantity, 0) || 0,
      lowStockItems: inventory.data?.filter(item => item.quantity < item.min_quantity).length || 0,
-     totalUsers: users.data?.length || 0,
+     // REMOVED: totalUsers - use Asgardeo admin console instead
    });
  };
```

#### 3. `frontend/src/utils/constants.js`

```diff
  export const API_ENDPOINTS = {
-   AUTH: {
-     LOGIN: "/api/auth/login",
-     REGISTER: "/api/auth/register",
-     PROFILE: "/api/auth/profile",
-     CHANGE_PASSWORD: "/api/auth/change-password",
-   },
-   USERS: "/api/users",
    PRODUCTS: "/api/products",
    CATEGORIES: "/api/categories",
    // ... rest stays
  };

- export const SERVICES = {
-   USER: import.meta.env.VITE_USER_SERVICE_URL || "http://localhost:3001",
    // ... rest stays
- };
```

#### 4. `frontend/src/context/AsgardeoAuthContext.jsx`

```diff
  // Remove unused token storage duplication
  if (accessToken) {
-   localStorage.setItem("asgardeo_token", accessToken);
    localStorage.setItem("token", accessToken);
-   console.log("💾 Token stored in localStorage");
  }

- // Remove all console.log debug statements for production
```

#### 5. `frontend/src/pages/auth/Register.jsx` → SIMPLIFY

```jsx
// NEW: Simple redirect to Asgardeo signup
import { useEffect } from 'react';
import { useAuth } from '../../context/AsgardeoAuthContext';

const Register = () => {
  const { login } = useAuth();
  
  useEffect(() => {
    // Asgardeo handles registration via self-signup
    login(); // Redirects to Asgardeo where user can sign up
  }, []);

  return <div>Redirecting to sign up...</div>;
};

export default Register;
```

### Backend Service Modifications

#### 1. Supplier Service - Change User ID Reference

**File:** `backend/services/supplier-service/src/models/supplier.model.js`

```diff
- static async findByUserId(userId) {
-   const query = "SELECT * FROM suppliers WHERE user_id = $1";
-   const result = await db.query(query, [userId]);
-   return result.rows[0];
- }

+ static async findByAsgardeoSub(asgardeoSub) {
+   const query = "SELECT * FROM suppliers WHERE asgardeo_sub = $1";
+   const result = await db.query(query, [asgardeoSub]);
+   return result.rows[0];
+ }

+ static async findByEmail(email) {
+   const query = "SELECT * FROM suppliers WHERE email = $1";
+   const result = await db.query(query, [email]);
+   return result.rows[0];
+ }
```

#### 2. All Services - Simple Token Decoder Middleware

**Create:** `backend/shared/middleware/tokenDecoder.js`

```javascript
/**
 * Simple JWT decoder - DOES NOT VALIDATE
 * Validation is done by Istio at the mesh level
 * This just extracts claims for application use
 */
const decodeToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      message: 'No token provided' 
    });
  }

  try {
    const token = authHeader.split(' ')[1];
    const parts = token.split('.');
    
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    // Decode payload (Istio already validated signature)
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf8')
    );

    req.user = {
      sub: payload.sub,                    // Asgardeo unique ID
      email: payload.email,
      username: payload.username || payload.preferred_username,
      roles: payload.groups || [],
      scope: payload.scope
    };

    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
};

const requireRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const userRoles = req.user.roles || [];
    const hasRole = allowedRoles.some(role => 
      userRoles.includes(role) || 
      userRoles.some(r => r.toLowerCase().includes(role.toLowerCase()))
    );

    if (!hasRole) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    next();
  };
};

module.exports = { decodeToken, requireRoles };
```

---

## Database Changes

### Migration Script

```sql
-- ============================================
-- Migration: Remove User Service Dependencies
-- Date: 2025-12-01
-- ============================================

-- Step 1: Modify suppliers table
-- Change from integer user_id to string asgardeo_sub

\c supplier_db;

-- Add new column for Asgardeo sub
ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS asgardeo_sub VARCHAR(255);

-- Create index for new column
CREATE INDEX IF NOT EXISTS idx_suppliers_asgardeo_sub 
ON suppliers(asgardeo_sub);

-- Drop old user_id column (after data migration if needed)
-- ALTER TABLE suppliers DROP COLUMN IF EXISTS user_id;

-- Step 2: Modify stock_movements table  
-- Change performed_by from integer to string

\c inventory_db;

-- Option A: Change column type
ALTER TABLE stock_movements 
ALTER COLUMN performed_by TYPE VARCHAR(255);

-- Option B: Add new column, keep old for history
-- ALTER TABLE stock_movements ADD COLUMN performed_by_sub VARCHAR(255);

-- Step 3: Remove user_service_db entirely
-- WARNING: Backup data first if needed

-- DROP DATABASE IF EXISTS user_service_db;
```

### Data Migration (If Needed)

If existing supplier records need to be linked to Asgardeo users:

```sql
-- Map existing suppliers to Asgardeo users by email
UPDATE suppliers s
SET asgardeo_sub = (
  SELECT asgardeo_sub_from_lookup_table 
  WHERE email = s.email
)
WHERE s.asgardeo_sub IS NULL;
```

---

## Migration Steps

### Phase 1: Preparation (Low Risk) ✅ COMPLETE

- [x] Create backup of `users` table data
- [x] Document any custom user data that needs preservation
- [x] Verify Asgardeo has all required user attributes
- [x] Verify Asgardeo groups match application roles

### Phase 2: Database Migration ✅ COMPLETE

- [x] Run SQL migration to add `asgardeo_sub` column to `suppliers`
- [x] Update `stock_movements.performed_by` column type
- [x] Migrate existing data (map email to Asgardeo sub)
- [x] Test foreign key relationships

### Phase 3: Backend Changes ✅ COMPLETE

- [x] Create shared `tokenDecoder.js` middleware
- [x] Update Supplier Service to use `asgardeo_sub` / `email`
- [x] Remove all `asgardeo.middleware.js` copies from services
- [x] Remove `auth.middleware.js` copies from services
- [x] Delete User Service directory entirely

### Phase 4: Frontend Changes ✅ COMPLETE

- [x] Remove `authService.js`
- [x] Remove/update `userService.js`
- [x] Update `AdminDashboard.jsx` (remove user count or use SCIM)
- [x] Clean up `AsgardeoAuthContext.jsx` (remove debug logs)
- [x] Update `constants.js` (remove AUTH endpoints)
- [x] Delete unused auth pages

### Phase 5: Infrastructure Changes ✅ COMPLETE

- [x] Remove User Service from `docker-compose.yml`
- [x] Delete Kubernetes manifests for User Service
- [x] Update Istio VirtualService (remove user-service routes)
- [x] Update monitoring/alerting (remove user-service targets)

### Phase 6: Testing ⏳ PENDING

- [ ] Test login flow end-to-end
- [ ] Test role-based access (admin, warehouse_staff, supplier)
- [ ] Test supplier profile lookup
- [ ] Test audit trail (stock movements)
- [ ] Load test without User Service

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Asgardeo outage blocks all auth | Low | High | Asgardeo has 99.9% SLA; consider caching tokens |
| Missing user attributes in token | Medium | Medium | Verify all needed claims in Asgardeo config |
| Breaking existing supplier links | Medium | High | Migrate data before dropping columns |
| Admin loses user management | Low | Low | Use Asgardeo console for user management |
| Audit trail loses context | Low | Medium | Store email/sub in audit columns |

---

## Rollback Plan

If issues arise after migration:

### Quick Rollback (< 1 hour)

1. Re-deploy User Service from backup/previous image
2. Restore `users` table from backup
3. Revert frontend to previous version
4. Update routing to include User Service

### Data Recovery

```sql
-- Restore users table from backup
\i /backups/users_table_backup.sql

-- Revert suppliers table
ALTER TABLE suppliers ADD COLUMN user_id INTEGER;
UPDATE suppliers SET user_id = (
  SELECT id FROM users WHERE email = suppliers.email
);
```

---

## Benefits of Removal

| Benefit | Description |
|---------|-------------|
| **Simplified Architecture** | One less microservice to maintain, deploy, monitor |
| **No Password Storage** | Eliminates security risk of storing credentials |
| **Single Source of Truth** | User data only in Asgardeo, no sync issues |
| **Reduced Database Footprint** | One less database to backup/manage |
| **Cleaner Codebase** | Remove ~1000 lines of duplicate auth code |
| **Better Scalability** | Asgardeo handles auth scaling automatically |
| **Compliance** | Identity management delegated to certified IdP |

---

## Appendix: Files Reference

### Files to DELETE (Complete List)

```
# Backend
backend/services/user-service/                    # Entire directory
backend/middleware/asgardeo.middleware.js
backend/config/asgardeo.config.js

# Frontend  
frontend/src/services/authService.js
frontend/src/context/AuthContext.jsx
frontend/src/pages/auth/AsgardeoLogin.jsx
frontend/src/pages/auth/ForgotPassword.jsx

# Infrastructure
k8s/base/services/user-service/
```

### Files to MODIFY (Summary)

```
# Frontend
frontend/src/services/userService.js              # Delete or use SCIM
frontend/src/pages/dashboards/AdminDashboard.jsx  # Remove user count
frontend/src/utils/constants.js                   # Remove AUTH endpoints
frontend/src/context/AsgardeoAuthContext.jsx      # Clean up debug logs

# Backend
backend/services/supplier-service/src/models/supplier.model.js
backend/services/inventory-service/src/models/stockMovement.model.js

# Database
backend/database/init-schemas.sql                 # Remove users table
backend/database/migrations/                      # Add migration script
```

---

*This document serves as the comprehensive plan for removing the User Service and migrating to a fully Asgardeo-based authentication architecture.*
