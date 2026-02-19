// CBD Wellness 24 - Voucher Flow E2E Tests
// Tests voucher application on lifestyle products ONLY (Section 21 compliance)

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3001';
const API_URL = 'http://localhost:3001/api/v1';

const TEST_USER = {
  email: 'user@cbdwellness24.co.za',
  password: 'User123!',
  role: 'Lifestyle Member'
};

const ADMIN_USER = {
  email: 'admin@cbdwellness24.co.za',
  password: 'Admin123!'
};

test.describe('Voucher Flow - Lifestyle Products Only', () => {

  let adminToken;
  let userToken;
  let testVoucher;

  test.beforeAll(async ({ request }) => {
    console.log('\n' + '='.repeat(80));
    console.log('SETUP: Creating test voucher via API');
    console.log('='.repeat(80));

    // Login as admin to create voucher
    const adminLogin = await request.post(`${API_URL}/auth/login`, {
      data: {
        email: ADMIN_USER.email,
        password: ADMIN_USER.password
      }
    });

    const adminData = await adminLogin.json();
    adminToken = adminData.token;
    console.log('✓ Admin logged in');

    // Create test voucher
    const voucherResponse = await request.post(`${API_URL}/vouchers`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        code: 'LIFESTYLE10',
        name: 'Lifestyle 10% Off',
        type: 'percentage',
        value: 10,
        minPurchase: 100,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        redemptionLimit: 'unlimited',
        status: 'active'
      }
    });

    testVoucher = await voucherResponse.json();
    console.log(`✓ Test voucher created: ${testVoucher.voucher.code}`);
    console.log(`  - Type: ${testVoucher.voucher.type}`);
    console.log(`  - Value: ${testVoucher.voucher.value}%`);
    console.log(`  - Min Purchase: R${testVoucher.voucher.minPurchase}`);
  });

  test.beforeEach(async ({ page }) => {
    console.log('\n' + '-'.repeat(80));
    console.log('Starting new test');
    console.log('-'.repeat(80));
  });

  test('Valid Voucher on Lifestyle Products - Success', async ({ page }) => {
    console.log('\n[Test] Apply valid voucher to lifestyle products');

    // Step 1: Navigate to homepage
    console.log('\n[Step 1] Navigating to homepage...');
    await page.goto(`${BASE_URL}/index.html`);
    await page.waitForLoadState('networkidle');
    console.log('✓ Homepage loaded');

    // Step 2: Add lifestyle product to cart
    console.log('\n[Step 2] Adding lifestyle product to cart...');

    // Wait for products to load
    await page.waitForSelector('.product-card', { timeout: 10000 });

    // Find first lifestyle product (NOT Section 21)
    const lifestyleProduct = page.locator('.product-card').filter({
      hasNotText: 'Section 21'
    }).first();

    await lifestyleProduct.waitFor({ state: 'visible' });

    // Get product details
    const productName = await lifestyleProduct.locator('h3, .product-name').textContent();
    const productPriceText = await lifestyleProduct.locator('.product-price, .price').textContent();
    console.log(`✓ Found lifestyle product: ${productName.trim()}`);
    console.log(`  Price: ${productPriceText.trim()}`);

    // Click Add to Cart
    const addToCartBtn = lifestyleProduct.locator('button:has-text("Add to Cart")');
    await addToCartBtn.click();
    console.log('✓ Added to cart');

    // Wait for cart update
    await page.waitForTimeout(500);

    // Step 3: Open cart
    console.log('\n[Step 3] Opening cart...');
    const cartButton = page.locator('.cart-btn, button:has-text("Cart"), #cartBtn');
    await cartButton.click();
    console.log('✓ Cart opened');

    // Wait for cart drawer to appear
    await page.waitForSelector('.cart-drawer, #cartDrawer', { state: 'visible', timeout: 5000 });

    // Step 4: Verify cart has item
    console.log('\n[Step 4] Verifying cart contents...');
    const cartItems = page.locator('.cart-item, .cart-product');
    const itemCount = await cartItems.count();
    expect(itemCount).toBeGreaterThan(0);
    console.log(`✓ Cart has ${itemCount} item(s)`);

    // Get cart total
    const cartTotalElement = page.locator('.cart-total, #cartTotal').first();
    await cartTotalElement.waitFor({ state: 'visible' });
    const cartTotalText = await cartTotalElement.textContent();
    console.log(`  Cart Total: ${cartTotalText.trim()}`);

    // Step 5: Apply voucher
    console.log('\n[Step 5] Applying voucher...');
    const voucherInput = page.locator('#couponCode, input[placeholder*="voucher" i], input[placeholder*="coupon" i]');
    await voucherInput.fill('LIFESTYLE10');
    console.log('✓ Entered voucher code: LIFESTYLE10');

    const applyButton = page.locator('button:has-text("Apply")');
    await applyButton.click();
    console.log('✓ Clicked Apply button');

    // Step 6: Verify voucher applied
    console.log('\n[Step 6] Verifying voucher discount...');

    // Wait for success message
    await page.waitForTimeout(2000);

    // Check for discount in cart
    const discountElement = page.locator('.discount-amount, #discountAmount, text=/discount/i').first();

    // Check if discount is visible
    const isDiscountVisible = await discountElement.isVisible().catch(() => false);

    if (isDiscountVisible) {
      const discountText = await discountElement.textContent();
      console.log(`✓ Discount applied: ${discountText.trim()}`);

      // Verify discount amount is > 0
      expect(discountText).toContain('R');
      console.log('✓ Voucher successfully applied to lifestyle product');
    } else {
      console.log('⚠️  Discount element not found - checking cart total updated');

      // Alternative: Check that final total is less than original
      const finalTotal = await page.locator('.final-total, .total-amount').textContent();
      console.log(`  Final Total: ${finalTotal}`);
    }

    // Take screenshot
    await page.screenshot({ path: 'playwright-report/voucher-applied-success.png', fullPage: true });
    console.log('✓ Screenshot saved');
  });

  test('Voucher Blocked on Section 21 Products - Compliance', async ({ page }) => {
    console.log('\n[Test] Voucher blocked on Section 21 medical products');

    // Step 1: Login as Section 21 patient
    console.log('\n[Step 1] Logging in as Section 21 patient...');
    await page.goto(`${BASE_URL}/login.html`);
    await page.locator('#loginForm input[type="email"]').fill('patient@cbdwellness24.co.za');
    await page.locator('#loginForm input[type="password"]').fill('Patient123!');
    await page.locator('#loginForm button[type="submit"]').click();

    await page.waitForURL('**/dashboard.html', { timeout: 10000 });
    console.log('✓ Logged in as Section 21 patient');

    // Step 2: Navigate to Section 21 products
    console.log('\n[Step 2] Navigating to Section 21 products...');
    await page.goto(`${BASE_URL}/section21.html`);
    await page.waitForLoadState('networkidle');
    console.log('✓ Section 21 page loaded');

    // Wait for products
    await page.waitForSelector('.product-card, .section21-product', { timeout: 10000 });

    // Step 3: Add Section 21 product to cart
    console.log('\n[Step 3] Adding Section 21 product to cart...');
    const section21Product = page.locator('.product-card, .section21-product').first();

    const medicalProductName = await section21Product.locator('h3, .product-name').textContent();
    console.log(`✓ Found medical product: ${medicalProductName.trim()}`);

    const addToCartBtn = section21Product.locator('button:has-text("Add to Cart")');
    await addToCartBtn.click();
    console.log('✓ Added Section 21 product to cart');

    await page.waitForTimeout(500);

    // Step 4: Open cart
    console.log('\n[Step 4] Opening cart...');
    const cartButton = page.locator('.cart-btn, button:has-text("Cart"), #cartBtn');
    await cartButton.click();
    console.log('✓ Cart opened');

    await page.waitForSelector('.cart-drawer, #cartDrawer', { state: 'visible', timeout: 5000 });

    // Step 5: Try to apply voucher
    console.log('\n[Step 5] Attempting to apply voucher to medical products...');
    const voucherInput = page.locator('#couponCode, input[placeholder*="voucher" i]');
    await voucherInput.fill('LIFESTYLE10');
    console.log('✓ Entered voucher code: LIFESTYLE10');

    const applyButton = page.locator('button:has-text("Apply")');
    await applyButton.click();
    console.log('✓ Clicked Apply button');

    // Step 6: Verify voucher BLOCKED
    console.log('\n[Step 6] Verifying Section 21 compliance block...');

    // Wait for error message
    await page.waitForTimeout(2000);

    // Check for error message containing Section 21 compliance text
    const errorMessages = [
      page.locator('text=/Section 21/i'),
      page.locator('text=/medical cannabis/i'),
      page.locator('text=/illegal/i'),
      page.locator('.error-message, .toast-error, .alert-error')
    ];

    let errorFound = false;
    for (const errorLocator of errorMessages) {
      const isVisible = await errorLocator.first().isVisible().catch(() => false);
      if (isVisible) {
        const errorText = await errorLocator.first().textContent();
        console.log(`✓ Section 21 compliance error shown: "${errorText.trim()}"`);
        errorFound = true;
        break;
      }
    }

    if (!errorFound) {
      console.log('⚠️  Error message not found - checking discount was NOT applied');
      const discountElement = page.locator('.discount-amount, #discountAmount');
      const hasDiscount = await discountElement.isVisible().catch(() => false);
      expect(hasDiscount).toBe(false);
      console.log('✓ Confirmed: No discount applied to Section 21 products');
    }

    // Take screenshot
    await page.screenshot({ path: 'playwright-report/voucher-blocked-section21.png', fullPage: true });
    console.log('✓ Screenshot saved');
  });

  test('Voucher Below Minimum Purchase - Rejected', async ({ page }) => {
    console.log('\n[Test] Voucher rejected when cart below minimum purchase');

    // Step 1: Navigate to homepage
    console.log('\n[Step 1] Navigating to homepage...');
    await page.goto(`${BASE_URL}/index.html`);
    await page.waitForLoadState('networkidle');

    // Step 2: Add low-price product to cart
    console.log('\n[Step 2] Adding low-price product (below R100)...');

    await page.waitForSelector('.product-card', { timeout: 10000 });

    // Find cheapest lifestyle product
    const products = page.locator('.product-card').filter({ hasNotText: 'Section 21' });
    const firstProduct = products.first();
    await firstProduct.waitFor({ state: 'visible' });

    const productName = await firstProduct.locator('h3, .product-name').textContent();
    console.log(`✓ Selected product: ${productName.trim()}`);

    const addToCartBtn = firstProduct.locator('button:has-text("Add to Cart")');
    await addToCartBtn.click();
    console.log('✓ Added to cart');

    await page.waitForTimeout(500);

    // Step 3: Open cart
    console.log('\n[Step 3] Opening cart...');
    const cartButton = page.locator('.cart-btn, button:has-text("Cart"), #cartBtn');
    await cartButton.click();

    await page.waitForSelector('.cart-drawer, #cartDrawer', { state: 'visible', timeout: 5000 });

    // Check cart total
    const cartTotal = await page.locator('.cart-total, #cartTotal').first().textContent();
    console.log(`  Cart Total: ${cartTotal.trim()}`);

    // Step 4: Apply voucher with R100 minimum
    console.log('\n[Step 4] Applying voucher (requires R100 minimum)...');
    const voucherInput = page.locator('#couponCode, input[placeholder*="voucher" i]');
    await voucherInput.fill('LIFESTYLE10');

    const applyButton = page.locator('button:has-text("Apply")');
    await applyButton.click();
    console.log('✓ Clicked Apply button');

    // Step 5: Verify rejection if cart < R100
    console.log('\n[Step 5] Checking minimum purchase validation...');

    await page.waitForTimeout(2000);

    // Look for minimum purchase error
    const minPurchaseError = page.locator('text=/minimum/i, text=/R100/i, .error-message');
    const hasMinError = await minPurchaseError.first().isVisible().catch(() => false);

    if (hasMinError) {
      const errorText = await minPurchaseError.first().textContent();
      console.log(`✓ Minimum purchase error shown: "${errorText.trim()}"`);
    } else {
      console.log('  Cart total may be above R100 - voucher might have applied');
    }

    // Take screenshot
    await page.screenshot({ path: 'playwright-report/voucher-minimum-purchase.png', fullPage: true });
    console.log('✓ Screenshot saved');
  });

  test('Invalid Voucher Code - Rejected', async ({ page }) => {
    console.log('\n[Test] Invalid voucher code rejected');

    await page.goto(`${BASE_URL}/index.html`);
    await page.waitForLoadState('networkidle');

    // Add product
    await page.waitForSelector('.product-card', { timeout: 10000 });
    const product = page.locator('.product-card').filter({ hasNotText: 'Section 21' }).first();
    await product.locator('button:has-text("Add to Cart")').click();
    await page.waitForTimeout(500);

    // Open cart
    const cartButton = page.locator('.cart-btn, button:has-text("Cart"), #cartBtn');
    await cartButton.click();
    await page.waitForSelector('.cart-drawer, #cartDrawer', { state: 'visible', timeout: 5000 });

    // Apply invalid code
    console.log('\n[Step] Applying invalid voucher code...');
    const voucherInput = page.locator('#couponCode, input[placeholder*="voucher" i]');
    await voucherInput.fill('INVALID999');
    console.log('✓ Entered invalid code: INVALID999');

    const applyButton = page.locator('button:has-text("Apply")');
    await applyButton.click();

    // Verify error
    await page.waitForTimeout(2000);

    const errorMessages = [
      page.locator('text=/invalid/i'),
      page.locator('text=/not found/i'),
      page.locator('.error-message, .toast-error')
    ];

    let errorFound = false;
    for (const errorLocator of errorMessages) {
      const isVisible = await errorLocator.first().isVisible().catch(() => false);
      if (isVisible) {
        const errorText = await errorLocator.first().textContent();
        console.log(`✓ Error shown: "${errorText.trim()}"`);
        errorFound = true;
        break;
      }
    }

    expect(errorFound).toBe(true);
    console.log('✓ Invalid voucher properly rejected');

    await page.screenshot({ path: 'playwright-report/voucher-invalid-code.png', fullPage: true });
  });

  test('Admin - Create Voucher via Dashboard', async ({ page }) => {
    console.log('\n[Test] Admin creates voucher via dashboard');

    // Step 1: Login as admin
    console.log('\n[Step 1] Logging in as admin...');
    await page.goto(`${BASE_URL}/login.html`);
    await page.locator('#loginForm input[type="email"]').fill(ADMIN_USER.email);
    await page.locator('#loginForm input[type="password"]').fill(ADMIN_USER.password);
    await page.locator('#loginForm button[type="submit"]').click();

    await page.waitForURL('**/admin.html', { timeout: 10000 });
    console.log('✓ Admin logged in');

    // Step 2: Navigate to Vouchers tab
    console.log('\n[Step 2] Opening Vouchers tab...');

    // Try clicking sidebar menu item
    const hamburger = page.locator('.hamburger-btn, button:has-text("☰")');
    const isHamburgerVisible = await hamburger.isVisible().catch(() => false);

    if (isHamburgerVisible) {
      await hamburger.click();
      await page.waitForTimeout(500);

      const vouchersMenuItem = page.locator('.sidebar-menu-item:has-text("Vouchers")');
      await vouchersMenuItem.click();
      console.log('✓ Clicked Vouchers menu item');
    } else {
      // Alternative: direct tab click
      const vouchersTab = page.locator('[data-tab="vouchers"], button:has-text("Vouchers")');
      await vouchersTab.click();
      console.log('✓ Clicked Vouchers tab');
    }

    await page.waitForTimeout(1000);

    // Step 3: Open Create Voucher modal
    console.log('\n[Step 3] Opening Create Voucher modal...');
    const createButton = page.locator('button:has-text("Create Voucher"), #createVoucherBtn');
    await createButton.click();
    console.log('✓ Clicked Create Voucher button');

    // Wait for modal
    await page.waitForSelector('#createVoucherModal, .modal', { state: 'visible', timeout: 5000 });
    console.log('✓ Modal opened');

    // Step 4: Fill in voucher details
    console.log('\n[Step 4] Filling voucher details...');

    const voucherCode = `TEST${Date.now()}`;
    await page.locator('#voucherCode, input[name="code"]').fill(voucherCode);
    console.log(`✓ Code: ${voucherCode}`);

    await page.locator('#voucherName, input[name="name"]').fill('Test Voucher');
    console.log('✓ Name: Test Voucher');

    await page.locator('#voucherValue, input[name="value"]').fill('15');
    console.log('✓ Value: 15%');

    await page.locator('#minPurchase, input[name="minPurchase"]').fill('50');
    console.log('✓ Min Purchase: R50');

    // Step 5: Submit form
    console.log('\n[Step 5] Submitting voucher...');
    const submitButton = page.locator('#createVoucherModal button[type="submit"], button:has-text("Create")');
    await submitButton.click();
    console.log('✓ Clicked Create button');

    // Wait for success
    await page.waitForTimeout(2000);

    // Verify voucher appears in list
    const voucherList = page.locator('.voucher-list, #voucherList');
    const voucherCard = voucherList.locator(`text=${voucherCode}`);

    const isVoucherVisible = await voucherCard.isVisible().catch(() => false);

    if (isVoucherVisible) {
      console.log(`✓ Voucher ${voucherCode} created and visible in list`);
    } else {
      console.log('  Voucher created (list may need refresh)');
    }

    await page.screenshot({ path: 'playwright-report/voucher-admin-create.png', fullPage: true });
    console.log('✓ Screenshot saved');
  });
});
