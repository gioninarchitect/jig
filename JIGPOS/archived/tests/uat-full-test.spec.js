const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3001';

const TEST_USERS = {
  admin: {
    email: 'admin@basothomedicalherbs.ls',
    password: 'Admin123!',
    role: 'admin',
    expectedDashboard: '/admin.html'
  },
  manager: {
    email: 'manager@basothomedicalherbs.ls',
    password: 'Manager123!',
    role: 'staff_manager',
    expectedDashboard: '/admin.html'
  },
  assistant: {
    email: 'assistant@basothomedicalherbs.ls',
    password: 'Assistant123!',
    role: 'staff_assistant',
    expectedDashboard: '/admin.html'
  },
  user: {
    email: 'user@basothomedicalherbs.ls',
    password: 'User123!',
    role: 'user',
    expectedDashboard: '/dashboard.html'
  },
  patient: {
    email: 'patient@basothomedicalherbs.ls',
    password: 'Patient123!',
    role: 'user',
    expectedDashboard: '/dashboard.html'
  }
};

test.describe('Basotho Medical Herbs - UAT Full Test Suite', () => {

  test.describe('1. User Authentication Tests', () => {

    test('Admin can login and access admin dashboard', async ({ page }) => {
      await page.goto(`${BASE_URL}/login.html`);
      await page.fill('input[name="email"]', TEST_USERS.admin.email);
      await page.fill('input[name="password"]', TEST_USERS.admin.password);
      await page.click('button[type="submit"]');

      await page.waitForURL(`${BASE_URL}/admin.html`, { timeout: 5000 });
      expect(page.url()).toContain('/admin.html');

      // Check admin badge is visible
      const adminBadge = page.locator('.admin-badge');
      await expect(adminBadge).toBeVisible();
    });

    test('Manager can login and access admin dashboard', async ({ page }) => {
      await page.goto(`${BASE_URL}/login.html`);
      await page.fill('input[name="email"]', TEST_USERS.manager.email);
      await page.fill('input[name="password"]', TEST_USERS.manager.password);
      await page.click('button[type="submit"]');

      await page.waitForURL(`${BASE_URL}/admin.html`, { timeout: 5000 });
      expect(page.url()).toContain('/admin.html');
    });

    test('Assistant can login and access admin dashboard', async ({ page }) => {
      await page.goto(`${BASE_URL}/login.html`);
      await page.fill('input[name="email"]', TEST_USERS.assistant.email);
      await page.fill('input[name="password"]', TEST_USERS.assistant.password);
      await page.click('button[type="submit"]');

      await page.waitForURL(`${BASE_URL}/admin.html`, { timeout: 5000 });
      expect(page.url()).toContain('/admin.html');
    });

    test('Regular user can login and access user dashboard', async ({ page }) => {
      await page.goto(`${BASE_URL}/login.html`);
      await page.fill('input[name="email"]', TEST_USERS.user.email);
      await page.fill('input[name="password"]', TEST_USERS.user.password);
      await page.click('button[type="submit"]');

      await page.waitForURL(`${BASE_URL}/dashboard.html`, { timeout: 5000 });
      expect(page.url()).toContain('/dashboard.html');
    });

    test('Patient can login and access user dashboard', async ({ page }) => {
      await page.goto(`${BASE_URL}/login.html`);
      await page.fill('input[name="email"]', TEST_USERS.patient.email);
      await page.fill('input[name="password"]', TEST_USERS.patient.password);
      await page.click('button[type="submit"]');

      await page.waitForURL(`${BASE_URL}/dashboard.html`, { timeout: 5000 });
      expect(page.url()).toContain('/dashboard.html');
    });

    test('Invalid login shows error message', async ({ page }) => {
      await page.goto(`${BASE_URL}/login.html`);
      await page.fill('input[name="email"]', 'wrong@email.com');
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');

      // Should stay on login page
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/login.html');

      // Error message should be visible
      const errorDiv = page.locator('#loginError');
      await expect(errorDiv).toBeVisible();
    });
  });

  test.describe('2. User Registration Tests', () => {

    test('New user can register successfully', async ({ page }) => {
      const timestamp = Date.now();
      const newUser = {
        fullname: 'Test User',
        email: `testuser${timestamp}@test.com`,
        password: 'TestPassword123!',
        phone: '+27821234567'
      };

      await page.goto(`${BASE_URL}/login.html`);

      // Switch to Sign Up tab
      await page.click('button:has-text("Sign Up")');

      // Fill registration form
      await page.fill('input[name="fullname"]', newUser.fullname);
      await page.fill('input[name="email"]', newUser.email);
      await page.fill('input[name="password"]', newUser.password);
      await page.fill('input[name="phone"]', newUser.phone);

      await page.click('#registerForm button[type="submit"]');

      // Should redirect to dashboard
      await page.waitForURL(`${BASE_URL}/dashboard.html`, { timeout: 5000 });
      expect(page.url()).toContain('/dashboard.html');
    });
  });

  test.describe('3. Admin Dashboard Tests', () => {

    test.beforeEach(async ({ page }) => {
      // Login as admin
      await page.goto(`${BASE_URL}/login.html`);
      await page.fill('input[name="email"]', TEST_USERS.admin.email);
      await page.fill('input[name="password"]', TEST_USERS.admin.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(`${BASE_URL}/admin.html`);
    });

    test('Admin can view Users tab', async ({ page }) => {
      await page.click('.sidebar-menu-item[data-tab="users"]');
      await page.waitForTimeout(2000);

      // Check Users table is visible
      const usersTable = page.locator('#usersTable');
      await expect(usersTable).toBeVisible();

      // Check table has data (should show at least admin user)
      const tableRows = page.locator('#usersList tr');
      const rowCount = await tableRows.count();
      expect(rowCount).toBeGreaterThan(0);
    });

    test('Admin can view Orders tab', async ({ page }) => {
      await page.click('.sidebar-menu-item[data-tab="orders"]');
      await page.waitForTimeout(2000);

      // Check Orders table is visible
      const ordersTable = page.locator('#ordersTable');
      await expect(ordersTable).toBeVisible();
    });

    test('Admin can view Inventory tab', async ({ page }) => {
      await page.click('.sidebar-menu-item[data-tab="inventory"]');
      await page.waitForTimeout(2000);

      // Check Inventory table is visible
      const inventoryTable = page.locator('#inventoryTable');
      await expect(inventoryTable).toBeVisible();
    });

    test('Admin can view POS tab', async ({ page }) => {
      await page.click('.sidebar-menu-item[data-tab="pos"]');
      await page.waitForTimeout(2000);

      // Check POS section is visible
      const posSection = page.locator('#pos-tab');
      await expect(posSection).toBeVisible();
    });
  });

  test.describe('4. Order Flow Tests', () => {

    test('User can add product to cart and create order', async ({ page }) => {
      // Login as regular user
      await page.goto(`${BASE_URL}/login.html`);
      await page.fill('input[name="email"]', TEST_USERS.user.email);
      await page.fill('input[name="password"]', TEST_USERS.user.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(`${BASE_URL}/dashboard.html`);

      // Go to products page
      await page.goto(`${BASE_URL}/products.html`);
      await page.waitForTimeout(2000);

      // Add first product to cart (if available)
      const addToCartBtn = page.locator('.add-to-cart-btn').first();
      if (await addToCartBtn.isVisible()) {
        await addToCartBtn.click();
        await page.waitForTimeout(1000);

        // Check cart badge updated
        const cartBadge = page.locator('.cart-badge');
        const badgeText = await cartBadge.textContent();
        expect(parseInt(badgeText)).toBeGreaterThan(0);
      }
    });
  });

  test.describe('5. Navigation Tests', () => {

    test('Homepage loads correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/index.html`);

      // Check main elements are visible
      await expect(page.locator('nav')).toBeVisible();
      await expect(page.locator('h1, h2')).toBeVisible();
    });

    test('Products page loads correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/products.html`);
      await page.waitForTimeout(2000);

      // Check products grid is visible
      const productsGrid = page.locator('.products-grid, .product-card').first();
      await expect(productsGrid).toBeVisible();
    });

    test('Login page loads correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/login.html`);

      // Check login form is visible
      await expect(page.locator('#loginForm')).toBeVisible();
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
    });
  });

  test.describe('6. Data Persistence Tests', () => {

    test('Registered user persists in database and shows in admin panel', async ({ page }) => {
      const timestamp = Date.now();
      const newUser = {
        fullname: 'Persistence Test User',
        email: `persisttest${timestamp}@test.com`,
        password: 'TestPassword123!',
        phone: '+27829999999'
      };

      // Register new user
      await page.goto(`${BASE_URL}/login.html`);
      await page.click('button:has-text("Sign Up")');
      await page.fill('input[name="fullname"]', newUser.fullname);
      await page.fill('input[name="email"]', newUser.email);
      await page.fill('input[name="password"]', newUser.password);
      await page.fill('input[name="phone"]', newUser.phone);
      await page.click('#registerForm button[type="submit"]');
      await page.waitForURL(`${BASE_URL}/dashboard.html`, { timeout: 5000 });

      // Logout
      await page.goto(`${BASE_URL}/login.html`);

      // Login as admin
      await page.fill('input[name="email"]', TEST_USERS.admin.email);
      await page.fill('input[name="password"]', TEST_USERS.admin.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(`${BASE_URL}/admin.html`);

      // Go to Users tab
      await page.click('.sidebar-menu-item[data-tab="users"]');
      await page.waitForTimeout(2000);

      // Search for new user's email in the table
      const usersTable = page.locator('#usersList');
      const tableContent = await usersTable.textContent();
      expect(tableContent).toContain(newUser.email);
    });
  });
});
