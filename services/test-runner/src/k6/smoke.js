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

const GATEWAY_URL = __ENV.GATEWAY_URL || 'http://localhost:5173';
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

export default function () {
    console.log(`🔍 Running smoke tests through gateway: ${GATEWAY_URL}`);

    // 1. Check Gateway Health
    const gatewayHealthUrl = `${GATEWAY_URL}/api/gateway/health`;
    const resGateway = http.get(gatewayHealthUrl, params);
    const gatewayOk = resGateway.status === 200;
    check(resGateway, {
        'Gateway Health Check': (r) => r.status === 200,
    });
    console.log(`${gatewayOk ? '✅' : '❌'} Gateway: ${resGateway.status} - ${resGateway.status === 200 ? 'PASSED' : 'FAILED'}`);
    if (!gatewayOk) {
        console.error(`❌ Gateway Health failed: ${resGateway.status} ${resGateway.body}`);
    }

    // 2. Check Product Service through Gateway
    const productUrl = __ENV.PRODUCT_URL || `${GATEWAY_URL}/api/product`;
    const resProduct = http.get(productUrl, params);
    const productOk = resProduct.status === 200;
    check(resProduct, {
        'Product Service UP': (r) => r.status === 200,
    });
    console.log(`${productOk ? '✅' : '❌'} Product Service: ${resProduct.status} - ${resProduct.status === 200 ? 'PASSED' : 'FAILED'}`);
    if (!productOk) {
        console.error(`❌ Product Service failed: ${resProduct.status} ${resProduct.body}`);
    }

    // 3. Check Inventory Service through Gateway
    const inventoryUrl = __ENV.INVENTORY_URL || `${GATEWAY_URL}/api/inventory`;
    const resInventory = http.get(inventoryUrl, params);
    const inventoryOk = resInventory.status === 200;
    check(resInventory, {
        'Inventory Service UP': (r) => r.status === 200,
    });
    console.log(`${inventoryOk ? '✅' : '❌'} Inventory Service: ${resInventory.status} - ${resInventory.status === 200 ? 'PASSED' : 'FAILED'}`);
    if (!inventoryOk) {
        console.error(`❌ Inventory Service failed: ${resInventory.status} ${resInventory.body}`);
    }

    // 4. Check Supplier Service through Gateway
    const supplierUrl = __ENV.SUPPLIER_URL || `${GATEWAY_URL}/api/supplier`;
    const resSupplier = http.get(supplierUrl, params);
    const supplierOk = resSupplier.status === 200;
    check(resSupplier, {
        'Supplier Service UP': (r) => r.status === 200,
    });
    console.log(`${supplierOk ? '✅' : '❌'} Supplier Service: ${resSupplier.status} - ${resSupplier.status === 200 ? 'PASSED' : 'FAILED'}`);
    if (!supplierOk) {
        console.error(`❌ Supplier Service failed: ${resSupplier.status} ${resSupplier.body}`);
    }

    // 5. Check Order Management Service through Gateway
    const orderUrl = __ENV.ORDER_URL || `${GATEWAY_URL}/api/order`;
    const resOrder = http.get(orderUrl, params);
    const orderOk = resOrder.status === 200;
    check(resOrder, {
        'Order Service UP': (r) => r.status === 200,
    });
    console.log(`${orderOk ? '✅' : '❌'} Order Service: ${resOrder.status} - ${resOrder.status === 200 ? 'PASSED' : 'FAILED'}`);
    if (!orderOk) {
        console.error(`❌ Order Service failed: ${resOrder.status} ${resOrder.body}`);
    }

    // 6. Check Identity Service through Gateway
    const identityUrl = __ENV.IDENTITY_URL || `${GATEWAY_URL}/api/identity/health`;
    const resIdentity = http.get(identityUrl, params);
    const identityOk = resIdentity.status === 200 || resIdentity.status === 401;
    check(resIdentity, {
        'Identity Service UP': (r) => r.status === 200 || r.status === 401,
    });
    console.log(`${identityOk ? '✅' : '❌'} Identity Service: ${resIdentity.status} - ${identityOk ? 'PASSED' : 'FAILED'}`);
    if (!identityOk) {
        console.error(`❌ Identity Service failed: ${resIdentity.status} ${resIdentity.body}`);
    }

    // Summary
    const allPassed = gatewayOk && productOk && inventoryOk && supplierOk && orderOk && identityOk;
    console.log(`\n📊 Test Summary: ${allPassed ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);

    sleep(1);
}