// Seller Verification JavaScript
// API_BASE is provided by config.js

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    // DOM elements
    const studentStatus = document.getElementById('student-status');
    const sellerStatus = document.getElementById('seller-status');
    const paymentStatus = document.getElementById('payment-status');
    const actionButtons = document.getElementById('action-buttons');
    const step1Circle = document.getElementById('step1-circle');
    const step2Circle = document.getElementById('step2-circle');
    const step3Circle = document.getElementById('step3-circle');

    // Load user data
    let userData;
    try {
        const response = await fetch(`${API_BASE}/user/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load user data');
        }

        userData = await response.json();
        updateUI();
    } catch (error) {
        console.error('Error loading user data:', error);
        showMessage('Error loading user data. Please refresh the page.', true);
    }

    function updateUI() {
        // Update user greeting
        const userGreeting = document.getElementById('user-greeting');
        if (userGreeting) {
            userGreeting.textContent = `Hello, ${userData.fullName}`;
        }

        // Update student verification status
        if (userData.isStudentVerified) {
            studentStatus.innerHTML = '<span class="text-green-600">✓ Verified</span>';
            step1Circle.className = 'w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold';
            step1Circle.innerHTML = '✓';
        } else {
            studentStatus.innerHTML = '<span class="text-red-600">✗ Not Verified</span>';
            step1Circle.className = 'w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white font-bold';
            step1Circle.innerHTML = '!';
        }

        // Update seller role status
        if (userData.isSeller) {
            sellerStatus.innerHTML = '<span class="text-green-600">✓ Active</span>';
            step2Circle.className = 'w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold';
            step2Circle.innerHTML = '✓';
        } else {
            sellerStatus.innerHTML = '<span class="text-gray-600">Not Active</span>';
            step2Circle.className = 'w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-bold';
            step2Circle.innerHTML = '2';
        }

        // Update payment status
        if (userData.sellerVerified) {
            paymentStatus.innerHTML = '<span class="text-green-600">✓ Paid</span>';
            step3Circle.className = 'w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold';
            step3Circle.innerHTML = '✓';
        } else {
            paymentStatus.innerHTML = '<span class="text-gray-600">Pending</span>';
            step3Circle.className = 'w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-bold';
            step3Circle.innerHTML = '3';
        }

        // Update action buttons
        updateActionButtons();
    }

    function updateActionButtons() {
        actionButtons.innerHTML = '';

        if (!userData.isStudentVerified) {
            actionButtons.innerHTML = `
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 class="font-semibold text-yellow-800 mb-2">Student Verification Required</h3>
                    <p class="text-sm text-yellow-700 mb-4">You must verify your student status before becoming a seller. Check your student email for the verification link.</p>
                    <button onclick="resendVerification()" class="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 transition-colors">
                        Resend Verification Email
                    </button>
                </div>
            `;
        } else if (userData.sellerApplicationStatus === 'Pending') {
            // Application submitted, waiting for admin approval
            actionButtons.innerHTML = `
                <div class="bg-indigo-50 border border-indigo-100 rounded-2xl p-8 text-center shadow-sm">
                    <div class="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full mb-4 animate-pulse">
                        <i class="fas fa-clock text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-indigo-900 mb-2">Application Under Review</h3>
                    <p class="text-indigo-700 mb-6 max-w-md mx-auto">
                        We've received your application to become a seller! Our team is currently reviewing your details to ensure a safe marketplace for everyone.
                    </p>
                    <div class="flex items-center justify-center space-x-2 text-sm text-indigo-500 font-medium">
                        <span class="flex h-2 w-2 rounded-full bg-indigo-500"></span>
                        <span>Estimated review time: 24-48 hours</span>
                    </div>
                </div>
            `;
        } else if (!userData.isSeller) {
            actionButtons.innerHTML = `
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 class="font-semibold text-blue-800 mb-2">Ready to Start Selling?</h3>
                    <p class="text-sm text-blue-700 mb-4">Activate your seller role to start listing items on Virtuosa.</p>
                    <button onclick="becomeSeller()" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold">
                        Activate Seller Role
                    </button>
                </div>
            `;
        } else if (!userData.sellerVerified) {
            actionButtons.innerHTML = `
                <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 class="font-semibold text-green-800 mb-2">Complete Seller Verification</h3>
                    <p class="text-sm text-green-700 mb-4">Pay the one-time K30 verification fee to unlock all seller features.</p>
                    <div class="bg-white rounded-lg p-4 mb-4">
                        <h4 class="font-semibold mb-2">Payment Details</h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span>Verification Fee:</span>
                                <span class="font-semibold">K30</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Payment Method:</span>
                                <select id="payment-method" class="border rounded px-2 py-1">
                                    <option value="Mobile Money">Mobile Money</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                </select>
                            </div>
                            <div class="flex justify-between">
                                <span>Reference:</span>
                                <input type="text" id="payment-reference" placeholder="Transaction ID" class="border rounded px-2 py-1 w-32">
                            </div>
                        </div>
                    </div>
                    <button onclick="payVerificationFee()" class="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold">
                        Pay K30 Verification Fee
                    </button>
                </div>
            `;
        } else {
            actionButtons.innerHTML = `
                <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 class="font-semibold text-green-800 mb-2">🎉 Congratulations!</h3>
                    <p class="text-sm text-green-700 mb-4">You're now a verified seller on Virtuosa. Start listing your items and reach thousands of student buyers.</p>
                    <div class="flex space-x-4">
                        <a href="/seller" class="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold">
                            Go to Seller Dashboard
                        </a>
                        <a href="/profile" class="bg-navy text-white px-6 py-3 rounded-lg hover:bg-navy transition-colors font-semibold">
                            Update Profile
                        </a>
                    </div>
                </div>
            `;
        }
    }

    window.resendVerification = async () => {
        try {
            const response = await fetch(`${API_BASE}/auth/resend-verification`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                showMessage('Verification email sent successfully!');
            } else {
                const data = await response.json();
                showMessage(data.message || 'Failed to send verification email', true);
            }
        } catch (error) {
            console.error('Error resending verification:', error);
            showMessage('Error sending verification email', true);
        }
    };

    window.becomeSeller = async () => {
        try {
            const response = await fetch(`${API_BASE}/user/become-seller`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                // Server sets sellerApplicationStatus='Pending' but NOT isSeller=true.
                // Update local state to reflect the pending status correctly.
                userData.sellerApplicationStatus = 'Pending';
                updateUI();
                showMessage('Seller application submitted! You will be notified when it is approved.');
            } else {
                const data = await response.json();
                showMessage(data.message || 'Failed to submit seller application', true);
            }
        } catch (error) {
            console.error('Error becoming seller:', error);
            showMessage('Error submitting seller application', true);
        }
    };

    window.payVerificationFee = async () => {
        const paymentMethod = document.getElementById('payment-method').value;
        const paymentReference = document.getElementById('payment-reference').value;

        if (!paymentReference) {
            showMessage('Please enter payment reference', true);
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/seller/verify-payment`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ paymentMethod, paymentReference })
            });

            if (response.ok) {
                userData.sellerVerified = true;
                userData.sellerVerificationPaid = true;
                userData.sellerVerificationDate = new Date();
                updateUI();
                showMessage('Verification completed successfully! You are now a verified seller.');
            } else {
                const data = await response.json();
                showMessage(data.message || 'Failed to process verification payment', true);
            }
        } catch (error) {
            console.error('Error processing payment:', error);
            showMessage('Error processing verification payment', true);
        }
    };

    function showMessage(message, isError = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${isError ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
            }`;
        messageDiv.textContent = message;
        document.body.appendChild(messageDiv);

        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }
});
