import http from 'k6/http';
import { check, sleep } from 'k6';

// Spike Test Profile - Sudden traffic spikes
export const options = {
    stages: [
        { duration: '30s', target: 20 },   // Normal load
        { duration: '10s', target: 200 },  // Sudden spike!
        { duration: '1m', target: 200 },   // Sustain spike
        { duration: '10s', target: 20 },   // Back to normal
        { duration: '30s', target: 20 },   // Stay normal
        { duration: '10s', target: 0 },    // Ramp down
    ],
    thresholds: {
        http_req_failed: ['rate<0.05'],
        http_req_duration: ['p(95)<3000'],
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
    throw new Error('❌ No service URLs provided for spike testing.');
}

console.log(`⚡ Spike testing ${targets.length} service(s):`);
targets.forEach(t => console.log(`   - ${t.name}: ${t.url}`));

export default function () {
    const target = targets[Math.floor(Math.random() * targets.length)];
    const res = http.get(target.url, params);

    check(res, {
        [`${target.name} status is 200`]: (r) => r.status === 200,
        [`${target.name} response time < 3s`]: (r) => r.timings.duration < 3000,
    });

    if (res.status !== 200) {
        console.error(`❌ ${target.name} failed: ${res.status}`);
    }

    sleep(1);
}
