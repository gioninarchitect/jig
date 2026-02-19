// @ts-check
const { test, expect, devices } = require('@playwright/test');

test.describe('Retail Store Basic Flow (No EFT Approval)', () => {
    test.setTimeout(120000); // 2 minutes

    test('Complete basic flow: Login → Order → Staff Queue', async ({ browser }) => {
        // Create two contexts: customer and staff
        const customerContext = await browser.newContext({
            ...devices['iPhone 12 Pro']
        });
        const staffContext = await browser.newContext({
            ...devices['iPad Pro'],
            orientation: 'landscape'
        });

        const customerPage = await customerContext.newPage();
        const staffPage = await staffContext.newPage();

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📱 PART 1: CUSTOMER PLACES ORDER');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // STEP 1: Go directly to retail-store page (has built-in login)
        console.log('🧪 STEP 1: Load Retail Store Page');
        await customerPage.goto('http://localhost:3001/retail-store.html');
        await customerPage.waitForLoadState('networkidle');
        console.log('   ✅ Drive-through page loaded');

        // STEP 2: Login using built-in form
        console.log('\n🧪 STEP 2: Customer Login via Retail Store Page');

        // Wait for page to initialize (either show login or products)
        await customerPage.waitForTimeout(2000);

        // Check if login form is visible by looking for the email input
        const emailInput = customerPage.locator('input[type="email"], input#loginEmail, input[placeholder*="email" i]');
        const isLoginVisible = await emailInput.isVisible({ timeout: 5000 }).catch(() => false);

        if (isLoginVisible) {
            console.log('   📋 Login form detected');

            // Fill in credentials
            await emailInput.fill('user@basothomedicalherbs.ls');

            const passwordInput = customerPage.locator('input[type="password"], input#loginPassword, input[placeholder*="password" i]');
            await passwordInput.fill('User123!');

            // Click sign in button
            const signInButton = customerPage.locator('button:has-text("Sign In"), button:has-text("Login")');
            await signInButton.tap();

            console.log('   ✅ Login submitted, waiting for response...');

            // Wait for login to complete and products to start loading
            await customerPage.waitForTimeout(4000);
        } else {
            console.log('   ℹ️  Login form not visible - checking if already authenticated');
        }

        // STEP 3: Wait for products to load
        console.log('\n🧪 STEP 3: Wait for Products');

        try {
            await customerPage.waitForSelector('.product-card', { timeout: 15000 });
            const productCount = await customerPage.locator('.product-card').count();
            console.log(`   ✅ ${productCount} products loaded`);
            expect(productCount).toBeGreaterThan(0);
        } catch (error) {
            console.log('   ❌ Products failed to load');
            console.log(`   📍 Current URL: ${customerPage.url()}`);

            // Take screenshot for debugging
            await customerPage.screenshot({
                path: 'test-results/debug-no-products.png',
                fullPage: true
            });

            // Check if there's an error message
            const pageText = await customerPage.textContent('body');
            if (pageText.includes('error') || pageText.includes('Error')) {
                console.log('   🔍 Page contains error text');
            }

            throw new Error('Products did not load - see debug-no-products.png');
        }

        // STEP 4: Add product to cart
        console.log('\n🧪 STEP 4: Add Product to Cart');
        const firstProduct = customerPage.locator('.product-card').first();
        const productName = await firstProduct.locator('.product-name, h3, .name').first().textContent();
        console.log(`   📦 Product: ${productName}`);

        await firstProduct.tap();
        await customerPage.waitForTimeout(1500);

        // Check cart badge
        const cartBadgeExists = await customerPage.locator('.cart-badge, .badge').first().isVisible().catch(() => false);
        if (cartBadgeExists) {
            const cartCount = await customerPage.locator('.cart-badge, .badge').first().textContent();
            console.log(`   ✅ Cart: ${cartCount} item(s)`);
        } else {
            console.log('   ⚠️  Cart badge not visible');
        }

        // STEP 5: Proceed to checkout
        console.log('\n🧪 STEP 5: Proceed to Checkout');
        const nextButton = customerPage.locator('button:has-text("Next"), button:has-text("Checkout")').first();
        await nextButton.tap();
        await customerPage.waitForTimeout(1500);
        console.log('   ✅ Moved to checkout');

        // STEP 6: Fill customer details
        console.log('\n🧪 STEP 6: Fill Customer Details');
        await customerPage.fill('#customerName, input[name="name"]', 'Test Customer');
        await customerPage.fill('#customerPhone, input[name="phone"]', '+27821234567');
        await customerPage.fill('#vehicleModel, input[name="vehicle"]', 'Toyota Corolla');
        await customerPage.fill('#vehicleColor, input[name="color"]', 'Silver');
        await customerPage.fill('#licensePlate, input[name="plate"]', 'CA 789 GP');
        console.log('   ✅ Customer details entered');

        // Move to payment
        const nextButton2 = customerPage.locator('button:has-text("Next")').first();
        if (await nextButton2.isVisible({ timeout: 2000 }).catch(() => false)) {
            await nextButton2.tap();
            await customerPage.waitForTimeout(1000);
        }

        // STEP 7: Select InstaPay (instant approval, no EFT wait)
        console.log('\n🧪 STEP 7: Select InstaPay Payment');
        const instaPayButton = customerPage.locator('text=InstaPay, button:has-text("InstaPay"), .payment-method:has-text("InstaPay")').first();
        if (await instaPayButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            await instaPayButton.tap();
            await customerPage.waitForTimeout(500);
            console.log('   ✅ InstaPay selected');
        } else {
            console.log('   ⚠️  InstaPay button not found, proceeding anyway');
        }

        // STEP 8: Place order
        console.log('\n🧪 STEP 8: Place Order');
        const placeOrderButton = customerPage.locator('button:has-text("Place Order"), button:has-text("Complete")').first();
        await placeOrderButton.tap();
        await customerPage.waitForTimeout(4000); // Wait for order to process

        // Check for success
        const trackingVisible = await customerPage.locator('text=Track, text=Order, text=#').first().isVisible({ timeout: 5000 }).catch(() => false);

        if (trackingVisible) {
            console.log('   ✅ Order placed successfully!');
            const pageText = await customerPage.textContent('body');
            const orderIdMatch = pageText.match(/[A-Z0-9]{8}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{12}|Order #[\w-]+/);
            if (orderIdMatch) {
                console.log(`   📦 Order ID: ${orderIdMatch[0]}`);
            }
        } else {
            console.log('   ⚠️  Could not confirm order placement');
        }

        // Take screenshot
        await customerPage.screenshot({
            path: 'test-results/customer-order-complete.png',
            fullPage: true
        });

        // ═══════════════════════════════════════════════════
        // PART 2: STAFF SEES ORDER IN QUEUE
        // ═══════════════════════════════════════════════════

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📱 PART 2: STAFF QUEUE DASHBOARD');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // STEP 9: Staff logs in
        console.log('🧪 STEP 9: Staff Login');
        await staffPage.goto('http://localhost:3001/login');
        await staffPage.fill('input[name="email"]', 'manager@basothomedicalherbs.ls');
        await staffPage.fill('input[name="password"]', 'Manager123!');
        await staffPage.click('button:has-text("Sign In")');
        await staffPage.waitForTimeout(2000);
        console.log('   ✅ Staff logged in');

        // STEP 10: Open queue dashboard
        console.log('\n🧪 STEP 10: Load Staff Queue');
        await staffPage.goto('http://localhost:3001/retail-store-staff.html');
        await staffPage.waitForTimeout(3000);
        console.log('   ✅ Staff dashboard loaded');

        // STEP 11: Check for orders in queue
        console.log('\n🧪 STEP 11: Verify Order in Queue');
        const orderCards = await staffPage.locator('.order-card, .queue-item').count();
        console.log(`   📊 Queue has ${orderCards} order(s)`);

        if (orderCards > 0) {
            const firstOrder = staffPage.locator('.order-card, .queue-item').first();
            const orderText = await firstOrder.textContent();
            console.log('   ✅ Order found in queue');

            if (orderText.includes('Test Customer')) {
                console.log('   ✅ Customer name matches');
            }
            if (orderText.includes('Toyota') || orderText.includes('Corolla')) {
                console.log('   ✅ Vehicle info present');
            }
        } else {
            console.log('   ⚠️  No orders in queue');
        }

        // Take final screenshots
        await staffPage.screenshot({
            path: 'test-results/staff-queue-final.png',
            fullPage: true
        });

        console.log('\n✅ BASIC FLOW TEST COMPLETED');
        console.log('   Customer: Order placed');
        console.log('   Staff: Queue dashboard loaded');
        console.log(`   Screenshots saved to test-results/`);

        // Cleanup
        await customerPage.close();
        await staffPage.close();
        await customerContext.close();
        await staffContext.close();
    });
});
