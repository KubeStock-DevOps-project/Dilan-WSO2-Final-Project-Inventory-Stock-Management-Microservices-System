const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');
const path = require('path');
const { getAccessToken, getUserAccessToken, getM2MAccessToken } = require('./auth');

// Prometheus metrics
const client = require('prom-client');
const register = new client.Registry();

// Default metrics (process, memory, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics for test-runner
const testRunsTotal = new client.Counter({
    name: 'test_runner_runs_total',
    help: 'Total number of test runs',
    labelNames: ['test_type', 'status'],
    registers: [register]
});

const testDuration = new client.Histogram({
    name: 'test_runner_duration_seconds',
    help: 'Duration of test runs in seconds',
    labelNames: ['test_type'],
    buckets: [5, 10, 30, 60, 120, 300, 600],
    registers: [register]
});

const activeTests = new client.Gauge({
    name: 'test_runner_active_tests',
    help: 'Number of currently running tests',
    registers: [register]
});

const authRequestsTotal = new client.Counter({
    name: 'test_runner_auth_requests_total',
    help: 'Total number of authentication requests',
    labelNames: ['auth_type', 'status'],
    registers: [register]
});

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3007;

// Store actively running tests
const runningTests = {};

app.get('/health', (req, res) => {
    res.json({ status: 'UP', service: 'test-runner' });
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (err) {
        res.status(500).end(err.message);
    }
});

/**
 * Run tests endpoint
 * @body {
 *   testType: 'smoke' | 'load',
 *   vus: number,
 *   duration: string,
 *   stages: array (for load tests),
 *   gatewayUrl: string (for smoke tests),
 *   serviceUrls: { product, inventory, supplier, order, identity } (for load tests - direct calls),
 *   auth: {
 *     username: string (optional - for user auth),
 *     password: string (optional - for user auth),
 *     useM2M: boolean (optional - force M2M auth)
 *   },
 *   webhookUrl: string (optional)
 * }
 */
app.post('/api/tests/run', async (req, res) => {
    const { 
        testType = 'smoke', 
        vus = 1, 
        duration = '5s',
        stages,
        gatewayUrl,
        serviceUrls = {},
        auth = {},
        webhookUrl 
    } = req.body;

    // Validate test type
    const scriptPath = path.join(__dirname, 'k6', `${testType}.js`);
    const fs = require('fs');
    if (!fs.existsSync(scriptPath)) {
        return res.status(400).json({ error: `Invalid test type: ${testType}` });
    }

    // Get Auth Token
    let accessToken = '';
    try {
        if (auth.username && auth.password) {
            // User authentication from request body
            console.log(`🔐 Authenticating user: ${auth.username}`);
            accessToken = await getUserAccessToken(auth.username, auth.password) || '';
            authRequestsTotal.inc({ auth_type: 'user', status: 'success' });
        } else if (auth.useM2M) {
            // Force M2M authentication
            console.log('🔐 Using M2M authentication');
            accessToken = await getM2MAccessToken() || '';
            authRequestsTotal.inc({ auth_type: 'm2m', status: 'success' });
        } else {
            // Default: Use environment variables (username/password or M2M)
            console.log('🔐 Using default authentication from environment');
            accessToken = await getAccessToken() || '';
            authRequestsTotal.inc({ auth_type: 'default', status: 'success' });
        }
    } catch (err) {
        authRequestsTotal.inc({ auth_type: 'unknown', status: 'failed' });
        return res.status(500).json({ error: 'Authentication failed', details: err.message });
    }

    // Construct k6 command based on test type
    let k6Command = '';
    let envVars = `-e ACCESS_TOKEN=${accessToken}`;

    if (testType === 'smoke') {
        // Smoke tests: Use gateway URL
        const targetUrl = gatewayUrl || process.env.GATEWAY_URL || 'http://host.docker.internal:5173';
        envVars += ` -e GATEWAY_URL=${targetUrl}`;
        
        // Pass service endpoints through gateway (with /api prefix)
        if (serviceUrls.product) envVars += ` -e PRODUCT_URL=${serviceUrls.product}`;
        if (serviceUrls.inventory) envVars += ` -e INVENTORY_URL=${serviceUrls.inventory}`;
        if (serviceUrls.supplier) envVars += ` -e SUPPLIER_URL=${serviceUrls.supplier}`;
        if (serviceUrls.order) envVars += ` -e ORDER_URL=${serviceUrls.order}`;
        if (serviceUrls.identity) envVars += ` -e IDENTITY_URL=${serviceUrls.identity}`;

        k6Command = `k6 run --vus ${vus} --duration ${duration} ${envVars} ${scriptPath}`;
        
    } else if (testType === 'load') {
        // Load tests: Direct microservice calls (no /api prefix)
        // Services are required for load tests
        if (!serviceUrls.product && !serviceUrls.inventory && !serviceUrls.supplier && !serviceUrls.order) {
            return res.status(400).json({ 
                error: 'Load tests require at least one service URL in serviceUrls (product, inventory, supplier, order)' 
            });
        }

        // Pass service URLs as environment variables for load test
        if (serviceUrls.product) envVars += ` -e PRODUCT_URL=${serviceUrls.product}`;
        if (serviceUrls.inventory) envVars += ` -e INVENTORY_URL=${serviceUrls.inventory}`;
        if (serviceUrls.supplier) envVars += ` -e SUPPLIER_URL=${serviceUrls.supplier}`;
        if (serviceUrls.order) envVars += ` -e ORDER_URL=${serviceUrls.order}`;
        if (serviceUrls.identity) envVars += ` -e IDENTITY_URL=${serviceUrls.identity}`;

        // Handle load test stages if provided, otherwise use vus + duration
        if (stages && Array.isArray(stages)) {
            // Custom stages provided
            const stagesJson = JSON.stringify(stages);
            envVars += ` -e STAGES='${stagesJson}'`;
            k6Command = `k6 run ${envVars} ${scriptPath}`;
        } else {
            // Use simple vus and duration
            k6Command = `k6 run --vus ${vus} --duration ${duration} ${envVars} ${scriptPath}`;
        }
    } else {
        return res.status(400).json({ error: `Unsupported test type: ${testType}` });
    }

    console.log(`🚀 Starting Test: ${k6Command}`);

    const testId = Date.now().toString();
    const testStartTime = Date.now();
    
    // Track active tests
    activeTests.inc();
    
    runningTests[testId] = {
        id: testId,
        status: 'running',
        startTime: new Date(),
        logs: [],
        cmd: k6Command,
        webhookUrl,
        testType
    };

    // Execute k6
    const child = exec(k6Command);

    // Ensure logs directory exists
    const logDir = path.join(process.cwd(), 'logs');
    try {
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir);
        }
    } catch (err) {
        console.error('❌ Failed to create log directory:', err.message);
    }
    const logFile = path.join(logDir, `${testId}.log`);

    child.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
            if (line.trim()) {
                const logLine = line;
                runningTests[testId].logs.push(logLine);
                console.log(logLine); // Print to stdout for Loki
                try {
                    fs.appendFileSync(logFile, logLine + '\n');
                } catch (e) { /* ignore write errors to avoid crash */ }
            }
        });
    });

    child.stderr.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
            if (line.trim()) {
                const logLine = `[stderr] ${line}`;
                runningTests[testId].logs.push(logLine);
                console.error(logLine); // Print to stderr for Loki
                try {
                    fs.appendFileSync(logFile, logLine + '\n');
                } catch (e) { /* ignore */ }
            }
        });
    });

    child.on('close', async (code) => {
        console.log(`🏁 Test ${testId} completed with code ${code}`);
        const status = code === 0 ? 'completed' : 'failed';
        runningTests[testId].status = status;
        runningTests[testId].exitCode = code;
        runningTests[testId].endTime = new Date();

        // Track metrics
        activeTests.dec();
        testRunsTotal.inc({ test_type: runningTests[testId].testType, status: status });
        const durationSeconds = (Date.now() - testStartTime) / 1000;
        testDuration.observe({ test_type: runningTests[testId].testType }, durationSeconds);

        // Handle Webhook Callback
        if (runningTests[testId].webhookUrl) {
            console.log(`📣 Sending webhook to ${runningTests[testId].webhookUrl}`);
            try {
                // Node.js 18+ has built-in fetch
                await fetch(runningTests[testId].webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        testId,
                        status,
                        exitCode: code,
                        startTime: runningTests[testId].startTime,
                        endTime: runningTests[testId].endTime
                    })
                });
            } catch (err) {
                console.error(`❌ Failed to send webhook: ${err.message}`);
            }
        }
    });

    // Valid Async REST Response
    res.status(202).location(`/api/tests/${testId}/status`).json({
        message: 'Test run accepted',
        testId,
        status: 'running',
        testType,
        links: {
            status: `/api/tests/${testId}/status`,
            logs: `/api/tests/${testId}/logs`
        }
    });
});

app.get('/api/tests/:id/status', (req, res) => {
    const test = runningTests[req.params.id];
    if (!test) {
        return res.status(404).json({ error: 'Test not found' });
    }
    res.json({
        id: test.id,
        status: test.status,
        exitCode: test.exitCode,
        startTime: test.startTime,
        endTime: test.endTime
    });
});

app.get('/api/tests/:id/logs', (req, res) => {
    const test = runningTests[req.params.id];
    if (!test) {
        return res.status(404).json({ error: 'Test not found' });
    }
    res.json({
        id: test.id,
        logs: test.logs
    });
});

const HOST = process.env.HOST || '127.0.0.1';

app.listen(PORT, HOST, () => {
    console.log(`✅ Test Runner Service listening on ${HOST}:${PORT}`);
});
