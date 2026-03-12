// Simple script to create sample marketing data via API
const fetch = require('node-fetch');

async function createSampleData() {
    const baseUrl = 'http://localhost:5000';
    
    // You'll need to get a valid admin token first
    // For now, let's just test the endpoints without authentication
    
    console.log('Testing public endpoints...');
    
    try {
        // Test public ad sliders
        const adResponse = await fetch(`${baseUrl}/api/public/marketing/ad-sliders`);
        const adData = await adResponse.json();
        console.log('Ad sliders:', adData.length, 'items');
        
        // Test public category cards
        const cardResponse = await fetch(`${baseUrl}/api/public/marketing/category-cards`);
        const cardData = await cardResponse.json();
        console.log('Category cards:', cardData.length, 'items');
        
        console.log('✅ Public endpoints are working!');
        console.log('⚠️  No data in database yet - you need to:');
        console.log('1. Start MongoDB service');
        console.log('2. Run the seeding script');
        console.log('3. Or create data through the admin interface');
        
    } catch (error) {
        console.error('❌ Error testing endpoints:', error.message);
    }
}

createSampleData();
