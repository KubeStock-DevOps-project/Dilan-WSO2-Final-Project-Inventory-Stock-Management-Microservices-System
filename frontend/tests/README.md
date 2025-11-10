# Frontend Test Suite

This folder contains all testing files for the React frontend application.

## Test Organization

```
tests/
├── unit/              # Unit tests for components and utilities
├── integration/       # Integration tests for feature flows
├── e2e/              # End-to-end tests with Cypress/Playwright
├── fixtures/         # Test data and mock objects
└── README.md         # This file
```

## Current Status

⚠️ **Tests are currently being set up.** This project is ready for test implementation.

## Recommended Testing Stack

### Unit & Integration Testing
- **Vitest** - Fast, Vite-native test runner
- **@testing-library/react** - React component testing utilities
- **@testing-library/user-event** - User interaction simulation
- **@testing-library/jest-dom** - Custom matchers for assertions

### E2E Testing
- **Playwright** - Modern E2E testing (Recommended)
- **Cypress** - Alternative E2E framework

### Installation

```bash
cd frontend

# Install Vitest and Testing Library
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom

# Install Playwright (optional, for E2E)
npm install -D @playwright/test
npx playwright install
```

## Setting Up Tests

### 1. Update package.json

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test"
  }
}
```

### 2. Create vitest.config.js

```javascript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.js',
    coverage: {
      reporter: ['text', 'json', 'html']
    }
  }
});
```

### 3. Create tests/setup.js

```javascript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});
```

## Writing Tests

### Unit Test Example

Create `tests/unit/components/Button.test.jsx`:

```javascript
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import Button from '../../../src/components/common/Button';

describe('Button Component', () => {
  it('renders with text', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    
    await userEvent.click(screen.getByText('Click Me'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('applies variant classes', () => {
    render(<Button variant="primary">Button</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-blue-600');
  });
});
```

### Service Test Example

Create `tests/unit/services/authService.test.js`:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '../../../src/services/authService';
import axios from '../../../src/utils/axios';

vi.mock('../../../src/utils/axios');

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('login returns user data and token', async () => {
    const mockResponse = {
      data: {
        token: 'abc123',
        user: { id: 1, email: 'test@example.com' }
      }
    };
    axios.post.mockResolvedValue(mockResponse);

    const result = await authService.login('test@example.com', 'password');
    
    expect(axios.post).toHaveBeenCalledWith('/api/auth/login', {
      email: 'test@example.com',
      password: 'password'
    });
    expect(result).toEqual(mockResponse.data);
  });
});
```

### Integration Test Example

Create `tests/integration/LoginFlow.test.jsx`:

```javascript
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Login from '../../../src/pages/auth/Login';
import { AuthProvider } from '../../../src/context/AuthContext';

describe('Login Flow', () => {
  it('successful login redirects to dashboard', async () => {
    const { container } = render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>
    );

    // Fill in form
    await userEvent.type(screen.getByLabelText(/email/i), 'admin@ims.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'admin123');
    
    // Submit
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    // Wait for redirect
    await waitFor(() => {
      expect(window.location.pathname).toBe('/dashboard');
    });
  });
});
```

### E2E Test Example

Create `tests/e2e/inventory.spec.js`:

```javascript
import { test, expect } from '@playwright/test';

test.describe('Inventory Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await page.fill('[name="email"]', 'admin@ims.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('can view inventory list', async ({ page }) => {
    await page.goto('http://localhost:5173/inventory');
    await expect(page.locator('h1')).toContainText('Inventory');
    await expect(page.locator('table')).toBeVisible();
  });

  test('can adjust stock quantity', async ({ page }) => {
    await page.goto('http://localhost:5173/inventory/adjust');
    await page.selectOption('[name="product"]', { label: 'Test Product' });
    await page.fill('[name="quantity"]', '10');
    await page.click('button:has-text("Adjust Stock")');
    
    await expect(page.locator('.toast-success')).toBeVisible();
  });
});
```

## Running Tests

```bash
# Run all tests
npm test

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage

# Run specific test file
npm test Button.test.jsx

# Run E2E tests
npm run test:e2e

# Run E2E in headed mode
npx playwright test --headed
```

## Test Coverage Goals

- **Unit Tests**: 80%+ coverage
- **Integration Tests**: Critical user flows
- **E2E Tests**: Happy paths and key features

## Testing Best Practices

### ✅ DO

- Test user behavior, not implementation
- Use semantic queries (getByRole, getByLabelText)
- Mock external dependencies (APIs, services)
- Keep tests focused and isolated
- Use meaningful test descriptions
- Clean up after tests

### ❌ DON'T

- Test implementation details
- Rely on class names or IDs for queries
- Write tests that depend on each other
- Mock everything (test real behavior when possible)
- Duplicate test logic
- Commit failing tests

## Continuous Integration

### GitHub Actions Example

```yaml
name: Frontend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test -- --coverage
      - run: npm run test:e2e
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library React](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Contributing

When adding tests:

1. Place in appropriate folder (unit/integration/e2e)
2. Follow naming convention: `[ComponentName].test.[jsx|js]`
3. Include both happy path and edge cases
4. Add tests for bug fixes
5. Update this README if adding new test categories
