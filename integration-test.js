// Integration Test Script for Virtuosa Systems
// This script tests the complete buying/selling workflow integration

const IntegrationTester = {
    // Test configuration
    config: {
        apiBase: window.API_BASE || 'http://localhost:3000/api',
        testUser: {
            email: 'testbuyer@example.com',
            password: 'test123456',
            fullName: 'Test Buyer'
        },
        testSeller: {
            email: 'testseller@example.com', 
            password: 'test123456',
            fullName: 'Test Seller'
        }
    },

    // Test results tracking
    results: {
        passed: 0,
        failed: 0,
        total: 0,
        details: []
    },

    // Utility functions
    async makeRequest(endpoint, options = {}) {
        try {
            const token = localStorage.getItem('token');
            const defaultHeaders = {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            };

            const response = await fetch(`${this.config.apiBase}${endpoint}`, {
                ...options,
                headers: { ...defaultHeaders, ...options.headers }
            });

            return {
                ok: response.ok,
                status: response.status,
                data: response.ok ? await response.json() : await response.json().catch(() => ({}))
            };
        } catch (error) {
            return {
                ok: false,
                status: 0,
                error: error.message
            };
        }
    },

    // Test assertion helper
    assert(condition, message) {
        this.results.total++;
        if (condition) {
            this.results.passed++;
            this.results.details.push({ status: 'PASS', message });
            console.log(`%c PASS: ${message}`, 'color: green');
        } else {
            this.results.failed++;
            this.results.details.push({ status: 'FAIL', message });
            console.log(`%c FAIL: ${message}`, 'color: red');
        }
    },

    // Test user authentication
    async testAuthentication() {
        console.log('\n=== Testing Authentication System ===');
        
        // Test login
        const loginResult = await this.makeRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email: this.config.testUser.email,
                password: this.config.testUser.password
            })
        });

        this.assert(loginResult.ok, 'User login successful');
        
        if (loginResult.ok) {
            localStorage.setItem('token', loginResult.data.token);
            this.assert(loginResult.data.token, 'JWT token received');
        }

        // Test user profile
        const profileResult = await this.makeRequest('/user/profile');
        this.assert(profileResult.ok, 'User profile accessible');
        this.assert(profileResult.data.email === this.config.testUser.email, 'Profile data correct');

        // Test role info
        const roleResult = await this.makeRequest('/user/role-info');
        this.assert(roleResult.ok, 'Role info accessible');
        this.assert(roleResult.data.role, 'User role assigned');
    },

    // Test product system
    async testProductSystem() {
        console.log('\n=== Testing Product System ===');
        
        // Test product listing
        const productsResult = await this.makeRequest('/products');
        this.assert(productsResult.ok, 'Product listing accessible');
        this.assert(Array.isArray(productsResult.data), 'Products returned as array');
        
        if (productsResult.data.length > 0) {
            const testProduct = productsResult.data[0];
            localStorage.setItem('testProductId', testProduct._id);
            
            // Test product details
            const detailResult = await this.makeRequest(`/products/${testProduct._id}`);
            this.assert(detailResult.ok, 'Product details accessible');
            this.assert(detailResult.data._id === testProduct._id, 'Product details correct');
        }
    },

    // Test cart system
    async testCartSystem() {
        console.log('\n=== Testing Cart System ===');
        
        const productId = localStorage.getItem('testProductId');
        if (!productId) {
            console.log('No test product available, skipping cart tests');
            return;
        }

        // Test getting cart
        const cartResult = await this.makeRequest('/cart');
        this.assert(cartResult.ok, 'Cart accessible');
        this.assert(cartResult.data.items !== undefined, 'Cart items structure correct');

        // Test adding to cart
        const addResult = await this.makeRequest('/cart/add', {
            method: 'POST',
            body: JSON.stringify({ productId, quantity: 1 })
        });
        this.assert(addResult.ok, 'Item added to cart');

        // Test updating cart
        const updateResult = await this.makeRequest('/cart/update', {
            method: 'PUT',
            body: JSON.stringify({ productId, quantity: 2 })
        });
        this.assert(updateResult.ok, 'Cart item updated');

        // Store cart for order test
        if (addResult.ok) {
            localStorage.setItem('testCart', JSON.stringify(addResult.data));
        }
    },

    // Test order system
    async testOrderSystem() {
        console.log('\n=== Testing Order System ===');
        
        // Test creating order (cash on delivery)
        const orderResult = await this.makeRequest('/orders', {
            method: 'POST',
            body: JSON.stringify({
                items: [{ productId: localStorage.getItem('testProductId'), quantity: 1 }],
                paymentMethod: 'cash_on_delivery',
                shippingAddress: {
                    street: '123 Test St',
                    city: 'Test City',
                    state: 'TS',
                    zipCode: '12345',
                    country: 'Test Country'
                }
            })
        });

        this.assert(orderResult.ok, 'Order creation successful');
        
        if (orderResult.ok) {
            localStorage.setItem('testOrderId', orderResult.data._id);
            this.assert(orderResult.data.status, 'Order status assigned');
        }

        // Test getting orders
        const ordersResult = await this.makeRequest('/orders');
        this.assert(ordersResult.ok, 'Orders list accessible');
        this.assert(Array.isArray(ordersResult.data), 'Orders returned as array');
    },

    // Test token rewards system
    async testTokenRewards() {
        console.log('\n=== Testing Token Rewards System ===');
        
        // Test getting token balance
        const balanceResult = await this.makeRequest('/tokens/balance');
        this.assert(balanceResult.ok, 'Token balance accessible');
        this.assert(typeof balanceResult.data.currentBalance === 'number', 'Balance is numeric');
        
        // Test earning tokens
        const earnResult = await this.makeRequest('/tokens/earn', {
            method: 'POST',
            body: JSON.stringify({
                amount: 10,
                reason: 'Integration test reward',
                referenceType: 'test'
            })
        });
        this.assert(earnResult.ok, 'Token earning successful');
        
        if (earnResult.ok) {
            this.assert(earnResult.data.newBalance >= 10, 'Balance updated correctly');
        }

        // Test token history
        const historyResult = await this.makeRequest('/tokens/history');
        this.assert(historyResult.ok, 'Token history accessible');
        this.assert(Array.isArray(historyResult.data.transactions), 'History returned as array');
    },

    // Test notification system
    async testNotificationSystem() {
        console.log('\n=== Testing Notification System ===');
        
        // Test getting notifications
        const notificationsResult = await this.makeRequest('/notifications');
        this.assert(notificationsResult.ok, 'Notifications accessible');
        this.assert(Array.isArray(notificationsResult.data), 'Notifications returned as array');

        // Test marking notifications as read
        if (notificationsResult.data.length > 0) {
            const markReadResult = await this.makeRequest('/notifications/mark-read', {
                method: 'POST',
                body: JSON.stringify({ notificationIds: [notificationsResult.data[0]._id] })
            });
            this.assert(markReadResult.ok, 'Mark notifications as read successful');
        }
    },

    // Test review system
    async testReviewSystem() {
        console.log('\n=== Testing Review System ===');
        
        const orderId = localStorage.getItem('testOrderId');
        const productId = localStorage.getItem('testProductId');
        
        if (!orderId || !productId) {
            console.log('No test order available, skipping review tests');
            return;
        }

        // Test getting my reviews
        const myReviewsResult = await this.makeRequest('/reviews/my-reviews');
        this.assert(myReviewsResult.ok, 'My reviews accessible');
        this.assert(Array.isArray(myReviewsResult.data), 'Reviews returned as array');

        // Test getting reviews about me
        const aboutMeResult = await this.makeRequest('/reviews/about-me');
        this.assert(aboutMeResult.ok, 'Reviews about me accessible');
        this.assert(Array.isArray(aboutMeResult.data), 'Reviews returned as array');
    },

    // Test analytics system
    async testAnalyticsSystem() {
        console.log('\n=== Testing Analytics System ===');
        
        // Test tracking analytics event
        const trackResult = await this.makeRequest('/analytics/track', {
            method: 'POST',
            body: JSON.stringify({
                events: [{
                    sessionId: 'test-session-' + Date.now(),
                    eventType: 'page_view',
                    category: 'integration_test',
                    timestamp: new Date().toISOString()
                }]
            })
        });
        this.assert(trackResult.ok, 'Analytics event tracking successful');
    },

    // Test system integration points
    async testSystemIntegration() {
        console.log('\n=== Testing System Integration ===');
        
        // Test cart-to-order flow
        const productId = localStorage.getItem('testProductId');
        if (productId) {
            // Add to cart
            await this.makeRequest('/cart/add', {
                method: 'POST',
                body: JSON.stringify({ productId, quantity: 1 })
            });
            
            // Create order
            const orderResult = await this.makeRequest('/orders', {
                method: 'POST',
                body: JSON.stringify({
                    items: [{ productId, quantity: 1 }],
                    paymentMethod: 'cash_on_delivery',
                    shippingAddress: {
                        street: '123 Test St',
                        city: 'Test City',
                        state: 'TS',
                        zipCode: '12345',
                        country: 'Test Country'
                    }
                })
            });
            
            this.assert(orderResult.ok, 'Cart to order integration successful');
        }

        // Test token reward integration
        const balanceBefore = await this.makeRequest('/tokens/balance');
        const initialBalance = balanceBefore.data.currentBalance;
        
        // Simulate earning tokens
        await this.makeRequest('/tokens/earn', {
            method: 'POST',
            body: JSON.stringify({
                amount: 5,
                reason: 'Integration test',
                referenceType: 'test'
            })
        });
        
        const balanceAfter = await this.makeRequest('/tokens/balance');
        this.assert(balanceAfter.data.currentBalance === initialBalance + 5, 'Token reward integration working');
    },

    // Test error handling
    async testErrorHandling() {
        console.log('\n=== Testing Error Handling ===');
        
        // Test invalid endpoint
        const invalidResult = await this.makeRequest('/invalid-endpoint');
        this.assert(!invalidResult.ok, 'Invalid endpoint returns error');
        this.assert(invalidResult.status === 404, '404 status for invalid endpoint');

        // Test unauthorized access
        const token = localStorage.getItem('token');
        localStorage.removeItem('token');
        
        const unauthorizedResult = await this.makeRequest('/user/profile');
        this.assert(!unauthorizedResult.ok, 'Unauthorized request blocked');
        this.assert(unauthorizedResult.status === 401, '401 status for unauthorized');
        
        // Restore token
        if (token) localStorage.setItem('token', token);
    },

    // Run all tests
    async runAllTests() {
        console.log('Starting Virtuosa Integration Tests...\n');
        
        try {
            await this.testAuthentication();
            await this.testProductSystem();
            await this.testCartSystem();
            await this.testOrderSystem();
            await this.testTokenRewards();
            await this.testNotificationSystem();
            await this.testReviewSystem();
            await this.testAnalyticsSystem();
            await this.testSystemIntegration();
            await this.testErrorHandling();
            
            this.printResults();
        } catch (error) {
            console.error('Test execution error:', error);
        }
    },

    // Print test results
    printResults() {
        console.log('\n=== Integration Test Results ===');
        console.log(`Total Tests: ${this.results.total}`);
        console.log(`Passed: ${this.results.passed}`);
        console.log(`Failed: ${this.results.failed}`);
        console.log(`Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
        
        console.log('\nDetailed Results:');
        this.results.details.forEach(result => {
            const icon = result.status === 'PASS' ? '  ' : '  ';
            console.log(`${icon} ${result.status}: ${result.message}`);
        });
        
        // Generate HTML report
        this.generateHTMLReport();
    },

    // Generate HTML report
    generateHTMLReport() {
        const reportHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Virtuosa Integration Test Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
                .pass { color: green; }
                .fail { color: red; }
                .details { margin: 20px 0; }
                .test-item { padding: 5px; border-bottom: 1px solid #eee; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Virtuosa Integration Test Report</h1>
                <p>Generated: ${new Date().toLocaleString()}</p>
                <p>Total Tests: ${this.results.total} | Passed: <span class="pass">${this.results.passed}</span> | Failed: <span class="fail">${this.results.failed}</span></p>
                <p>Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%</p>
            </div>
            
            <div class="details">
                <h2>Test Results</h2>
                ${this.results.details.map(result => `
                    <div class="test-item">
                        <span class="${result.status.toLowerCase()}">${result.status}:</span> ${result.message}
                    </div>
                `).join('')}
            </div>
        </body>
        </html>`;
        
        // Create downloadable report
        const blob = new Blob([reportHTML], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'virtuosa-integration-test-report.html';
        a.click();
        URL.revokeObjectURL(url);
    }
};

// Make available globally
window.IntegrationTester = IntegrationTester;

// Auto-run if on test page
if (window.location.pathname.includes('integration-test')) {
    document.addEventListener('DOMContentLoaded', () => {
        window.IntegrationTester.runAllTests();
    });
}

console.log('Integration Tester loaded. Run IntegrationTester.runAllTests() to start testing.');
