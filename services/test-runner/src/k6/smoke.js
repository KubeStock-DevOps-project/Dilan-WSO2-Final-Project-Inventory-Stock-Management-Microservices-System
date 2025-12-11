import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    vus: 1,
    duration: '5s',
    // thresholds: {
    //     http_req_failed: ['rate<0.05'],
    //     http_req_duration: ['p(95)<5000'],
    // },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173';
const ACCESS_TOKEN = __ENV.ACCESS_TOKEN;



const headers = {
    'Content-Type': 'application/json',
};
if (ACCESS_TOKEN) {
    headers['Authorization'] = `Bearer ${ACCESS_TOKEN}`;
}

const params = {
    headers: headers,
};

export default function () {
    // 1. Check Product Service
    const productUrl = __ENV.PRODUCT_URL || `${BASE_URL}/api/products`;
    const resProduct = http.get(productUrl, params);
    check(resProduct, {
        '✅ Product Service UP': (r) => r.status === 200,
    });
    if (resProduct.status !== 200) {
        console.error(`❌ Product Service failed: ${resProduct.status} ${resProduct.body}`);
    }

    // 2. Check Inventory Service
    // Critical dependency for stock management
    const inventoryUrl = __ENV.INVENTORY_URL || `${BASE_URL}/api/inventory`;
    const resInventory = http.get(inventoryUrl, params);
    check(resInventory, {
        '✅ Inventory Service UP': (r) => r.status === 200,
    });
    if (resInventory.status !== 200) {
        console.error(`❌ Inventory Service failed: ${resInventory.status} ${resInventory.body}`);
    }

    // 3. Check Supplier Service
    const supplierUrl = __ENV.SUPPLIER_URL || `${BASE_URL}/api/suppliers`;
    const resSupplier = http.get(supplierUrl, params);
    check(resSupplier, {
        '✅ Supplier Service UP': (r) => r.status === 200,
    });
    if (resSupplier.status !== 200) {
        console.error(`❌ Supplier Service failed: ${resSupplier.status} ${resSupplier.body}`);
    }

    // 4. Check Order Management Service
    const orderUrl = __ENV.ORDER_URL || `${BASE_URL}/api/orders`;
    const resOrder = http.get(orderUrl, params);
    check(resOrder, {
        '✅ Order Service UP': (r) => r.status === 200,
    });
    if (resOrder.status !== 200) {
        console.error(`❌ Order Service failed: ${resOrder.status} ${resOrder.body}`);
    }

    // 5. Check Identity/Auth Service (Optional but recommended)
    // Often these endpoints require auth headers, so checking health/public info is safer
    const identityUrl = __ENV.IDENTITY_URL || `${BASE_URL}/api/identity/health`;
    const resIdentity = http.get(identityUrl, params);
    check(resIdentity, {
        '✅ Identity Service UP': (r) => r.status === 200 || r.status === 401, // 401 is okay (means service is alive but secured)
    });
    if (resIdentity.status !== 200 && resIdentity.status !== 401) {
        console.error(`❌ Identity Service failed: ${resIdentity.status} ${resIdentity.body}`);
    }

    sleep(1);
}