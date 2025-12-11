const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');
const path = require('path');
const { getAccessToken } = require('./auth');

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

app.post('/api/tests/run', async (req, res) => {
    const { testType = 'smoke', vus = 1, duration = '5s', targetUrl, serviceUrls = {} } = req.body;

    // Validate test type
    const scriptPath = path.join(__dirname, 'k6', `${testType}.js`);

    // Determine Base URL
    const baseUrl = targetUrl || process.env.GATEWAY_URL || 'http://host.docker.internal:5173';

    // Get Auth Token
    let accessToken = '';
    try {
        accessToken = await getAccessToken() || '';
    } catch (err) {
        return res.status(500).json({ error: 'Authentication failed', details: err.message });
    }

    // Construct k6 command
    // Pass params via environment variables to k6
    let envVars = `-e BASE_URL=${baseUrl} -e ACCESS_TOKEN=${accessToken}`;

    // Add specific service URLs if provided
    if (serviceUrls.product) envVars += ` -e PRODUCT_URL=${serviceUrls.product}`;
    if (serviceUrls.inventory) envVars += ` -e INVENTORY_URL=${serviceUrls.inventory}`;
    if (serviceUrls.supplier) envVars += ` -e SUPPLIER_URL=${serviceUrls.supplier}`;
    if (serviceUrls.order) envVars += ` -e ORDER_URL=${serviceUrls.order}`;
    if (serviceUrls.identity) envVars += ` -e IDENTITY_URL=${serviceUrls.identity}`;

    const cmd = `k6 run --vus ${vus} --duration ${duration} ${envVars} ${scriptPath}`;

    console.log(`🚀 Starting Test: ${cmd}`);

    const testId = Date.now().toString();
    runningTests[testId] = {
        id: testId,
        status: 'running',
        startTime: new Date(),
        logs: [],
        cmd
    };

    // Execute k6
    const child = exec(cmd);

    // Ensure logs directory exists
    // Ensure logs directory exists (Use /app/logs, NOT /app/src/logs because src is RO)
    const fs = require('fs');
    // WORKDIR is /app, so process.cwd() is /app. logs will be at /app/logs
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
                try {
                    fs.appendFileSync(logFile, logLine + '\n');
                } catch (e) { /* ignore */ }
            }
        });
    });

    child.on('close', (code) => {
        console.log(`🏁 Test ${testId} completed with code ${code}`);
        runningTests[testId].status = code === 0 ? 'completed' : 'failed';
        runningTests[testId].exitCode = code;
        runningTests[testId].endTime = new Date();
    });

    res.json({
        message: 'Test started',
        testId,
        config: { testType, vus, duration, baseUrl }
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
