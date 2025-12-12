import { useState, useEffect } from 'react';
import axios from 'axios';

// Get Test Runner URL from env or default to localhost
const TEST_RUNNER_URL = import.meta.env.VITE_TEST_RUNNER_URL || 'http://localhost:3007/api';

function App() {
    const [testType, setTestType] = useState('smoke');
    const [vus, setVus] = useState(1);
    const [duration, setDuration] = useState('10s');
    const [targetUrl, setTargetUrl] = useState('http://api-gateway:80');
    const [isRunning, setIsRunning] = useState(false);
    const [currentTestId, setCurrentTestId] = useState(null);
    const [logs, setLogs] = useState([]);
    const [result, setResult] = useState(null);

    const startTest = async () => {
        setIsRunning(true);
        setLogs([]);
        setResult(null);
        try {
            const response = await axios.post(`${TEST_RUNNER_URL}/tests/run`, {
                testType,
                vus: parseInt(vus),
                duration,
                targetUrl
            });
            setCurrentTestId(response.data.testId);
        } catch (error) {
            console.error("Failed to start test", error);
            setIsRunning(false);
            setLogs(prev => [...prev, `❌ Error starting test: ${error.message}`]);
        }
    };

    useEffect(() => {
        let interval;
        if (isRunning && currentTestId) {
            interval = setInterval(async () => {
                try {
                    const statusRes = await axios.get(`${TEST_RUNNER_URL}/tests/${currentTestId}/status`);
                    const logsRes = await axios.get(`${TEST_RUNNER_URL}/tests/${currentTestId}/logs`);

                    setLogs(logsRes.data.logs || []);

                    if (statusRes.data.status === 'completed' || statusRes.data.status === 'failed') {
                        setIsRunning(false);
                        setResult(statusRes.data.status);
                        clearInterval(interval);
                    }
                } catch (err) {
                    console.error("Error polling status", err);
                }
            }, 1000); // Poll every second
        }
        return () => clearInterval(interval);
    }, [isRunning, currentTestId]);

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans p-8">
            <header className="mb-8 border-b border-gray-700 pb-4">
                <h1 className="text-3xl font-bold text-blue-400">🚀 KubeStock Test Dashboard</h1>
                <p className="text-gray-400 mt-2">Execute and monitor performance tests against your microservices.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Configuration Panel */}
                <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
                    <h2 className="text-xl font-semibold mb-4 text-gray-200">Test Configuration</h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Test Type</label>
                            <select
                                value={testType}
                                onChange={(e) => setTestType(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="smoke">Smoke Test (Fast)</option>
                                <option value="load">Load Test (Stress)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Target URL</label>
                            <input
                                type="text"
                                value={targetUrl}
                                onChange={(e) => setTargetUrl(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="http://localhost:5173"
                            />
                            <p className="text-xs text-gray-500 mt-1">Use <code>http://api-gateway:80</code> for internal testing.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Users (VUs)</label>
                                <input
                                    type="number"
                                    value={vus}
                                    onChange={(e) => setVus(e.target.value)}
                                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Duration</label>
                                <input
                                    type="text"
                                    value={duration}
                                    onChange={(e) => setDuration(e.target.value)}
                                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g. 10s, 5m"
                                />
                            </div>
                        </div>

                        <button
                            onClick={startTest}
                            disabled={isRunning}
                            className={`w-full py-3 rounded font-bold transition-all ${isRunning
                                    ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                }`}
                        >
                            {isRunning ? 'Run in Progress...' : 'Start Test Run'}
                        </button>
                    </div>
                </div>

                {/* Execution View */}
                <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-lg flex flex-col h-[600px] overflow-hidden">
                    <div className="bg-black p-3 border-b border-gray-800 flex justify-between items-center">
                        <span className="text-gray-400 font-mono text-sm">Console Output</span>
                        <div className="flex items-center space-x-2">
                            {isRunning && <span className="animate-pulse w-3 h-3 bg-green-500 rounded-full"></span>}
                            <span className={`text-xs uppercase font-bold px-2 py-1 rounded ${result === 'completed' ? 'bg-green-900 text-green-300' :
                                    result === 'failed' ? 'bg-red-900 text-red-300' :
                                        isRunning ? 'bg-blue-900 text-blue-300' : 'bg-gray-800 text-gray-500'
                                }`}>
                                {result || (isRunning ? 'Running' : 'Idle')}
                            </span>
                        </div>
                    </div>

                    <div className="flex-1 bg-black p-4 overflow-y-auto font-mono text-sm text-green-400 whitespace-pre-wrap">
                        {logs.length === 0 ? (
                            <div className="text-gray-600 italic text-center mt-20">Waiting for test execution...</div>
                        ) : (
                            logs.map((line, i) => (
                                <div key={i} className="mb-0.5">{line}</div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

export default App;
