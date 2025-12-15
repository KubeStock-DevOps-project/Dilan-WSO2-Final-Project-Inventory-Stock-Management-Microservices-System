import http from 'k6/http';
import { check, sleep } from 'k6';

// Load test stages can be configured via environment or use defaults
let stages = [
    { duration: '10s', target: 20 }, // Ramp up to 20 users
    { duration: '30s', target: 20 }, // Stay at 20 users
    { duration: '10s', target: 0 },  // Ramp down to 0
];

// Check if custom stages are provided via environment
if (__ENV.STAGES) {
    try {
        stages = JSON.parse(__ENV.STAGES);
        console.log('Using custom stages:', stages);
    } catch (e) {
        console.error('Failed to parse STAGES, using defaults');
    }
}

export const options = {
    stages: stages,
    // thresholds: {
    //     http_req_failed: ['rate<0.05'], 
    //     http_req_duration: ['p(95)<5000'], 
    // },
};

const ACCESS_TOKEN = __ENV.ACCESS_TOKEN;
const KONG_CONSUMER_HEADER = __ENV.KONG_CONSUMER_HEADER || 'test-runner';

const headers = {
    'Content-Type': 'application/json',
    'X-Consumer-Username': KONG_CONSUMER_HEADER,
};
if (ACCESS_TOKEN) {
    headers['Authorization'] = `Bearer ${ACCESS_TOKEN}`;
}

const params = {
    headers: headers,
};

// Load test targets - Direct microservice URLs (no /api prefix)
// These should point directly to the microservices (e.g., http://product-service:3002)
const targets = [];

if (__ENV.PRODUCT_URL) {
    targets.push({ name: 'Product Service', url: __ENV.PRODUCT_URL });
}
if (__ENV.INVENTORY_URL) {
    targets.push({ name: 'Inventory Service', url: __ENV.INVENTORY_URL });
}
if (__ENV.SUPPLIER_URL) {
    targets.push({ name: 'Supplier Service', url: __ENV.SUPPLIER_URL });
}
if (__ENV.ORDER_URL) {
    targets.push({ name: 'Order Service', url: __ENV.ORDER_URL });
}
if (__ENV.IDENTITY_URL) {
    targets.push({ name: 'Identity Service', url: __ENV.IDENTITY_URL });
}

if (targets.length === 0) {
    throw new Error('❌ No service URLs provided for load testing. Please provide at least one service URL.');
}

console.log(`📊 Load testing ${targets.length} service(s) directly:`);
targets.forEach(t => console.log(`   - ${t.name}: ${t.url}`));

export default function () {
    // Pick a random target from the available list
    // This allows mixed load testing if multiple service URLs are provided
    const target = targets[Math.floor(Math.random() * targets.length)];

    const res = http.get(target.url, params);

    check(res, {
        [`${target.name} status is 200`]: (r) => r.status === 200,
        [`${target.name} response time < 500ms`]: (r) => r.timings.duration < 500,
    });

    if (res.status !== 200) {
        console.error(`❌ ${target.name} failed: ${res.status} ${res.body}`);
    }

    sleep(1);
}
