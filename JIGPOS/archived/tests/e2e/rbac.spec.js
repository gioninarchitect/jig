/**
 * RBAC (Role-Based Access Control) Tests
 * Verifies that users only see tabs they have permission to access
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3001';

const TEST_USERS = {
  admin: {
    email: 'admin@basothomedicalherbs.ls',
    password: 'Admin123!',
    role: 'admin',
    expectedTabs: ['inventory', 'pos', 'payments', 'affiliates', 'vouchers', 'orders', 'users', 'staff', 'leads']
  },
  manager: {
    email: 'manager@basothomedicalherbs.ls',
    password: 'Manager123!',
    role: 'staff_manager',
    expectedTabs: ['inventory', 'pos', 'payments', 'orders', 'staff', 'leads'],
    hiddenTabs: ['affiliates', 'vouchers', 'users']
  },
  assistant: {
    email: 'assistant@basothomedicalherbs.ls',
    password: 'Assistant123!',
    role: 'staff_assistant',
    expectedTabs: ['pos'],
    hiddenTabs: ['inventory', 'payments', 'affiliates', 'vouchers', 'orders', 'users', 'staff', 'leads']
  }
};

test.describe('RBAC - Role-Based Access Control', () => {

  test('Admin: Should see all tabs', async ({ page }) => {
    console.log('\n===== ADMIN RBAC TEST =====');
    const user = TEST_USERS.admin;

    // Login
    await page.goto(`${BASE_URL}/login.html`);
    await page.locator('#loginForm input[type="email"]').fill(user.email);
    await page.locator('#loginForm input[type="password"]').fill(user.password);
    await page.locator('#loginForm button[type="submit"]').click();
    await page.waitForURL('**/admin.html', { timeout: 10000 });
    console.log('✓ Logged in as admin');

    // Wait for RBAC to be applied
    await page.waitForTimeout(1000);

    // Check all expected tabs are visible
    for (const tabName of user.expectedTabs) {
      const tab = page.locator(`.tab-nav .tab[onclick="showMainTab('${tabName}')"]`);
      const isVisible = await tab.isVisible();
      console.log(`Tab "${tabName}": ${isVisible ? '✓ VISIBLE' : '✗ HIDDEN'}`);
      expect(isVisible).toBe(true);
    }

    console.log('✅ PASSED: Admin can see all tabs\n');
  });

  test('Manager: Should only see allowed tabs', async ({ page }) => {
    console.log('\n===== MANAGER RBAC TEST =====');
    const user = TEST_USERS.manager;

    // Login
    await page.goto(`${BASE_URL}/login.html`);
    await page.locator('#loginForm input[type="email"]').fill(user.email);
    await page.locator('#loginForm input[type="password"]').fill(user.password);
    await page.locator('#loginForm button[type="submit"]').click();
    await page.waitForURL('**/admin.html', { timeout: 10000 });
    console.log('✓ Logged in as manager');

    // Wait for RBAC to be applied
    await page.waitForTimeout(1000);

    // Check expected tabs are visible
    for (const tabName of user.expectedTabs) {
      const tab = page.locator(`.tab-nav .tab[onclick="showMainTab('${tabName}')"]`);
      const isVisible = await tab.isVisible();
      console.log(`Tab "${tabName}": ${isVisible ? '✓ VISIBLE' : '✗ HIDDEN'}`);
      expect(isVisible).toBe(true);
    }

    // Check hidden tabs are NOT visible
    for (const tabName of user.hiddenTabs) {
      const tab = page.locator(`.tab-nav .tab[onclick="showMainTab('${tabName}')"]`);
      const isVisible = await tab.isVisible();
      console.log(`Tab "${tabName}": ${isVisible ? '✗ SHOULD BE HIDDEN!' : '✓ HIDDEN'}`);
      expect(isVisible).toBe(false);
    }

    console.log('✅ PASSED: Manager RBAC working correctly\n');
  });

  test('Assistant: Should only see POS tab', async ({ page }) => {
    console.log('\n===== ASSISTANT RBAC TEST =====');
    const user = TEST_USERS.assistant;

    // Login
    await page.goto(`${BASE_URL}/login.html`);
    await page.locator('#loginForm input[type="email"]').fill(user.email);
    await page.locator('#loginForm input[type="password"]').fill(user.password);
    await page.locator('#loginForm button[type="submit"]').click();
    await page.waitForURL('**/admin.html', { timeout: 10000 });
    console.log('✓ Logged in as assistant');

    // Wait for RBAC to be applied and auto-navigate to POS
    await page.waitForTimeout(1500);

    // Check POS tab is visible
    const posTab = page.locator(`.tab-nav .tab[onclick="showMainTab('pos')"]`);
    const posVisible = await posTab.isVisible();
    console.log(`Tab "pos": ${posVisible ? '✓ VISIBLE' : '✗ HIDDEN'}`);
    expect(posVisible).toBe(true);

    // Check all other tabs are hidden
    for (const tabName of user.hiddenTabs) {
      const tab = page.locator(`.tab-nav .tab[onclick="showMainTab('${tabName}')"]`);
      const isVisible = await tab.isVisible();
      console.log(`Tab "${tabName}": ${isVisible ? '✗ SHOULD BE HIDDEN!' : '✓ HIDDEN'}`);
      expect(isVisible).toBe(false);
    }

    // Verify POS tab is active
    const posTabElement = await page.$('#pos-tab');
    if (posTabElement) {
      const displayStyle = await posTabElement.evaluate(el => window.getComputedStyle(el).display);
      console.log(`✓ POS tab display: ${displayStyle}`);
      expect(displayStyle).not.toBe('none');
    }

    console.log('✅ PASSED: Assistant RBAC working correctly\n');
  });
});
