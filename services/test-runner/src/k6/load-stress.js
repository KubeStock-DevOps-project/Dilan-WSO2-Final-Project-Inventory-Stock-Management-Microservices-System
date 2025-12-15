import http from 'k6/http';
import { check, sleep } from 'k6';

// Stress Test Profile - Find the breaking point
export const options = {
    stages: [
        { duration: '1m', target: 50 },    // Ramp to 50
        { duration: '2m', target: 100 },   // Ramp to 100
        { duration: '2m', target: 200 },   // Ramp to 200
        { duration: '2m', target: 400 },   // Ramp to 400
        { duration: '5m', target: 400 },   // Sustain 400 users
        { duration: '2m', target: 0 },     // Ramp down
    ],
    thresholds: {
        http_req_failed: ['rate<0.1'],     // <10% errors
        http_req_duration: ['p(95)<2000'], // 95% under 2s
        http_req_duration: ['p(99)<5000'], // 99% under 5s
    },
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
    throw new Error('❌ No service URLs provided for stress testing.');
}

console.log(`🔥 Stress testing ${targets.length} service(s):`);
targets.forEach(t => console.log(`   - ${t.name}: ${t.url}`));

export default function () {
    const target = targets[Math.floor(Math.random() * targets.length)];
    const res = http.get(target.url, params);

    check(res, {
        [`${target.name} status is 200`]: (r) => r.status === 200,
        [`${target.name} response time < 2s`]: (r) => r.timings.duration < 2000,
    });

    if (res.status !== 200) {
        console.error(`❌ ${target.name} failed: ${res.status}`);
    }

    sleep(0.5); // Faster requests for stress testing
}
