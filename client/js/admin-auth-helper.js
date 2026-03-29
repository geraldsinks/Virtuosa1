// Admin Authentication Helper
// Handles token expiration and authentication errors consistently across all admin pages

// Global fetch wrapper for admin API calls
async function adminFetch(url, options = {}) {
    const token = localStorage.getItem('token');
    
    if (!token) {
        window.location.href = '/pages/login.html';
        return null;
    }

    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };

    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };

    try {
        const response = await fetch(url, finalOptions);
        
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                // Token expired or invalid - clear and redirect
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                alert('Your session has expired. Please log in again.');
                window.location.href = '/pages/login.html';
                return null;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response;
    } catch (error) {
        console.error('Admin fetch error:', error);
        
        // Don't redirect on network errors, only on auth errors
        if (error.message.includes('Failed to fetch')) {
            throw error; // Re-throw network errors
        }
        
        return null;
    }
}

// Check admin access with better error handling
async function checkAdminAccess() {
    const response = await adminFetch(`${API_BASE}/admin/role-info`);
    if (!response) return null;
    
    const roleInfo = await response.json();
    console.log('Admin access check - role info:', roleInfo);
    
    // Check if user role is admin, CEO, or has admin permissions (admin and CEO are same)
    if (roleInfo.role !== 'admin' && roleInfo.role !== 'CEO' && !roleInfo.permissions.includes('*')) {
        alert('Access denied. Admin privileges required.');
        window.location.href = '/pages/buyer-dashboard.html';
        return false;
    }
    
    return true;
}

// Enhanced error notification
function showError(message, type = 'error') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
        type === 'error' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-white'
    }`;
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-exclamation-triangle'} mr-2"></i>
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Enhanced success notification
function showSuccess(message) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-check-circle mr-2"></i>
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}
