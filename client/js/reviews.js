// Reviews System JavaScript
let currentReviewId = null;
let currentRating = 0;

// Load user's reviews
async function loadMyReviews() {
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE}/reviews/my-reviews`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load reviews');
        }

        const reviews = await response.json();
        displayMyReviews(reviews);
    } catch (error) {
        console.error('Error loading my reviews:', error);
        showError('Failed to load reviews');
    }
}

// Load reviews about the user
async function loadReviewsAboutMe() {
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE}/reviews/about-me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load reviews');
        }

        const reviews = await response.json();
        displayReviewsAboutMe(reviews);
    } catch (error) {
        console.error('Error loading reviews about me:', error);
        showError('Failed to load reviews');
    }
}

// Display my reviews
function displayMyReviews(reviews) {
    const container = document.getElementById('myReviewsList');
    container.innerHTML = '';

    if (reviews.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">You haven\'t written any reviews yet</p>';
        return;
    }

    reviews.forEach(review => {
        const reviewCard = document.createElement('div');
        reviewCard.className = 'border border-gray-200 rounded-lg p-4';
        reviewCard.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <div>
                    <h4 class="font-medium text-gray-900">${review.reviewType}</h4>
                    <p class="text-sm text-gray-500">Reviewed: ${review.reviewedUser.fullName}</p>
                    <p class="text-sm text-gray-500">Transaction: ${review.transaction.product.name}</p>
                </div>
                <div class="text-right">
                    <div class="flex items-center mb-1">
                        ${generateStars(review.rating)}
                    </div>
                    <p class="text-sm text-gray-500">${new Date(review.createdAt).toLocaleDateString()}</p>
                </div>
            </div>
            <p class="text-gray-700 mb-3">${review.review}</p>
            ${review.response ? `
                <div class="bg-blue-50 border-l-4 border-blue-400 p-3 mb-3">
                    <p class="text-sm font-medium text-blue-800 mb-1">Seller Response:</p>
                    <p class="text-sm text-blue-700">${review.response}</p>
                </div>
            ` : ''}
            <div class="flex justify-end space-x-2">
                <button onclick="editReview('${review._id}')" class="text-blue-600 hover:text-blue-800 text-sm">
                    <i class="fas fa-edit mr-1"></i>Edit
                </button>
                <button onclick="deleteReview('${review._id}')" class="text-red-600 hover:text-red-800 text-sm">
                    <i class="fas fa-trash mr-1"></i>Delete
                </button>
            </div>
        `;
        container.appendChild(reviewCard);
    });
}

// Display reviews about me
function displayReviewsAboutMe(reviews) {
    const container = document.getElementById('reviewsAboutMeList');
    container.innerHTML = '';

    if (reviews.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">No reviews about you yet</p>';
        return;
    }

    reviews.forEach(review => {
        const reviewCard = document.createElement('div');
        reviewCard.className = 'border border-gray-200 rounded-lg p-4';
        reviewCard.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <div>
                    <h4 class="font-medium text-gray-900">${review.reviewType}</h4>
                    <p class="text-sm text-gray-500">Reviewed by: ${review.reviewer.fullName}</p>
                    <p class="text-sm text-gray-500">Transaction: ${review.transaction.product.name}</p>
                </div>
                <div class="text-right">
                    <div class="flex items-center mb-1">
                        ${generateStars(review.rating)}
                    </div>
                    <p class="text-sm text-gray-500">${new Date(review.createdAt).toLocaleDateString()}</p>
                </div>
            </div>
            <p class="text-gray-700 mb-3">${review.review}</p>
            ${review.response ? `
                <div class="bg-green-50 border-l-4 border-green-400 p-3 mb-3">
                    <p class="text-sm font-medium text-green-800 mb-1">Your Response:</p>
                    <p class="text-sm text-green-700">${review.response}</p>
                </div>
            ` : ''}
            ${!review.response && review.reviewType === 'Buyer to Seller' ? `
                <div class="flex justify-end">
                    <button onclick="openResponseModal('${review._id}')" class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 text-sm">
                        Respond to Review
                    </button>
                </div>
            ` : ''}
        `;
        container.appendChild(reviewCard);
    });
}

// Generate star rating display
function generateStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += '<i class="fas fa-star text-yellow-400"></i>';
        } else {
            stars += '<i class="fas fa-star text-gray-300"></i>';
        }
    }
    return stars;
}

// Set rating for new review
function setRating(rating) {
    currentRating = rating;
    document.getElementById('ratingValue').value = rating;
    
    // Update star display
    const stars = document.querySelectorAll('.rating-star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.remove('text-gray-300');
            star.classList.add('text-yellow-400');
        } else {
            star.classList.remove('text-yellow-400');
            star.classList.add('text-gray-300');
        }
    });
}

// Load transactions for review creation
async function loadTransactionsForReview() {
    console.log('🔄 Loading transactions for review...');
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('❌ No token found');
            document.getElementById('transactionSelect').innerHTML = '<option value="">Please log in to load transactions</option>';
            return;
        }

        const reviewType = document.getElementById('reviewType').value;
        console.log('📋 Review type:', reviewType);
        
        if (!reviewType) {
            document.getElementById('transactionSelect').innerHTML = '<option value="">Select review type first</option>';
            return;
        }

        console.log('🌐 Fetching transactions from:', `${API_BASE}/transactions?status=Completed`);
        
        const response = await fetch(`${API_BASE}/transactions?status=Completed`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('📡 Transactions response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ Server error:', errorData);
            throw new Error(errorData.message || 'Failed to load transactions');
        }

        const data = await response.json();
        const transactions = data.transactions || [];
        console.log('📦 Loaded transactions:', transactions);
        
        const select = document.getElementById('transactionSelect');
        select.innerHTML = '<option value="">Select a completed transaction</option>';
        
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        console.log('👤 Current user:', user);
        
        transactions.forEach(transaction => {
            // Filter transactions based on review type
            const canReview = reviewType === 'Buyer to Seller' ? 
                transaction.buyer?._id === user.id :
                transaction.seller?._id === user.id;
            
            console.log(`🔍 Transaction ${transaction._id} can review:`, canReview);
            
            if (canReview) {
                const option = document.createElement('option');
                option.value = transaction._id;
                option.textContent = `${transaction.product.name} - K${transaction.totalAmount} (${new Date(transaction.createdAt).toLocaleDateString()})`;
                select.appendChild(option);
            }
        });

        console.log('✅ Transactions loaded successfully');
    } catch (error) {
        console.error('❌ Error loading transactions:', error);
        showError(error.message || 'Failed to load transactions');
    }
}

// Create new review
async function createReview(event) {
    event.preventDefault();
    
    console.log('📝 Creating review...');
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showError('Please log in to create a review');
            return;
        }

        const reviewType = document.getElementById('reviewType').value;
        const transactionId = document.getElementById('transactionSelect').value;
        const rating = document.getElementById('ratingValue').value;
        const reviewText = document.getElementById('reviewText').value;

        console.log('📝 Review data:', { reviewType, transactionId, rating, reviewText });

        if (!reviewType || !transactionId || rating === '0' || !reviewText) {
            showError('Please fill in all fields');
            console.log('❌ Validation failed:', { reviewType, transactionId, rating, reviewText });
            return;
        }

        console.log('🌐 Sending review to:', `${API_BASE}/reviews`);
        
        const response = await fetch(`${API_BASE}/reviews`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                reviewType,
                transactionId,
                rating: parseInt(rating),
                review: reviewText
            })
        });

        console.log('📡 Response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ Server error:', errorData);
            throw new Error(errorData.message || 'Failed to create review');
        }

        const data = await response.json();
        console.log('✅ Review created:', data);
        showSuccess('Review created successfully');
        
        // Reset form
        document.getElementById('createReviewForm').reset();
        currentRating = 0;
        document.querySelectorAll('.rating-star').forEach(star => {
            star.classList.remove('text-yellow-400');
            star.classList.add('text-gray-300');
        });
        
        // Reload my reviews
        await loadMyReviews();
    } catch (error) {
        console.error('❌ Error creating review:', error);
        showError(error.message || 'Failed to create review');
    }
}

// Open response modal
function openResponseModal(reviewId) {
    currentReviewId = reviewId;
    document.getElementById('responseModal').classList.remove('hidden');
    
    // Load review details
    loadReviewDetails(reviewId);
}

// Close response modal
function closeResponseModal() {
    document.getElementById('responseModal').classList.add('hidden');
    currentReviewId = null;
    document.getElementById('responseText').value = '';
}

// Load review details for response
async function loadReviewDetails(reviewId) {
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE}/reviews/${reviewId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load review details');
        }

        const review = await response.json();
        const container = document.getElementById('reviewToRespond');
        container.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <div>
                    <p class="font-medium text-gray-900">${review.reviewer.fullName}</p>
                    <p class="text-sm text-gray-500">${new Date(review.createdAt).toLocaleDateString()}</p>
                </div>
                <div class="flex items-center">
                    ${generateStars(review.rating)}
                </div>
            </div>
            <p class="text-gray-700">${review.review}</p>
        `;
    } catch (error) {
        console.error('Error loading review details:', error);
        showError('Failed to load review details');
    }
}

// Submit response to review
async function submitResponse() {
    console.log('💬 Submitting review response...');
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showError('Please log in to submit a response');
            return;
        }

        if (!currentReviewId) {
            showError('No review selected for response');
            return;
        }

        const responseText = document.getElementById('responseText').value;
        console.log('💬 Response data:', { currentReviewId, responseText });

        if (!responseText) {
            showError('Please enter a response');
            return;
        }

        console.log('🌐 Sending response to:', `${API_BASE}/reviews/${currentReviewId}/respond`);
        
        const response = await fetch(`${API_BASE}/reviews/${currentReviewId}/respond`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                response: responseText
            })
        });

        console.log('📡 Response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ Server error:', errorData);
            throw new Error(errorData.message || 'Failed to submit response');
        }

        const data = await response.json();
        console.log('✅ Response submitted:', data);
        showSuccess('Response submitted successfully');
        closeResponseModal();
        await loadReviewsAboutMe(); // Reload reviews about me
    } catch (error) {
        console.error('❌ Error submitting response:', error);
        showError(error.message || 'Failed to submit response');
    }
}

// Edit review
function editReview(reviewId) {
    // This would open an edit modal or navigate to edit page
    // For now, we'll show a message
    alert('Edit functionality would be implemented here');
}

// Delete review
async function deleteReview(reviewId) {
    if (!confirm('Are you sure you want to delete this review?')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE}/reviews/${reviewId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete review');
        }

        showSuccess('Review deleted successfully');
        loadMyReviews(); // Reload my reviews
    } catch (error) {
        console.error('Error deleting review:', error);
        showError('Failed to delete review');
    }
}

// Tab management
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Remove active state from all tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('border-blue-500', 'text-blue-600');
        button.classList.add('border-transparent', 'text-gray-500');
    });
    
    // Show selected tab
    document.getElementById(tabName).classList.remove('hidden');
    
    // Add active state to clicked button
    event.target.classList.remove('border-transparent', 'text-gray-500');
    event.target.classList.add('border-blue-500', 'text-blue-600');
    
    // Load tab-specific data
    if (tabName === 'my-reviews') {
        loadMyReviews();
    } else if (tabName === 'reviews-about-me') {
        loadReviewsAboutMe();
    } else if (tabName === 'create-review') {
        loadTransactionsForReview();
    }
}

// Show error message
function showError(message) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Show success message
function showSuccess(message) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}


// Redundant logout() function removed - handled globally by unified-header-fixed.js


// Initialize reviews page
// API_BASE is provided by config.js

document.addEventListener('DOMContentLoaded', async () => {
    // Load initial tab
    loadMyReviews();
    
    // Add event listener for review type change
    document.getElementById('reviewType')?.addEventListener('change', loadTransactionsForReview);
});
