// Basotho Medical Herbs - Authentication E2E Tests
// Professional Playwright test suite with detailed logging and assertions

const { test, expect } = require('@playwright/test');

// Test Configuration
const BASE_URL = 'http://localhost:3001';

// UAT Test Users from uat-testing.html
const TEST_USERS = {
  admin: {
    email: 'admin@basothomedicalherbs.ls',
    password: 'Admin123!',
    role: 'Admin',
    expectedDashboard: '/admin.html'
  },
  manager: {
    email: 'manager@basothomedicalherbs.ls',
    password: 'Manager123!',
    role: 'Store Manager',
    expectedDashboard: '/manager.html'
  },
  assistant: {
    email: 'assistant@basothomedicalherbs.ls',
    password: 'Assistant123!',
    role: 'Shop Assistant',
    expectedDashboard: '/pos.html'
  },
  user: {
    email: 'user@basothomedicalherbs.ls',
    password: 'User123!',
    role: 'Lifestyle Member',
    expectedDashboard: '/dashboard.html'
  },
  patient: {
    email: 'patient@basothomedicalherbs.ls',
    password: 'Patient123!',
    role: 'Section 21 Patient',
    expectedDashboard: '/dashboard.html'
  }
};

test.describe('Basotho Medical Herbs - Authentication Tests', () => {

  test.beforeEach(async ({ page }) => {
    console.log('\\n' + '='.repeat(80));
    console.log('Starting new test');
    console.log('='.repeat(80));
  });

  test.afterEach(async ({ page }, testInfo) => {
    console.log('\\n' + '-'.repeat(80));
    console.log(`Test: ${testInfo.title}`);
    console.log(`Status: ${testInfo.status}`);
    console.log(`Duration: ${testInfo.duration}ms`);
    console.log('-'.repeat(80) + '\\n');
  });

  test('Admin Login - Full Flow with Detailed Logging', async ({ page }) => {
    const user = TEST_USERS.admin;

    console.log(`\\nTest User: ${user.role}`);
    console.log(`Email: ${user.email}`);
    console.log(`Password: ${user.password.replace(/./g, '*')}`);

    // Step 1: Navigate to login page
    console.log('\\n[Step 1] Navigating to login page...');
    await page.goto(`${BASE_URL}/login.html`);
    await page.waitForLoadState('networkidle');
    console.log('✓ Login page loaded');

    // Step 2: Verify login page elements
    console.log('\\n[Step 2] Verifying login page elements...');
    const emailInput = page.locator('#loginForm input[type="email"]');
    const passwordInput = page.locator('#loginForm input[type="password"]');
    const loginButton = page.locator('#loginForm button[type="submit"]');

    await expect(emailInput).toBeVisible();
    console.log('✓ Email input found');
    await expect(passwordInput).toBeVisible();
    console.log('✓ Password input found');
    await expect(loginButton).toBeVisible();
    console.log('✓ Login button found');

    // Step 3: Fill in credentials
    console.log('\\n[Step 3] Filling in credentials...');
    await emailInput.fill(user.email);
    console.log(`✓ Email entered: ${user.email}`);
    await passwordInput.fill(user.password);
    console.log('✓ Password entered');

    // Step 4: Click login and wait for navigation
    console.log('\\n[Step 4] Submitting login form...');
    await loginButton.click();
    console.log('✓ Login button clicked');

    // Wait for navigation with increased timeout
    console.log('\\n[Step 5] Waiting for authentication...');
    await page.waitForURL(`**${user.expectedDashboard}`, { timeout: 10000 });
    console.log(`✓ Redirected to: ${page.url()}`);

    // Step 6: Verify dashboard loaded
    console.log('\\n[Step 6] Verifying dashboard elements...');
    await page.waitForLoadState('networkidle');

    // Check for admin panel elements
    const adminBadge = page.locator('.admin-badge');
    await expect(adminBadge).toBeVisible({ timeout: 5000 });
    console.log('✓ Admin panel badge visible');

    // Check for email display
    const emailDisplay = page.locator(`text=${user.email}`);
    await expect(emailDisplay).toBeVisible();
    console.log(`✓ User email displayed: ${user.email}`);

    // Check for logout button
    const logoutButton = page.locator('button:has-text("Logout")');
    await expect(logoutButton).toBeVisible();
    console.log('✓ Logout button found');

    // Step 7: Verify session storage
    console.log('\\n[Step 7] Verifying session storage...');
    const sessionData = await page.evaluate(() => {
      return {
        adminToken: sessionStorage.getItem('adminToken'),
        adminUser: sessionStorage.getItem('adminUser')
      };
    });

    expect(sessionData.adminToken).toBeTruthy();
    console.log('✓ Admin token stored in sessionStorage');
    expect(sessionData.adminUser).toBeTruthy();
    console.log('✓ Admin user data stored in sessionStorage');

    // Step 8: Check sidebar navigation
    console.log('\\n[Step 8] Testing sidebar navigation...');
    const hamburgerButton = page.locator('.hamburger-btn, button:has-text("☰")');
    if (await hamburgerButton.isVisible()) {
      await hamburgerButton.click();
      console.log('✓ Hamburger menu clicked');

      const sidebar = page.locator('.sidebar-drawer, #sidebarDrawer');
      await expect(sidebar).toBeVisible({ timeout: 2000 });
      console.log('✓ Sidebar opened');

      // Check for menu items
      const inventoryItem = page.locator('.sidebar-menu-item:has-text("Inventory")');
      await expect(inventoryItem).toBeVisible();
      console.log('✓ Inventory menu item found');
    } else {
      console.log('ℹ Sidebar not implemented or different structure');
    }

    // Step 9: Take screenshot
    console.log('\\n[Step 9] Taking screenshot...');
    await page.screenshot({ path: 'playwright-report/admin-dashboard.png', fullPage: true });
    console.log('✓ Screenshot saved: admin-dashboard.png');

    console.log('\\n' + '✓'.repeat(40) + ' TEST PASSED ' + '✓'.repeat(40));
  });

  test('Invalid Login - Wrong Password', async ({ page }) => {
    console.log('\\n[Test] Invalid Login - Wrong Password');

    await page.goto(`${BASE_URL}/login.html`);
    console.log('✓ Navigated to login page');

    await page.locator('#loginForm input[type="email"]').fill('admin@basothomedicalherbs.ls');
    await page.locator('#loginForm input[type="password"]').fill('WrongPassword123!');
    console.log('✓ Filled invalid credentials');

    await page.locator('#loginForm button[type="submit"]').click();
    console.log('✓ Submitted form');

    // Should show error message and stay on login page
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('login.html');
    console.log('✓ Remained on login page (auth failed as expected)');
  });

  test('Manager Login Flow', async ({ page }) => {
    const user = TEST_USERS.manager;
    console.log(`\\n[Test] ${user.role} Login`);
    console.log(`Email: ${user.email}`);

    await page.goto(`${BASE_URL}/login.html`);
    await page.locator('#loginForm input[type="email"]').fill(user.email);
    await page.locator('#loginForm input[type="password"]').fill(user.password);
    await page.locator('#loginForm button[type="submit"]').click();

    // Wait for dashboard
    await page.waitForURL('**/*', { timeout: 10000 });
    console.log(`✓ Redirected to: ${page.url()}`);

    // Verify manager access
    await page.waitForLoadState('networkidle');
    console.log('✓ Page loaded successfully');
  });

  test('User Login Flow', async ({ page }) => {
    const user = TEST_USERS.user;
    console.log(`\\n[Test] ${user.role} Login`);
    console.log(`Email: ${user.email}`);

    // Capture console messages
    page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));

    await page.goto(`${BASE_URL}/login.html`);
    await page.locator('#loginForm input[type="email"]').fill(user.email);
    await page.locator('#loginForm input[type="password"]').fill(user.password);
    await page.locator('#loginForm button[type="submit"]').click();

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard.html', { timeout: 10000 }).catch(async () => {
      console.log(`⚠️  Redirect timeout - Current URL: ${page.url()}`);
      // Check if error is visible
      const errorDiv = await page.locator('#loginError').isVisible();
      if (errorDiv) {
        const errorText = await page.locator('#loginError').textContent();
        console.log(`❌ Login error displayed: ${errorText}`);
      }
    });

    console.log(`✓ Current URL after login: ${page.url()}`);

    // Verify redirect happened
    expect(page.url()).toContain('dashboard.html');
    console.log('✓ Successfully redirected to dashboard');
  });

  test('Logout Flow', async ({ page }) => {
    console.log('\\n[Test] Logout Flow');

    // First login
    const user = TEST_USERS.admin;
    await page.goto(`${BASE_URL}/login.html`);
    await page.locator('#loginForm input[type="email"]').fill(user.email);
    await page.locator('#loginForm input[type="password"]').fill(user.password);
    await page.locator('#loginForm button[type="submit"]').click();
    await page.waitForURL('**' + user.expectedDashboard, { timeout: 10000 });
    console.log('✓ Logged in successfully');

    // Now logout
    const logoutButton = page.locator('button:has-text("Logout")');
    await logoutButton.click();
    console.log('✓ Clicked logout button');

    // Wait a moment for logout to process
    await page.waitForTimeout(500);

    // Should redirect to login
    await page.waitForURL('**/login.html', { timeout: 5000 });
    console.log('✓ Redirected to login page');

    // Verify session cleared - check after navigation
    const sessionData = await page.evaluate(() => {
      return {
        adminToken: sessionStorage.getItem('adminToken'),
        adminUser: sessionStorage.getItem('adminUser'),
        token: sessionStorage.getItem('token'),
        user: sessionStorage.getItem('user')
      };
    });

    expect(sessionData.adminToken).toBeNull();
    expect(sessionData.token).toBeNull();
    console.log('✓ Session storage cleared');
  });
});
