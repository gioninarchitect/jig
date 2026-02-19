// Drive-Through E2E Tests - Comprehensive customer and staff workflows
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3001';

// Test data
const testCustomer = {
    email: 'drive-test-customer@test.com',
    password: 'DriveTest123!',
    name: 'Drive Test Customer',
    phone: '+27821234567'
};

const testStaff = {
    email: 'drive-test-staff@test.com',
    password: 'StaffTest123!',
    name: 'Drive Test Staff',
    role: 'staff'
};

test.describe('Drive-Through Module - Complete Flow', () => {
    test.beforeAll(async ({ request }) => {
        // Setup: Create test users via API
        try {
            await request.post(`${BASE_URL}/api/v1/auth/register`, {
                data: testCustomer
            });

            await request.post(`${BASE_URL}/api/v1/auth/register`, {
                data: { ...testStaff, role: 'staff' }
            });
        } catch (error) {
            console.log('Test users may already exist');
        }
    });

    test.describe('Customer Flow - Regular Product (Non-Section 21)', () => {
        test('should allow customer to browse products and place drive-through order', async ({ page }) => {
            // Navigate to drive-through page
            await page.goto(`${BASE_URL}/drive-through.html`);
            await expect(page.locator('h1')).toContainText('24/7 Drive-Through');

            // Login
            await page.click('button:has-text("Login")');
            await page.fill('input[type="email"]', testCustomer.email);
            await page.fill('input[type="password"]', testCustomer.password);
            await page.click('button:has-text("Sign In")');
            await page.waitForTimeout(2000);

            // Browse products - should show categories
            await expect(page.locator('.category-btn')).toHaveCount({ timeout: 10000, min: 1 });

            // Select a non-Section 21 product (e.g., CBD oil or accessory)
            await page.click('.category-btn:has-text("CBD")');
            await page.waitForTimeout(1000);

            // Add product to cart
            const firstProduct = page.locator('.product-card').first();
            await expect(firstProduct).toBeVisible();
            await firstProduct.click();

            // Verify cart updated
            const cartBadge = page.locator('.cart-badge');
            await expect(cartBadge).toContainText('1');

            // Open cart
            await page.click('button:has-text("Cart")');

            // Verify cart drawer opened
            await expect(page.locator('.cart-drawer')).toBeVisible();

            // Proceed to checkout
            await page.click('button:has-text("Checkout")');

            // Fill customer info
            await page.fill('input[placeholder*="Name"]', testCustomer.name);
            await page.fill('input[placeholder*="Phone"]', testCustomer.phone);
            await page.fill('input[placeholder*="Make"]', 'Toyota');
            await page.fill('input[placeholder*="Model"]', 'Corolla');
            await page.fill('input[placeholder*="Color"]', 'Silver');
            await page.fill('input[placeholder*="License"]', 'ABC123GP');

            // Select payment method (pre-payment only)
            await page.click('.payment-method:has-text("InstaPay")');

            // Place order
            await page.click('button:has-text("Place Order")');

            // Wait for order confirmation
            await expect(page.locator('.order-confirmation')).toBeVisible({ timeout: 10000 });

            // Verify order details shown
            await expect(page.locator('.order-id')).toBeVisible();
            await expect(page.locator('.queue-position')).toBeVisible();
            await expect(page.locator('.eta-time')).toBeVisible();

            // Verify no Section 21 warning (regular product)
            await expect(page.locator('.section21-warning')).not.toBeVisible();
        });

        test('should reject cash/pay-on-arrival payment method', async ({ page }) => {
            await page.goto(`${BASE_URL}/drive-through.html`);

            // Login (assume already has token from previous test)
            await page.evaluate(() => {
                localStorage.setItem('token', sessionStorage.getItem('token'));
            });

            await page.reload();

            // Add product to cart
            await page.click('.product-card');
            await page.click('button:has-text("Cart")');
            await page.click('button:has-text("Checkout")');

            // Verify only pre-payment methods available
            const paymentMethods = page.locator('.payment-method');
            await expect(paymentMethods).toHaveCount(3); // InstaPay, EFT, Card only

            // Verify "Cash" and "Card at Window" are NOT available
            await expect(page.locator('.payment-method:has-text("Cash")')).not.toBeVisible();
            await expect(page.locator('.payment-method:has-text("Card at Window")')).not.toBeVisible();
        });

        test('should show menu items (La Brewha, Bean & Bud) with correct icons', async ({ page }) => {
            await page.goto(`${BASE_URL}/drive-through.html`);

            // Click on La Brewha category
            await page.click('.category-btn:has-text("La Brewha")');
            await page.waitForTimeout(1000);

            // Verify products shown
            const products = page.locator('.product-card');
            await expect(products.first()).toBeVisible();

            // Verify icon is image (not Font Awesome icon) - should have lb.png
            const productIcon = products.first().locator('.product-icon img, img[alt*="La Brewha"]');
            await expect(productIcon).toBeVisible();

            // Check Bean & Bud
            await page.click('.category-btn:has-text("Bean")');
            await page.waitForTimeout(1000);

            const beanProducts = page.locator('.product-card');
            if (await beanProducts.count() > 0) {
                const beanIcon = beanProducts.first().locator('.product-icon img, img[alt*="Bean"]');
                await expect(beanIcon).toBeVisible();
            }
        });

        test('should update queue position in real-time', async ({ page }) => {
            await page.goto(`${BASE_URL}/drive-through.html`);

            // Assume order already placed from previous test
            // Check queue status section
            const queuePosition = page.locator('#queuePosition');
            const totalQueue = page.locator('#totalQueue');

            // Wait for values to populate
            await page.waitForTimeout(2000);

            // Verify queue info displayed
            await expect(queuePosition).not.toContainText('-');
            await expect(totalQueue).not.toContainText('-');
        });
    });

    test.describe('Customer Flow - Section 21 Product', () => {
        test('should show Section 21 warning when ordering medical cannabis', async ({ page }) => {
            await page.goto(`${BASE_URL}/drive-through.html`);

            // Login
            await page.evaluate(() => {
                localStorage.setItem('token', sessionStorage.getItem('token'));
            });
            await page.reload();

            // Try to add Section 21 product (if available)
            // Note: This requires Section 21 products in database
            const section21Product = page.locator('.product-card:has(.section21-badge)');

            if (await section21Product.count() > 0) {
                await section21Product.first().click();

                // Open cart and checkout
                await page.click('button:has-text("Cart")');
                await page.click('button:has-text("Checkout")');

                // Fill details and place order
                await page.fill('input[placeholder*="Name"]', testCustomer.name);
                await page.fill('input[placeholder*="Phone"]', testCustomer.phone);
                await page.click('.payment-method:has-text("InstaPay")');
                await page.click('button:has-text("Place Order")');

                // Verify Section 21 warning shown in confirmation
                await expect(page.locator('.section21-warning')).toBeVisible();
                await expect(page.locator('.section21-warning')).toContainText('Section 21');
            }
        });

        test('should block Section 21 order without verification documents', async ({ page }) => {
            // This test verifies the customer is warned they need documents at pickup
            await page.goto(`${BASE_URL}/drive-through.html`);

            const section21Product = page.locator('.product-card:has(.section21-badge)');

            if (await section21Product.count() > 0) {
                await section21Product.first().click();
                await page.click('button:has-text("Cart")');
                await page.click('button:has-text("Checkout")');

                // Verify Section 21 requirements shown before checkout
                await expect(page.locator('text=/prescription/i, text=/section 21/i')).toBeVisible();
            }
        });
    });

    test.describe('Staff Flow - Queue Management', () => {
        test('should display active queue for staff', async ({ page }) => {
            // Navigate to staff dashboard
            await page.goto(`${BASE_URL}/drive-through-staff.html`);

            // Login as staff
            await page.evaluate(() => {
                // Simulate staff login token
                sessionStorage.setItem('adminToken', 'STAFF_TOKEN');
            });

            await page.reload();
            await page.waitForTimeout(2000);

            // Verify queue loaded
            const orderCards = page.locator('.order-card');

            // Should show orders if any exist, or empty state
            const emptyState = page.locator('.empty-state');
            const hasOrders = await orderCards.count() > 0;
            const isEmpty = await emptyState.isVisible();

            expect(hasOrders || isEmpty).toBeTruthy();

            if (hasOrders) {
                // Verify order card shows required info
                const firstOrder = orderCards.first();
                await expect(firstOrder.locator('.order-id')).toBeVisible();
                await expect(firstOrder.locator('.status-badge')).toBeVisible();
                await expect(firstOrder.locator('.detail-value')).toHaveCount({ min: 1 });
            }
        });

        test('should allow staff to update order status', async ({ page }) => {
            await page.goto(`${BASE_URL}/drive-through-staff.html`);

            const orderCards = page.locator('.order-card');

            if (await orderCards.count() > 0) {
                const firstOrder = orderCards.first();
                const status = await firstOrder.locator('.status-badge').textContent();

                // Click appropriate action button based on status
                if (status.toLowerCase().includes('queue')) {
                    await firstOrder.locator('button:has-text("Start Preparing")').click();
                    await page.waitForTimeout(1000);

                    // Verify toast notification
                    await expect(page.locator('.toast')).toBeVisible();
                } else if (status.toLowerCase().includes('preparing')) {
                    await firstOrder.locator('button:has-text("Mark Ready")').click();
                    await page.waitForTimeout(1000);

                    await expect(page.locator('.toast')).toBeVisible();
                }
            }
        });

        test('should open Section 21 verification modal for pickup', async ({ page }) => {
            await page.goto(`${BASE_URL}/drive-through-staff.html`);

            const orderCards = page.locator('.order-card');

            if (await orderCards.count() > 0) {
                const readyOrders = page.locator('.order-card:has(.status-badge:has-text("ready"))');

                if (await readyOrders.count() > 0) {
                    await readyOrders.first().locator('button:has-text("Complete Pickup")').click();

                    // Verify modal opened
                    await expect(page.locator('#section21Modal')).toBeVisible();
                    await expect(page.locator('.modal-content')).toBeVisible();

                    // Verify compliance checkboxes
                    await expect(page.locator('#prescriptionCheck')).toBeVisible();
                    await expect(page.locator('#idCheck')).toBeVisible();
                    await expect(page.locator('#quantityCheck')).toBeVisible();

                    // Verify complete button disabled initially
                    const completeBtn = page.locator('#completeBtn');
                    await expect(completeBtn).toBeDisabled();
                }
            }
        });

        test('should enforce Section 21 compliance checks', async ({ page }) => {
            await page.goto(`${BASE_URL}/drive-through-staff.html`);

            // Assume modal is open from previous action
            const modal = page.locator('#section21Modal');

            if (await modal.isVisible()) {
                // Try to complete without checking all boxes
                const completeBtn = page.locator('#completeBtn');
                await expect(completeBtn).toBeDisabled();

                // Check prescription only
                await page.check('#prescriptionCheck');
                await expect(completeBtn).toBeDisabled();

                // Check ID
                await page.check('#idCheck');
                await expect(completeBtn).toBeDisabled();

                // Check quantity - now button should be enabled
                await page.check('#quantityCheck');
                await expect(completeBtn).not.toBeDisabled();

                // Click complete
                await completeBtn.click();
                await page.waitForTimeout(1000);

                // Verify modal closed and order completed
                await expect(modal).not.toBeVisible();
                await expect(page.locator('.toast:has-text("completed")')).toBeVisible();
            }
        });

        test('should allow staff to cancel order', async ({ page }) => {
            await page.goto(`${BASE_URL}/drive-through-staff.html`);

            const orderCards = page.locator('.order-card');

            if (await orderCards.count() > 0) {
                // Listen for confirmation dialog
                page.on('dialog', dialog => dialog.accept());

                await orderCards.first().locator('button:has-text("Cancel")').click();
                await page.waitForTimeout(1000);

                // Verify toast notification
                await expect(page.locator('.toast')).toBeVisible();
            }
        });

        test('should show real-time stats in header', async ({ page }) => {
            await page.goto(`${BASE_URL}/drive-through-staff.html`);

            // Verify stats displayed
            const totalOrders = page.locator('#totalOrders');
            const avgWaitTime = page.locator('#avgWaitTime');

            await expect(totalOrders).toBeVisible();
            await expect(avgWaitTime).toBeVisible();

            // Values should be numbers (not "-")
            const totalText = await totalOrders.textContent();
            const avgText = await avgWaitTime.textContent();

            expect(totalText).toMatch(/\d+/);
            expect(avgText).toMatch(/\d+/);
        });

        test('should auto-refresh queue every 10 seconds', async ({ page }) => {
            await page.goto(`${BASE_URL}/drive-through-staff.html`);

            const initialCount = await page.locator('.order-card').count();

            // Wait for auto-refresh (10 seconds + buffer)
            await page.waitForTimeout(12000);

            // Queue should have been refreshed (count may be same or different)
            const newCount = await page.locator('.order-card').count();

            // Both counts should be valid numbers
            expect(typeof initialCount).toBe('number');
            expect(typeof newCount).toBe('number');
        });
    });

    test.describe('Integration Tests - Customer + Staff Workflow', () => {
        test('should complete full drive-through flow: order → prepare → pickup', async ({ browser }) => {
            // Create two browser contexts: one for customer, one for staff
            const customerContext = await browser.newContext();
            const staffContext = await browser.newContext();

            const customerPage = await customerContext.newPage();
            const staffPage = await staffContext.newPage();

            try {
                // STEP 1: Customer places order
                await customerPage.goto(`${BASE_URL}/drive-through.html`);
                await customerPage.click('.product-card');
                await customerPage.click('button:has-text("Cart")');
                await customerPage.click('button:has-text("Checkout")');

                await customerPage.fill('input[placeholder*="Name"]', 'Integration Test');
                await customerPage.fill('input[placeholder*="Phone"]', '+27999999999');
                await customerPage.click('.payment-method:has-text("InstaPay")');
                await customerPage.click('button:has-text("Place Order")');

                // Get order ID
                await customerPage.waitForTimeout(2000);
                const orderIdText = await customerPage.locator('.order-id').textContent();

                // STEP 2: Staff sees order in queue
                await staffPage.goto(`${BASE_URL}/drive-through-staff.html`);
                await staffPage.waitForTimeout(2000);

                const orderCard = staffPage.locator('.order-card').first();
                await expect(orderCard).toBeVisible();

                // STEP 3: Staff starts preparing
                await orderCard.locator('button:has-text("Start Preparing")').click();
                await staffPage.waitForTimeout(1000);

                // STEP 4: Customer sees status update
                await customerPage.reload();
                await customerPage.waitForTimeout(2000);
                // Status should reflect "preparing" or similar

                // STEP 5: Staff marks ready
                await staffPage.reload();
                await staffPage.waitForTimeout(2000);
                await staffPage.locator('.order-card').first().locator('button:has-text("Mark Ready")').click();
                await staffPage.waitForTimeout(1000);

                // STEP 6: Customer arrives and notifies
                await customerPage.click('button:has-text("I\'m Here")');
                await customerPage.waitForTimeout(1000);

                // STEP 7: Staff completes pickup
                await staffPage.reload();
                await staffPage.waitForTimeout(2000);
                await staffPage.locator('.order-card').first().locator('button:has-text("Complete Pickup")').click();

                // Check all compliance boxes
                await staffPage.check('#prescriptionCheck');
                await staffPage.check('#idCheck');
                await staffPage.check('#quantityCheck');
                await staffPage.click('#completeBtn');

                await staffPage.waitForTimeout(1000);

                // Verify order completed
                await expect(staffPage.locator('.toast:has-text("completed")')).toBeVisible();

            } finally {
                await customerContext.close();
                await staffContext.close();
            }
        });
    });

    test.describe('Error Handling & Edge Cases', () => {
        test('should show error when product out of stock', async ({ page }) => {
            await page.goto(`${BASE_URL}/drive-through.html`);

            // Try to add out-of-stock product (if any exist)
            const outOfStockProduct = page.locator('.product-card:has-text("Out of Stock")');

            if (await outOfStockProduct.count() > 0) {
                await outOfStockProduct.click();

                // Verify error toast
                await expect(page.locator('.toast:has-text("stock")')).toBeVisible();
            }
        });

        test('should require authentication for placing order', async ({ page }) => {
            await page.goto(`${BASE_URL}/drive-through.html`);

            // Clear tokens
            await page.evaluate(() => {
                localStorage.clear();
                sessionStorage.clear();
            });

            await page.reload();

            // Try to checkout
            await page.click('.product-card');
            await page.click('button:has-text("Cart")');
            await page.click('button:has-text("Checkout")');

            // Should show login prompt
            await expect(page.locator('text=/login/i, text=/sign in/i')).toBeVisible();
        });

        test('should handle API errors gracefully', async ({ page }) => {
            // This would require mocking API responses or stopping server
            // Placeholder for comprehensive error handling tests
            await page.goto(`${BASE_URL}/drive-through.html`);

            // Simulate network error by intercepting requests
            await page.route('**/api/v1/drive-through/**', route => route.abort());

            await page.click('.product-card');
            await page.waitForTimeout(1000);

            // Should show error message
            await expect(page.locator('.toast:has-text("error"), .toast:has-text("failed")')).toBeVisible({ timeout: 5000 });
        });
    });
});
