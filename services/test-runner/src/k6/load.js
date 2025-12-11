import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '10s', target: 20 }, // Ramp up to 20 users
        { duration: '30s', target: 20 }, // Stay at 20 users
        { duration: '10s', target: 0 },  // Ramp down to 0
    ],
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

// Define targets based on provided Env Vars
const targets = [];
if (__ENV.PRODUCT_URL) targets.push({ name: 'Product', url: __ENV.PRODUCT_URL });
if (__ENV.INVENTORY_URL) targets.push({ name: 'Inventory', url: __ENV.INVENTORY_URL });
if (__ENV.SUPPLIER_URL) targets.push({ name: 'Supplier', url: __ENV.SUPPLIER_URL });
if (__ENV.ORDER_URL) targets.push({ name: 'Order', url: __ENV.ORDER_URL });
if (__ENV.IDENTITY_URL) targets.push({ name: 'Identity', url: __ENV.IDENTITY_URL });

// Fallback: If no specific URL is provided, default to Product Service via Gateway
if (targets.length === 0) {
    targets.push({ name: 'Product (Default)', url: `${BASE_URL}/api/products` });
}

export default function () {
    // Pick a random target from the available list
    // This allows mixed load testing if multiple URLs are provided
    const target = targets[Math.floor(Math.random() * targets.length)];

    const res = http.get(target.url, params);

    check(res, {
        [`${target.name} status is 200`]: (r) => r.status === 200,
    });

    sleep(1);
}
