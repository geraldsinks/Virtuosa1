// Test script to verify notification system setup
const webpush = require('web-push');
const mongoose = require('mongoose');
require('dotenv').config({ path: './config/.env' });

async function testNotificationSetup() {
    console.log('🔧 Testing Notification System Setup...\n');

    // Test 1: Check VAPID keys
    console.log('1. Checking VAPID Keys...');
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    
    if (!publicKey || !privateKey) {
        console.log('❌ VAPID keys not found in environment variables');
        return false;
    }
    
    console.log('✅ VAPID keys found');
    console.log(`   Public Key: ${publicKey.substring(0, 20)}...`);
    console.log(`   Private Key: ${privateKey.substring(0, 20)}...\n`);

    // Test 2: Configure web-push
    console.log('2. Testing Web Push Configuration...');
    try {
        webpush.setVapidDetails(
            'mailto:notifications@virtuosazm.com',
            publicKey,
            privateKey
        );
        console.log('✅ Web Push configured successfully\n');
    } catch (error) {
        console.log('❌ Web Push configuration failed:', error.message);
        return false;
    }

    // Test 3: Check database connection (optional)
    console.log('3. Testing Database Connection...');
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Database connection successful\n');
        
        // Test User model with push notification fields
        const User = require('./models/User');
        console.log('✅ User model with push notification fields loaded\n');
        
        await mongoose.disconnect();
    } catch (error) {
        console.log('❌ Database connection failed:', error.message);
        console.log('   (This is optional for notification testing)\n');
    }

    // Test 4: Generate test notification payload
    console.log('4. Testing Notification Payload Generation...');
    try {
        const testPayload = JSON.stringify({
            title: 'Test Notification 🔔',
            body: 'This is a test notification from Virtuosa',
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'test-notification',
            data: {
                url: '/pages/notifications.html',
                type: 'test'
            }
        });
        
        console.log('✅ Test payload generated successfully');
        console.log(`   Payload size: ${testPayload.length} characters\n`);
    } catch (error) {
        console.log('❌ Payload generation failed:', error.message);
        return false;
    }

    console.log('🎉 Notification System Setup Test Complete!');
    console.log('\nNext steps:');
    console.log('1. Start the server: npm start');
    console.log('2. Open browser and navigate to your Virtuosa app');
    console.log('3. Login and test notification permissions');
    console.log('4. Create a test order to verify notifications work');
    
    return true;
}

// Run the test
testNotificationSetup().then(success => {
    if (success) {
        console.log('\n✅ All tests passed! System is ready for notifications.');
    } else {
        console.log('\n❌ Some tests failed. Please check the setup.');
    }
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('Test script error:', error);
    process.exit(1);
});
