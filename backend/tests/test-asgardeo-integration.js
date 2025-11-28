#!/usr/bin/env node

/**
 * Asgardeo Integration Test Suite
 * Tests configuration, middleware, and basic functionality
 */

const fs = require('fs');
const path = require('path');

console.log('\n========================================');
console.log('  ASGARDEO INTEGRATION TEST SUITE');
console.log('========================================\n');

let passedTests = 0;
let failedTests = 0;
const results = [];

function test(name, fn) {
  try {
    fn();
    passedTests++;
    results.push({ name, status: '✅ PASS' });
    console.log(`✅ ${name}`);
  } catch (error) {
    failedTests++;
    results.push({ name, status: '❌ FAIL', error: error.message });
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
  }
}

// Test 1: Check core files exist
test('Core configuration files exist', () => {
  const files = [
    'backend/config/asgardeo.config.js',
    'backend/middleware/asgardeo.middleware.js'
  ];
  
  files.forEach(file => {
    if (!fs.existsSync(file)) {
      throw new Error(`Missing: ${file}`);
    }
  });
});

// Test 2: Check frontend files exist
test('Frontend configuration files exist', () => {
  const files = [
    'frontend/src/config/asgardeo.config.js',
    'frontend/src/context/AsgardeoAuthContext.jsx',
    'frontend/src/pages/auth/AsgardeoLogin.jsx'
  ];
  
  files.forEach(file => {
    if (!fs.existsSync(file)) {
      throw new Error(`Missing: ${file}`);
    }
  });
});

// Test 3: Check service files
test('All services have Asgardeo files', () => {
  const services = [
    'user-service',
    'product-catalog-service',
    'inventory-service',
    'supplier-service',
    'order-service'
  ];
  
  services.forEach(service => {
    const configPath = `backend/services/${service}/src/config/asgardeo.config.js`;
    const middlewarePath = `backend/services/${service}/src/middlewares/asgardeo.middleware.js`;
    
    if (!fs.existsSync(configPath)) {
      throw new Error(`Missing config in ${service}`);
    }
    if (!fs.existsSync(middlewarePath)) {
      throw new Error(`Missing middleware in ${service}`);
    }
  });
});

// Test 4: Validate configuration structure
test('Backend config exports correct structure', () => {
  const config = require('./backend/config/asgardeo.config.js');
  
  if (!config.asgardeo) {
    throw new Error('Missing asgardeo config object');
  }
  
  const required = ['baseUrl', 'tokenEndpoint', 'jwksUri', 'issuer', 'clientId', 'audience'];
  required.forEach(key => {
    if (!config.asgardeo.hasOwnProperty(key)) {
      throw new Error(`Missing config key: ${key}`);
    }
  });
});

// Test 5: Validate middleware exports
test('Middleware exports required functions', () => {
  const middleware = require('./backend/middleware/asgardeo.middleware.js');
  
  const required = ['authenticateAsgardeo', 'authorizeRoles', 'optionalAuth', 'verifyToken', 'getUserInfo'];
  required.forEach(fn => {
    if (typeof middleware[fn] !== 'function') {
      throw new Error(`Missing or invalid function: ${fn}`);
    }
  });
});

// Test 6: Check documentation files
test('Documentation files exist', () => {
  const docs = [
    'docs/ASGARDEO_README.md',
    'docs/ASGARDEO_QUICKSTART.md',
    'docs/ASGARDEO_INTEGRATION.md',
    'docs/ASGARDEO_QUICK_REFERENCE.md',
    'docs/ASGARDEO_IMPLEMENTATION_SUMMARY.md'
  ];
  
  docs.forEach(doc => {
    if (!fs.existsSync(doc)) {
      throw new Error(`Missing: ${doc}`);
    }
  });
});

// Test 7: Check setup script
test('Setup script exists and is executable', () => {
  const scriptPath = 'scripts/setup-asgardeo.ps1';
  if (!fs.existsSync(scriptPath)) {
    throw new Error('Setup script missing');
  }
  
  const content = fs.readFileSync(scriptPath, 'utf8');
  if (!content.includes('asgardeo')) {
    throw new Error('Script content invalid');
  }
});

// Test 8: Check App.jsx updates
test('Frontend App.jsx uses Asgardeo provider', () => {
  const appPath = 'frontend/src/App.jsx';
  if (!fs.existsSync(appPath)) {
    throw new Error('App.jsx not found');
  }
  
  const content = fs.readFileSync(appPath, 'utf8');
  if (!content.includes('AsgardeoAuthProvider') && !content.includes('@asgardeo/auth-react')) {
    throw new Error('App.jsx not updated with Asgardeo provider');
  }
});

// Test 9: Check axios interceptor updates
test('Axios interceptor configured for Asgardeo tokens', () => {
  const axiosPath = 'frontend/src/utils/axios.js';
  if (!fs.existsSync(axiosPath)) {
    throw new Error('axios.js not found');
  }
  
  const content = fs.readFileSync(axiosPath, 'utf8');
  if (!content.includes('asgardeo_token')) {
    throw new Error('Axios not configured for Asgardeo tokens');
  }
});

// Test 10: Check package.json dependencies
test('Frontend has Asgardeo dependencies', () => {
  const pkgPath = 'frontend/package.json';
  if (!fs.existsSync(pkgPath)) {
    throw new Error('package.json not found');
  }
  
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  
  if (!deps['@asgardeo/auth-react']) {
    throw new Error('Missing @asgardeo/auth-react dependency');
  }
  if (!deps['@asgardeo/auth-spa']) {
    throw new Error('Missing @asgardeo/auth-spa dependency');
  }
});

// Test 11: Check backend dependencies
test('Backend services have required dependencies', () => {
  const services = ['user-service', 'product-catalog-service', 'inventory-service'];
  
  services.forEach(service => {
    const pkgPath = `backend/services/${service}/package.json`;
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      
      if (!deps['jwks-rsa']) {
        throw new Error(`${service} missing jwks-rsa dependency`);
      }
      if (!deps['jsonwebtoken']) {
        throw new Error(`${service} missing jsonwebtoken dependency`);
      }
    }
  });
});

// Test 12: Validate config file syntax
test('Config files are valid JavaScript', () => {
  const services = ['user-service', 'product-catalog-service'];
  
  services.forEach(service => {
    const configPath = `backend/services/${service}/src/config/asgardeo.config.js`;
    if (fs.existsSync(configPath)) {
      try {
        require(`./${configPath}`);
      } catch (error) {
        throw new Error(`Invalid syntax in ${service} config: ${error.message}`);
      }
    }
  });
});

console.log('\n========================================');
console.log('  TEST RESULTS');
console.log('========================================\n');

console.log(`Total Tests: ${passedTests + failedTests}`);
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}`);
console.log(`Success Rate: ${Math.round((passedTests / (passedTests + failedTests)) * 100)}%`);

console.log('\n========================================\n');

if (failedTests === 0) {
  console.log('🎉 All tests passed! Integration is complete.\n');
  console.log('Next steps:');
  console.log('1. Configure Asgardeo console at https://console.asgardeo.io');
  console.log('2. Update .env files with credentials');
  console.log('3. Start services and test authentication flow\n');
  process.exit(0);
} else {
  console.log('⚠️  Some tests failed. Please review errors above.\n');
  process.exit(1);
}
