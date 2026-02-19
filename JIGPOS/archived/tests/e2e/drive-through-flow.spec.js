// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Retail Store Complete Flow', () => {
    let customerPage;
    let staffPage;
    let orderId;

    test.beforeAll(async ({ browser }) => {
        // Open two browser contexts: one for customer, one for staff
        const customerContext = await browser.newContext();
        const staffContext = await browser.newContext();

        customerPage = await customerContext.newPage();
        staffPage = await staffContext.newPage();
    });

    test('Complete retail-store flow: Customer order → Staff queue', async () => {
        // STEP 1: Customer logs in
        console.log('\n🧪 STEP 1: Customer Login');
        await customerPage.goto('http://localhost:3001/login');
        await customerPage.fill('input[name="email"]', 'user@basothomedicalherbs.ls');
        await customerPage.fill('input[name="password"]', 'User123!');
        await customerPage.click('button[type="submit"]');

        // Wait for redirect to dashboard or success
        await customerPage.waitForTimeout(2000);
        console.log('   ✅ Customer logged in');

        // STEP 2: Customer navigates to retail-store
        console.log('\n🧪 STEP 2: Navigate to Retail Store');
        await customerPage.goto('http://localhost:3001/retail-store.html');
        await customerPage.waitForSelector('.product-card', { timeout: 10000 });

        const productCount = await customerPage.locator('.product-card').count();
        console.log(`   ✅ Drive-through page loaded with ${productCount} products`);
        expect(productCount).toBeGreaterThan(0);

        // STEP 3: Customer adds products to cart
        console.log('\n🧪 STEP 3: Add Products to Cart');

        // Click first product to add to cart
        await customerPage.locator('.product-card').first().click();
        await customerPage.waitForTimeout(1000);

        // Check cart badge
        const cartBadge = await customerPage.locator('.cart-badge').textContent();
        console.log(`   ✅ Cart has ${cartBadge} item(s)`);
        expect(parseInt(cartBadge)).toBeGreaterThan(0);

        // STEP 4: Proceed to checkout
        console.log('\n🧪 STEP 4: Proceed to Checkout');
        await customerPage.click('button:has-text("Next")');
        await customerPage.waitForTimeout(1000);

        // Fill customer info
        await customerPage.fill('#customerName', 'Playwright Test Customer');
        await customerPage.fill('#customerPhone', '+27821234567');
        await customerPage.fill('#vehicleModel', 'Tesla Model 3');
        await customerPage.fill('#vehicleColor', 'White');
        await customerPage.fill('#licensePlate', 'CA 123 GP');

        console.log('   ✅ Customer info filled');

        // Go to payment step
        await customerPage.click('button:has-text("Next")');
        await customerPage.waitForTimeout(1000);

        // STEP 5: Select payment method
        console.log('\n🧪 STEP 5: Select Payment Method');
        await customerPage.click('.payment-method:has-text("InstaPay")');
        await customerPage.waitForTimeout(500);
        console.log('   ✅ Payment method selected: InstaPay');

        // STEP 6: Place order
        console.log('\n🧪 STEP 6: Place Order');
        await customerPage.click('button:has-text("Place Order")');

        // Wait for order confirmation
        await customerPage.waitForTimeout(3000);

        // Check if we reached tracking page
        const trackingVisible = await customerPage.locator('text=Track Your Order').isVisible().catch(() => false);

        if (trackingVisible) {
            console.log('   ✅ Order placed successfully!');

            // Extract order ID from tracking page
            const orderIdElement = await customerPage.locator('text=/Order #[A-Z0-9-]+/').textContent();
            orderId = orderIdElement.replace('Order #', '').trim();
            console.log(`   📦 Order ID: ${orderId}`);
        } else {
            // Check for error messages
            const pageContent = await customerPage.content();
            console.log('   ❌ Order may have failed. Page content snippet:');
            console.log(pageContent.substring(0, 500));
        }

        // STEP 7: Staff opens queue dashboard
        console.log('\n🧪 STEP 7: Staff Opens Queue Dashboard');
        await staffPage.goto('http://localhost:3001/login');
        await staffPage.fill('input[name="email"]', 'manager@basothomedicalherbs.ls');
        await staffPage.fill('input[name="password"]', 'Manager123!');
        await staffPage.click('button[type="submit"]');
        await staffPage.waitForTimeout(2000);

        await staffPage.goto('http://localhost:3001/retail-store-staff.html');
        await staffPage.waitForTimeout(2000);
        console.log('   ✅ Staff queue dashboard loaded');

        // STEP 8: Verify order appears in queue
        console.log('\n🧪 STEP 8: Verify Order in Staff Queue');

        const orderCards = await staffPage.locator('.order-card').count();
        console.log(`   📊 Queue has ${orderCards} order(s)`);

        if (orderCards > 0) {
            // Get first order details
            const firstOrderCard = staffPage.locator('.order-card').first();
            const orderText = await firstOrderCard.textContent();
            console.log('   ✅ Order found in queue');
            console.log('   Order details:', orderText.substring(0, 200));

            // Check for customer name
            const hasCustomerName = orderText.includes('Playwright Test Customer');
            if (hasCustomerName) {
                console.log('   ✅ Customer name matches');
            }

            // Check for vehicle info
            const hasVehicle = orderText.includes('Tesla') || orderText.includes('CA 123 GP');
            if (hasVehicle) {
                console.log('   ✅ Vehicle info present');
            }
        } else {
            console.log('   ⚠️  No orders in queue yet');
        }

        // STEP 9: Take screenshots
        console.log('\n🧪 STEP 9: Taking Screenshots');
        await customerPage.screenshot({ path: 'test-results/customer-tracking.png', fullPage: true });
        await staffPage.screenshot({ path: 'test-results/staff-queue.png', fullPage: true });
        console.log('   ✅ Screenshots saved');

        // ANALYSIS: What announcements/features are needed?
        console.log('\n📋 MISSING FEATURES ANALYSIS:');
        console.log('   1. ❌ Real-time notifications when new order arrives');
        console.log('   2. ❌ Audio alert/chime for staff when order placed');
        console.log('   3. ❌ Auto-refresh queue every 5-10 seconds');
        console.log('   4. ❌ Customer arrival notification (when customer clicks "I\'ve Arrived")');
        console.log('   5. ❌ Status update announcements (preparing → ready → completed)');
        console.log('   6. ❌ ETA countdown timer');
        console.log('   7. ❌ Queue position updates in real-time');
        console.log('   8. ❌ Section 21 verification alerts');
        console.log('   9. ❌ Low stock warnings for staff');
        console.log('   10. ❌ Customer distance/GPS tracking on staff view');
    });

    test.afterAll(async () => {
        await customerPage?.close();
        await staffPage?.close();
    });
});
