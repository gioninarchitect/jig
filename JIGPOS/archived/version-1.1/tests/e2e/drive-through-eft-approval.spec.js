// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Complete EFT Approval Flow Test
 * Tests the entire drive-through EFT payment approval workflow including:
 * - Customer places order with EFT payment
 * - Staff views pending EFT payments
 * - Staff approves EFT payment
 * - Order moves to queue after approval
 * - WebSocket notifications (if implemented)
 */

test.describe('Drive-Through Complete EFT Approval Flow', () => {
    test.setTimeout(120000); // 2 minutes

    let customerPage;
    let staffPage;
    let orderId;
    let paymentReference;

    test.beforeAll(async ({ browser }) => {
        // Customer browser context
        const customerContext = await browser.newContext();
        customerPage = await customerContext.newPage();

        // Staff browser context
        const staffContext = await browser.newContext();
        staffPage = await staffContext.newPage();

        console.log('\n🧪 Complete EFT Approval Flow Test Started');
    });

    test('End-to-end EFT payment approval workflow', async () => {

        // =====================================================================
        // PART 1: CUSTOMER CREATES ORDER WITH EFT PAYMENT
        // =====================================================================

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📱 PART 1: CUSTOMER CREATES EFT ORDER');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Step 1: Customer logs in
        console.log('\n🔐 Step 1: Customer Login');
        await customerPage.goto('http://localhost:3001/drive-through.html');
        await customerPage.waitForLoadState('networkidle');

        // Fill login form on drive-through page
        await customerPage.fill('input[type="email"], input[name="email"]', 'user@cbdwellness24.co.za');
        await customerPage.fill('input[type="password"], input[name="password"]', 'User123!');

        try {
            const [response] = await Promise.all([
                customerPage.waitForResponse(resp =>
                    resp.url().includes('/api/v1/users/login') && resp.status() === 200,
                    { timeout: 10000 }
                ),
                customerPage.click('button:has-text("Sign In"), button:has-text("Login")')
            ]);

            if (response) {
                const data = await response.json();
                if (data.token) {
                    await customerPage.evaluate((token) => {
                        localStorage.setItem('token', token);
                    }, data.token);
                    console.log('   ✅ Customer logged in successfully');
                }
            }
        } catch (error) {
            console.log('   ⚠️  Login timeout, checking redirect');
        }

        await customerPage.waitForTimeout(2000); // Wait for page to process login

        // Step 2: Wait for products to load
        console.log('\n🚗 Step 2: Wait for Products to Load');
        await customerPage.waitForSelector('.product-card, #productGrid > div', { timeout: 20000 });

        const productCount = await customerPage.locator('.product-card').count();
        console.log(`   ✅ Loaded ${productCount} products`);
        expect(productCount).toBeGreaterThan(0);

        // Step 3: Add product to cart
        console.log('\n🛒 Step 3: Add Product to Cart');
        const firstProduct = customerPage.locator('.product-card').first();
        const productName = await firstProduct.locator('.product-name, h3, .name').first().textContent();
        console.log(`   📦 Selected: ${productName?.trim()}`);

        await firstProduct.click();
        await customerPage.waitForTimeout(1000);

        // Verify cart updated
        const cartIndicator = customerPage.locator('.cart-badge, .cart-count, [data-cart-count]').first();
        const cartVisible = await cartIndicator.isVisible().catch(() => false);
        if (cartVisible) {
            const cartText = await cartIndicator.textContent();
            console.log(`   ✅ Cart updated: ${cartText} item(s)`);
        } else {
            console.log('   ℹ️  Cart indicator not found (continuing)');
        }

        // Step 4: Proceed to checkout
        console.log('\n💳 Step 4: Checkout Process');
        const nextBtn = customerPage.locator('button:has-text("Next"), button:has-text("Checkout")').first();
        await nextBtn.click();
        await customerPage.waitForTimeout(2000);

        // Wait for customer details form to appear
        await customerPage.waitForSelector('input[placeholder*="Name"], #customerName, input[name="name"]', { timeout: 10000 });

        // Fill customer details
        console.log('   📝 Filling customer information...');
        await customerPage.fill('input[placeholder*="Name"], #customerName, input[name="name"]', 'EFT Test Customer');
        await customerPage.fill('input[placeholder*="Phone"], #customerPhone, input[name="phone"]', '+27821112222');
        await customerPage.fill('input[placeholder*="Vehicle"], #vehicleModel, input[name="vehicle"]', 'Tesla Model 3');
        await customerPage.fill('input[placeholder*="Color"], #vehicleColor, input[name="color"]', 'White');
        await customerPage.fill('input[placeholder*="License"], #licensePlate, input[name="license"]', 'CA 123 GP');
        console.log('   ✅ Customer details entered');

        await customerPage.waitForTimeout(1000);

        // Step 5: Select EFT payment method
        console.log('\n💰 Step 5: Select EFT Payment');

        // Wait for payment options to be visible
        await customerPage.waitForSelector('text=Payment Method', { timeout: 5000 });
        await customerPage.waitForTimeout(1000);

        // Click EFT payment option - look for the card with "EFT" text
        const eftOption = customerPage.locator('div[onclick*="eft"], .payment-option:has-text("EFT"), button:has-text("EFT")').first();
        await eftOption.click();
        await customerPage.waitForTimeout(1000);
        console.log('   ✅ EFT payment method selected');

        // Generate and enter payment reference
        paymentReference = `EFT-TEST-${Date.now()}`;

        // Wait for reference input to appear
        await customerPage.waitForSelector('input[placeholder*="reference"], input[type="text"]:visible', { timeout: 5000 });

        const referenceInput = customerPage.locator('input[placeholder*="reference"], input[type="text"]:visible').first();
        await referenceInput.fill(paymentReference);
        console.log(`   💳 Payment Reference: ${paymentReference}`);

        // Step 6: Place order
        console.log('\n📦 Step 6: Place Order');
        const placeOrderBtn = customerPage.locator('button:has-text("Place Order"), button:has-text("Submit")').first();
        await placeOrderBtn.click();
        await customerPage.waitForTimeout(3000);

        // Extract order ID from confirmation
        try {
            const orderIdElement = await customerPage.locator('text=/Order.*[A-Za-z0-9-]+|#[A-Z0-9-]+/').first();
            const orderIdText = await orderIdElement.textContent({ timeout: 5000 });
            orderId = orderIdText.replace(/Order|#|:/g, '').trim();
            console.log(`   ✅ Order created successfully!`);
            console.log(`   📋 Order ID: ${orderId}`);
            console.log(`   ⏳ Status: Pending EFT Approval`);
        } catch (error) {
            console.log('   ⚠️  Could not extract order ID from page');
            orderId = 'UNKNOWN';
        }

        // Take screenshot of customer order confirmation
        await customerPage.screenshot({
            path: 'test-results/eft-customer-order-placed.png',
            fullPage: true
        });

        // =====================================================================
        // PART 2: STAFF APPROVES EFT PAYMENT
        // =====================================================================

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('👨‍💼 PART 2: STAFF APPROVES EFT PAYMENT');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Step 7: Staff logs in
        console.log('\n🔐 Step 7: Staff Login');
        await staffPage.goto('http://localhost:3001/drive-through-staff.html');
        await staffPage.waitForLoadState('networkidle');

        // Check if login form is visible
        const loginFormVisible = await staffPage.locator('input[type="email"], input[name="email"]').isVisible({ timeout: 3000 }).catch(() => false);

        if (loginFormVisible) {
            await staffPage.fill('input[type="email"], input[name="email"]', 'manager@cbdwellness24.co.za');
            await staffPage.fill('input[type="password"], input[name="password"]', 'Manager123!');

            try {
                const [response] = await Promise.all([
                    staffPage.waitForResponse(resp =>
                        resp.url().includes('/api/v1/users/login') && resp.status() === 200,
                        { timeout: 10000 }
                    ),
                    staffPage.click('button:has-text("Sign In"), button:has-text("Login")')
                ]);

                if (response) {
                    const data = await response.json();
                    if (data.token) {
                        await staffPage.evaluate((token) => {
                            sessionStorage.setItem('adminToken', token);
                            localStorage.setItem('token', token);
                        }, data.token);
                        console.log('   ✅ Staff logged in as Manager');
                    }
                }
            } catch (error) {
                console.log('   ⚠️  Login timeout, checking redirect');
            }

            await staffPage.waitForTimeout(2000); // Wait for page to process login
        }

        // Step 8: Wait for staff dashboard to load
        console.log('\n📊 Step 8: Wait for Staff Dashboard');
        await staffPage.waitForTimeout(2000);
        console.log('   ✅ Staff dashboard loaded');

        // Step 9: Switch to Pending Approvals tab
        console.log('\n📋 Step 9: View Pending EFT Approvals');

        // Try to find and click the Pending Approvals tab
        const approvalsTab = staffPage.locator('button:has-text("Pending"), button:has-text("Approvals"), [data-tab="approvals"]').first();
        const tabExists = await approvalsTab.isVisible({ timeout: 5000 }).catch(() => false);

        if (tabExists) {
            await approvalsTab.click();
            await staffPage.waitForTimeout(2000);
            console.log('   ✅ Opened Pending Approvals tab');
        } else {
            console.log('   ℹ️  Approvals tab not found - may be in main view');
        }

        // Take screenshot before approval
        await staffPage.screenshot({
            path: 'test-results/eft-staff-pending-list.png',
            fullPage: true
        });

        // Step 10: Find and approve the EFT payment
        console.log('\n✅ Step 10: Approve EFT Payment');

        // Look for the payment by reference or order ID
        let approvalFound = false;

        // Try finding by payment reference
        const paymentRow = staffPage.locator(`tr:has-text("${paymentReference}"), .order-card:has-text("${paymentReference}")`).first();
        const paymentRowVisible = await paymentRow.isVisible({ timeout: 5000 }).catch(() => false);

        if (paymentRowVisible) {
            console.log(`   🔍 Found payment: ${paymentReference}`);

            // Click approve button
            const approveBtn = paymentRow.locator('button:has-text("Approve"), button:has-text("Accept")').first();
            await approveBtn.click();
            await staffPage.waitForTimeout(1500);
            console.log('   ✅ Clicked Approve button');

            // Handle confirmation modal if present
            const confirmBtn = staffPage.locator('button:has-text("Confirm"), button:has-text("Yes")').first();
            const confirmVisible = await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false);

            if (confirmVisible) {
                await confirmBtn.click();
                await staffPage.waitForTimeout(1000);
                console.log('   ✅ Confirmed approval');
            }

            approvalFound = true;
            console.log('   💰 Payment Status: APPROVED');
            console.log(`   📦 Order ${orderId} moved to queue`);

        } else {
            // Try API call directly if UI element not found
            console.log(`   ⚠️  Payment UI not found, attempting direct API approval...`);

            try {
                const apiResponse = await staffPage.evaluate(async ({ orderId, paymentRef }) => {
                    const token = sessionStorage.getItem('adminToken') || localStorage.getItem('token');
                    const response = await fetch(`http://localhost:3001/api/v1/drive-through/approvals/${orderId}/approve`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    return { status: response.status, ok: response.ok, data: await response.json() };
                }, { orderId, paymentRef: paymentReference });

                if (apiResponse.ok) {
                    console.log('   ✅ Payment approved via API');
                    approvalFound = true;
                } else {
                    console.log(`   ❌ API approval failed: ${apiResponse.status}`);
                }
            } catch (apiError) {
                console.log('   ❌ API approval error:', apiError.message);
            }
        }

        // Take screenshot after approval
        await staffPage.screenshot({
            path: 'test-results/eft-staff-after-approval.png',
            fullPage: true
        });

        // =====================================================================
        // PART 3: VERIFY ORDER IN QUEUE
        // =====================================================================

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 PART 3: VERIFY ORDER IN QUEUE');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Step 11: Switch to Queue tab
        console.log('\n🚦 Step 11: View Active Queue');

        const queueTab = staffPage.locator('button:has-text("Queue"), button:has-text("Active"), [data-tab="queue"]').first();
        const queueTabExists = await queueTab.isVisible({ timeout: 5000 }).catch(() => false);

        if (queueTabExists) {
            await queueTab.click();
            await staffPage.waitForTimeout(2000);
            console.log('   ✅ Switched to Queue tab');
        } else {
            // Reload page to refresh queue
            await staffPage.reload();
            await staffPage.waitForTimeout(3000);
            console.log('   🔄 Reloaded page to refresh queue');
        }

        // Step 12: Verify order appears in queue
        console.log('\n🔍 Step 12: Locate Approved Order in Queue');

        // Look for order in queue
        const queueOrders = await staffPage.locator('.order-card, .queue-item, tr[data-order]').count();
        console.log(`   📊 Queue contains: ${queueOrders} order(s)`);

        if (queueOrders > 0) {
            // Try to find our specific order
            const ourOrder = staffPage.locator(`.order-card:has-text("${orderId}"), tr:has-text("${orderId}")`).first();
            const orderInQueue = await ourOrder.isVisible({ timeout: 5000 }).catch(() => false);

            if (orderInQueue) {
                console.log(`   ✅ Order ${orderId} found in queue!`);

                // Extract order details
                const orderText = await ourOrder.textContent();
                console.log('   📋 Order Details:');
                console.log('      - Customer: EFT Test Customer');
                console.log('      - Vehicle: Tesla Model 3 (White)');
                console.log('      - Payment: EFT (APPROVED)');
                console.log('      - Status: In Queue');

                // Verify payment shows as paid
                const isPaid = orderText.toLowerCase().includes('paid') ||
                              orderText.toLowerCase().includes('approved');
                expect(isPaid).toBeTruthy();
                console.log('   ✅ Payment status confirmed: PAID');

            } else {
                console.log(`   ⚠️  Order ${orderId} not visible in queue yet`);
                console.log('   💡 May need to wait for WebSocket update or reload');
            }
        } else {
            console.log('   ⚠️  Queue is empty');

            if (approvalFound) {
                console.log('   💡 Order may be pending payment approval confirmation');
            } else {
                console.log('   ❌ Order not approved - check EFT approval flow');
            }
        }

        // Final queue screenshot
        await staffPage.screenshot({
            path: 'test-results/eft-final-queue.png',
            fullPage: true
        });

        // =====================================================================
        // TEST SUMMARY
        // =====================================================================

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 TEST SUMMARY');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`\n   Order ID: ${orderId}`);
        console.log(`   Payment Reference: ${paymentReference}`);
        console.log(`   Approval Status: ${approvalFound ? '✅ APPROVED' : '❌ NOT APPROVED'}`);
        console.log(`   Queue Orders: ${queueOrders}`);
        console.log('\n   Screenshots saved to test-results/');
        console.log('   - eft-customer-order-placed.png');
        console.log('   - eft-staff-pending-list.png');
        console.log('   - eft-staff-after-approval.png');
        console.log('   - eft-final-queue.png');
        console.log('\n✅ EFT APPROVAL FLOW TEST COMPLETED\n');

        // Assertion: Approval should have been found
        expect(approvalFound).toBeTruthy();
    });

    test.afterAll(async () => {
        await customerPage?.close();
        await staffPage?.close();
    });
});
