// Universal Dashboard JavaScript
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');

    if (!token) {
        // Redirect to login if no token
        window.location.href = 'login.html';
        return;
    }

    // Show loading state
    document.getElementById('loadingState').classList.remove('hidden');

    try {
        // Fetch user profile to determine role
        const response = await fetch('/api/user/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const userData = await response.json();

            // Hide loading and error states
            document.getElementById('loadingState').classList.add('hidden');
            document.getElementById('errorState').classList.add('hidden');

            // Route to appropriate dashboard based on user role
            if (userData.email === 'admin@virtuosa.com' || userData.role === 'admin' || userData.isAdmin === 'true' || userData.isAdmin === true) {
                // Admin user - show admin dashboard
                window.location.href = 'admin-dashboard.html';
                return;
            } else if (userData.isSeller) {
                // Seller user - always allow access to dashboard
                window.location.href = 'seller-dashboard.html';
                return;
            } else {
                // Regular user - redirect to buyer dashboard
                window.location.href = 'buyer-dashboard.html';
                return;
            }
        } else {
            // Handle error case
            document.getElementById('loadingState').classList.add('hidden');
            document.getElementById('errorState').classList.remove('hidden');
        }

    } catch (error) {
        console.error('Dashboard error:', error);
        // Show error state
        const loadingState = document.getElementById('loadingState');
        const errorState = document.getElementById('errorState');
        if (loadingState) loadingState.classList.add('hidden');
        if (errorState) errorState.classList.remove('hidden');
    }
});



// Load recent transactions
async function loadRecentTransactions() {
    try {
        const token = localStorage.getItem('token');

        const response = await fetch('/api/transactions', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const transactions = await response.json();
            const container = document.getElementById('recentTransactions');

            if (transactions.length === 0) {
                container.innerHTML = '<p class="text-gray-500">No recent transactions</p>';
            } else {
                container.innerHTML = transactions.slice(0, 5).map(transaction => `
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                            <p class="font-medium text-gray-900">${transaction.product.name}</p>
                            <p class="text-sm text-gray-500">${transaction.buyer.fullName}</p>
                            <p class="text-sm ${getTransactionStatusColor(transaction.status)}">${transaction.status}</p>
                        </div>
                        <div class="text-right">
                            <p class="font-bold text-gray-900">ZMW${transaction.totalAmount.toLocaleString()}</p>
                        </div>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}

// Load recent reviews
async function loadRecentReviews() {
    try {
        const token = localStorage.getItem('token');

        const response = await fetch('/api/reviews/my', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const reviews = await response.json();
            const container = document.getElementById('recentReviews');

            if (reviews.length === 0) {
                container.innerHTML = '<p class="text-gray-500">No recent reviews</p>';
            } else {
                container.innerHTML = reviews.slice(0, 3).map(review => `
                    <div class="p-4 bg-gray-50 rounded-lg">
                        <div class="flex items-start justify-between">
                            <div>
                                <div class="flex items-center mb-2">
                                    ${generateStars(review.rating)}
                                    <span class="ml-2 font-medium text-gray-900">${review.rating.toFixed(1)}</span>
                                </div>
                                <p class="text-sm text-gray-600">${review.reviewType === 'Buyer to Seller' ? 'Buyer to Seller' : 'Seller to Buyer'}</p>
                                <p class="text-sm text-gray-500">${new Date(review.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div class="text-right">
                                <p class="text-sm text-gray-600">${review.product.name}</p>
                            </div>
                        </div>
                        ${review.comment ? `
                            <div class="mt-3 pt-3 border-t border-gray-200">
                                <p class="text-sm text-gray-700">${review.comment}</p>
                            </div>
                        ` : ''}
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading reviews:', error);
    }
}

// Generate star rating display
function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    let stars = '';

    // Add full stars
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star text-yellow-400"></i>';
    }

    // Add half star if needed
    if (hasHalfStar) {
        stars += '<i class="fas fa-star-half-alt text-yellow-400"></i>';
    }

    // Add empty stars
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="far fa-star text-gray-300"></i>';
    }

    return stars;
}

// Get transaction status color
function getTransactionStatusColor(status) {
    const colors = {
        'Pending': 'text-yellow-600',
        'Confirmed': 'text-blue-600',
        'Shipped': 'text-purple-600',
        'Completed': 'text-green-600',
        'Cancelled': 'text-red-600'
    };
    return colors[status] || 'text-gray-600';
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userFullName');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}
