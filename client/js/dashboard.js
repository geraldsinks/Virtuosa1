// Logic for the Universal Router and Data Loading
const API_BASE = 'https://virtuosa-server.onrender.com/api';

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Determine current host for API calls
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');

    if (loadingState) loadingState.classList.remove('hidden');

    try {
        const response = await fetch(`${API_BASE}/user/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const userData = await response.json();

            if (loadingState) loadingState.classList.add('hidden');
            if (errorState) errorState.classList.add('hidden');

            // Routing Logic
            const isAdmin = (userData.email === 'admin@virtuosa.com' || userData.role === 'admin' || userData.isAdmin === true || userData.isAdmin === 'true');
            const isSeller = (userData.isSeller === true || userData.isSeller === 'true');

            if (isAdmin) {
                window.location.href = 'admin-dashboard.html';
            } else if (isSeller) {
                window.location.href = 'seller-dashboard.html';
            } else {
                window.location.href = 'buyer-dashboard.html';
            }
        } else {
            throw new Error('Unauthorized session');
        }

    } catch (error) {
        console.error('Dashboard error:', error);
        if (loadingState) loadingState.classList.add('hidden');
        if (errorState) errorState.classList.remove('hidden');
    }
});

// Helper: Load Recent Transactions (For individual dashboards)
async function loadRecentTransactions() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/transactions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const transactions = await response.json();
            const container = document.getElementById('recentTransactions');
            if (!container) return;

            if (transactions.length === 0) {
                container.innerHTML = '<p class="text-gray-500">No recent transactions</p>';
            } else {
                container.innerHTML = transactions.slice(0, 5).map(transaction => `
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2">
                        <div>
                            <p class="font-medium text-gray-900">${transaction.product.name}</p>
                            <p class="text-sm text-gray-500">${transaction.buyer.fullName}</p>
                            <p class="text-sm ${getTransactionStatusColor(transaction.status)}">${transaction.status}</p>
                        </div>
                        <div class="text-right">
                            <p class="font-bold text-gray-900">ZMW ${transaction.totalAmount.toLocaleString()}</p>
                        </div>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}

// Helper: Load Recent Reviews
async function loadRecentReviews() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/reviews/my`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const reviews = await response.json();
            const container = document.getElementById('recentReviews');
            if (!container) return;

            if (reviews.length === 0) {
                container.innerHTML = '<p class="text-gray-500">No recent reviews</p>';
            } else {
                container.innerHTML = reviews.slice(0, 3).map(review => `
                    <div class="p-4 bg-gray-50 rounded-lg mb-2">
                        <div class="flex items-start justify-between">
                            <div>
                                <div class="flex items-center mb-1">
                                    ${generateStars(review.rating)}
                                    <span class="ml-2 font-medium text-gray-900">${review.rating.toFixed(1)}</span>
                                </div>
                                <p class="text-xs text-gray-500">${new Date(review.createdAt).toLocaleDateString()}</p>
                            </div>
                            <p class="text-sm font-medium">${review.product.name}</p>
                        </div>
                        <p class="text-sm text-gray-700 mt-2 italic">"${review.comment || 'No comment provided'}"</p>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading reviews:', error);
    }
}

function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    let stars = '';
    for (let i = 0; i < fullStars; i++) stars += '<i class="fas fa-star text-yellow-400"></i>';
    if (hasHalfStar) stars += '<i class="fas fa-star-half-alt text-yellow-400"></i>';
    for (let i = 0; i < (5 - fullStars - (hasHalfStar ? 1 : 0)); i++) stars += '<i class="far fa-star text-gray-300"></i>';
    return stars;
}

function getTransactionStatusColor(status) {
    const colors = { 'Pending': 'text-yellow-600', 'Confirmed': 'text-blue-600', 'Shipped': 'text-purple-600', 'Completed': 'text-green-600', 'Cancelled': 'text-red-600' };
    return colors[status] || 'text-gray-600';
}

function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}
