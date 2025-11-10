# Frontend Utility Scripts

This folder contains utility scripts for development, build, and maintenance tasks.

## Script Organization

```
scripts/
├── build/              # Build and optimization scripts
├── deploy/            # Deployment automation
├── dev/               # Development utilities
└── README.md          # This file
```

## Common Scripts to Add

### 1. Build Scripts

#### analyze-bundle.js
Analyze bundle size and dependencies

```javascript
import { visualizer } from 'rollup-plugin-visualizer';

export default {
  plugins: [
    visualizer({
      filename: './dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true
    })
  ]
};
```

#### pre-build-check.js
Check for common issues before building

```javascript
#!/usr/bin/env node

console.log('🔍 Pre-build checks...');

// Check Node version
const nodeVersion = process.version;
if (parseInt(nodeVersion.slice(1)) < 18) {
  console.error('❌ Node.js >= 18 required');
  process.exit(1);
}

// Check for .env file
const fs = require('fs');
if (!fs.existsSync('.env')) {
  console.warn('⚠️  No .env file found');
}

console.log('✅ Pre-build checks passed');
```

### 2. Development Scripts

#### generate-component.js
Scaffold new components

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const componentName = process.argv[2];
if (!componentName) {
  console.error('Usage: node generate-component.js ComponentName');
  process.exit(1);
}

const componentDir = path.join(__dirname, '../src/components', componentName);
const template = `import React from 'react';

const ${componentName} = () => {
  return (
    <div>
      {/* ${componentName} */}
    </div>
  );
};

export default ${componentName};
`;

fs.mkdirSync(componentDir, { recursive: true });
fs.writeFileSync(path.join(componentDir, `${componentName}.jsx`), template);

console.log(`✅ Created ${componentName} component`);
```

Usage:
```bash
node scripts/generate-component.js MyNewComponent
```

#### clean-cache.js
Clear build caches and temporary files

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const dirsToClean = [
  'node_modules/.vite',
  'dist',
  '.vite-cache'
];

dirsToClean.forEach(dir => {
  const fullPath = path.join(__dirname, '..', dir);
  if (fs.existsSync(fullPath)) {
    fs.rmSync(fullPath, { recursive: true, force: true });
    console.log(`🧹 Cleaned: ${dir}`);
  }
});

console.log('✅ Cache cleaned');
```

### 3. Deployment Scripts

#### deploy-staging.sh
Deploy to staging environment

```bash
#!/bin/bash

echo "🚀 Deploying to staging..."

# Build production bundle
npm run build

# Upload to staging server
scp -r dist/* user@staging-server:/var/www/app

# Restart nginx
ssh user@staging-server "sudo systemctl restart nginx"

echo "✅ Deployed to staging"
```

#### health-check.js
Verify deployment health

```javascript
#!/usr/bin/env node

const axios = require('axios');

const services = [
  { name: 'User Service', url: 'http://localhost:3001/health' },
  { name: 'Product Service', url: 'http://localhost:3002/health' },
  { name: 'Inventory Service', url: 'http://localhost:3003/health' },
  { name: 'Supplier Service', url: 'http://localhost:3004/health' },
  { name: 'Order Service', url: 'http://localhost:3005/health' }
];

async function checkHealth() {
  console.log('🏥 Health Check\n');
  
  for (const service of services) {
    try {
      const response = await axios.get(service.url, { timeout: 5000 });
      console.log(`✅ ${service.name}: OK`);
    } catch (error) {
      console.log(`❌ ${service.name}: DOWN`);
    }
  }
}

checkHealth();
```

### 4. Maintenance Scripts

#### update-dependencies.sh
Update npm packages safely

```bash
#!/bin/bash

echo "📦 Checking for updates..."

# Check outdated packages
npm outdated

# Update dev dependencies
npm update --save-dev

# Update dependencies (non-breaking)
npm update --save

# Run tests
npm test

echo "✅ Dependencies updated"
```

#### generate-icons.js
Process and optimize icons

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const svgo = require('svgo');

const iconsDir = path.join(__dirname, '../public/icons');
const files = fs.readdirSync(iconsDir);

files.forEach(file => {
  if (file.endsWith('.svg')) {
    const filePath = path.join(iconsDir, file);
    const svg = fs.readFileSync(filePath, 'utf8');
    const optimized = svgo.optimize(svg);
    fs.writeFileSync(filePath, optimized.data);
    console.log(`✅ Optimized: ${file}`);
  }
});
```

## NPM Script Integration

Add to `package.json`:

```json
{
  "scripts": {
    "script:component": "node scripts/generate-component.js",
    "script:clean": "node scripts/clean-cache.js",
    "script:health": "node scripts/health-check.js",
    "script:analyze": "vite build --mode analyze",
    "prebuild": "node scripts/pre-build-check.js"
  }
}
```

## Usage Examples

```bash
# Generate new component
npm run script:component -- Button

# Clean build cache
npm run script:clean

# Check service health
npm run script:health

# Analyze bundle
npm run script:analyze
```

## Script Guidelines

### Best Practices

- ✅ Use `#!/usr/bin/env node` for Node scripts
- ✅ Use `#!/bin/bash` for shell scripts
- ✅ Include error handling
- ✅ Add usage instructions in comments
- ✅ Log progress with clear messages
- ✅ Exit with appropriate codes (0 = success, 1 = error)
- ✅ Make scripts idempotent when possible

### Script Template

```javascript
#!/usr/bin/env node

/**
 * Script Name: [name]
 * Purpose: [what it does]
 * Usage: node [script-name].js [args]
 * Author: [name]
 * Date: [YYYY-MM-DD]
 */

const main = async () => {
  try {
    console.log('🚀 Starting script...');
    
    // Your logic here
    
    console.log('✅ Script completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

main();
```

## Common Use Cases

### 1. Environment Setup

```javascript
// setup-env.js
const fs = require('fs');

const environments = {
  development: {
    VITE_API_URL: 'http://localhost:3000',
    VITE_ENV: 'development'
  },
  production: {
    VITE_API_URL: 'https://api.production.com',
    VITE_ENV: 'production'
  }
};

const env = process.argv[2] || 'development';
const config = environments[env];

const envContent = Object.entries(config)
  .map(([key, value]) => `${key}=${value}`)
  .join('\n');

fs.writeFileSync('.env', envContent);
console.log(`✅ Environment set to: ${env}`);
```

### 2. Code Generation

```javascript
// generate-api-service.js
const fs = require('fs');

const serviceName = process.argv[2];
const template = `
import axios from '../utils/axios';

export const ${serviceName}Service = {
  getAll: () => axios.get('/api/${serviceName}'),
  getById: (id) => axios.get(\`/api/${serviceName}/\${id}\`),
  create: (data) => axios.post('/api/${serviceName}', data),
  update: (id, data) => axios.put(\`/api/${serviceName}/\${id}\`, data),
  delete: (id) => axios.delete(\`/api/${serviceName}/\${id}\`)
};
`;

fs.writeFileSync(`src/services/${serviceName}Service.js`, template);
console.log(`✅ Created ${serviceName}Service`);
```

### 3. Performance Monitoring

```javascript
// check-bundle-size.js
const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '../dist/assets');
const maxSize = 500 * 1024; // 500KB

const files = fs.readdirSync(distPath);
let hasIssues = false;

files.forEach(file => {
  const stats = fs.statSync(path.join(distPath, file));
  const sizeKB = (stats.size / 1024).toFixed(2);
  
  if (stats.size > maxSize) {
    console.log(`⚠️  ${file}: ${sizeKB}KB (exceeds 500KB)`);
    hasIssues = true;
  } else {
    console.log(`✅ ${file}: ${sizeKB}KB`);
  }
});

if (hasIssues) {
  console.log('\n❌ Bundle size check failed');
  process.exit(1);
}
```

## CI/CD Integration

```yaml
# .github/workflows/frontend.yml
- name: Run Pre-build Checks
  run: npm run prebuild

- name: Check Bundle Size
  run: |
    npm run build
    node scripts/check-bundle-size.js
```

## Contributing

When adding scripts:

1. Choose appropriate subdirectory
2. Add shebang line for executable scripts
3. Include documentation header
4. Add to NPM scripts if commonly used
5. Test thoroughly
6. Update this README
