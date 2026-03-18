// Debug script for seller applications loading
console.log('=== Debug Seller Applications Loading ===');

// Check if API_BASE is available
if (typeof API_BASE !== 'undefined') {
    console.log('✅ API_BASE found:', API_BASE);
} else {
    console.log('❌ API_BASE not found');
}

// Check if we're on the correct page
if (window.location.pathname.includes('admin-seller-applications.html')) {
    console.log('✅ Correct page detected');
    
    // Check if loadApplications function exists
    if (typeof loadApplications === 'function') {
        console.log('✅ loadApplications function exists');
        
        // Override loadApplications to add debugging
        const originalLoadApplications = window.loadApplications;
        window.loadApplications = async function() {
            console.log('🔄 loadApplications called');
            
            try {
                const token = localStorage.getItem('token');
                console.log('🔑 Token found:', token ? 'Yes' : 'No');
                
                if (!token) {
                    console.error('❌ No admin token found');
                    document.getElementById('applications-list').innerHTML = `
                        <div class="text-center py-12 text-red-400">
                            <i class="fas fa-exclamation-triangle text-2xl mb-3"></i>
                            <p>No admin token found. Please log in as admin.</p>
                            <button onclick="window.location.href='/pages/login.html'" class="bg-blue-600 text-white px-4 py-2 rounded-lg mt-3">
                                Go to Login
                            </button>
                        </div>
                    `;
                    return;
                }
                
                console.log('🌐 Making API request...');
                
                const status = document.getElementById('filter-status')?.value || '';
                const sellerType = document.getElementById('filter-type')?.value || '';
                const university = document.getElementById('filter-university')?.value || '';
                
                console.log('📋 Filters:', { status, sellerType, university });
                
                const params = new URLSearchParams({ page: 1, limit: 20 });
                if (status) params.append('status', status);
                if (sellerType) params.append('sellerType', sellerType);
                if (university) params.append('university', university);
                
                const apiUrl = `${API_BASE}/admin/seller-applications?${params}`;
                console.log('🔗 API URL:', apiUrl);
                console.log('🔗 Full URL:', apiUrl.startsWith('http') ? apiUrl : window.location.origin + apiUrl);
                
                const response = await fetch(apiUrl, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                console.log('📡 Response status:', response.status);
                console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
                
                const data = await response.json();
                console.log('📦 Response data:', data);
                
                if (response.ok) {
                    console.log('✅ API call successful');
                    console.log('📊 Applications count:', data.applications?.length || 0);
                    
                    // Call original function
                    return originalLoadApplications.call(this);
                } else {
                    console.error('❌ API call failed:', data);
                    throw new Error(data.message || 'API call failed');
                }
                
            } catch (error) {
                console.error('❌ Error in loadApplications:', error);
                document.getElementById('applications-list').innerHTML = `
                    <div class="text-center py-12 text-red-400">
                        <i class="fas fa-exclamation-circle text-2xl mb-3"></i>
                        <p>Error loading applications: ${error.message}</p>
                        <button onclick="window.location.reload()" class="bg-blue-600 text-white px-4 py-2 rounded-lg mt-3">
                            Reload Page
                        </button>
                    </div>
                `;
            }
        };
        
        // Call loadApplications after a short delay to allow page to load
        setTimeout(() => {
            console.log('🚀 Auto-calling loadApplications...');
            loadApplications();
        }, 1000);
        
    } else {
        console.error('❌ loadApplications function not found');
    }
    
    // Check if DOM elements exist
    const elements = [
        'applications-list',
        'filter-status',
        'filter-type', 
        'filter-university',
        'stat-total',
        'stat-pending',
        'stat-approved',
        'stat-rejected'
    ];
    
    console.log('🔍 Checking DOM elements:');
    elements.forEach(id => {
        const element = document.getElementById(id);
        console.log(`${element ? '✅' : '❌'} #${id}: ${element ? 'Found' : 'Not found'}`);
    });
    
} else {
    console.log('❌ Not on admin-seller-applications page');
}

// Add network error listener
window.addEventListener('error', (e) => {
    if (e.target && e.target.tagName === 'SCRIPT') {
        console.error('❌ Script loading error:', e.target.src, e.message);
    }
});

// Add unhandled promise rejection listener
window.addEventListener('unhandledrejection', (e) => {
    console.error('❌ Unhandled promise rejection:', e.reason);
});

console.log('=== Debug script loaded ===');
