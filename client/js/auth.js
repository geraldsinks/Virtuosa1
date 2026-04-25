// Use global API_BASE from config.js
// Prevent duplicate declarations
if (typeof window.BASE_API_URL === 'undefined') {
    window.BASE_API_URL = `${API_BASE}/auth`;
}

// Toast Notification System (shared with cart.js)
if (typeof window.toastStyles === 'undefined') {
    window.toastStyles = `
#toast-container {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 9999;
    pointer-events: none;
}

.toast {
    background: rgba(0, 0, 0, 0.95);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    padding: 1rem;
    margin-bottom: 0.5rem;
    min-width: 300px;
    max-width: 400px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    gap: 0.75rem;
    transform: translateX(100%);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-content {
    display: flex;
    align-items: center;
    flex: 1;
    gap: 0.75rem;
}

.toast-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
}

.toast-message {
    color: white;
    font-size: 0.875rem;
    font-weight: 500;
    flex: 1;
    line-height: 1.4;
}

.toast-close {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 50%;
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    color: rgba(255, 255, 255, 0.7);
    flex-shrink: 0;
}

.toast-close:hover {
    background: rgba(255, 255, 255, 0.2);
    color: white;
}

/* Animations */
.toast-enter {
    opacity: 0;
    transform: translateX(100%) scale(0.8);
}

.toast-show {
    opacity: 1;
    transform: translateX(0) scale(1);
}

.toast-leave {
    opacity: 0;
    transform: translateX(100%) scale(0.9);
}

/* Type-specific colors */
.toast.success {
    border-left: 4px solid #10b981;
}

.toast.error {
    border-left: 4px solid #ef4444;
}

.toast.info {
    border-left: 4px solid #3b82f6;
}
`;
};

// Inject toast styles once
if (!document.getElementById('toast-notification-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'toast-notification-styles';
    styleSheet.textContent = toastStyles;
    document.head.appendChild(styleSheet);
}

/**
 * Show a modern toast notification with improved timing and user experience
 * @param {string} message 
 * @param {string} type - 'success', 'error', 'info'
 * @param {number} duration - Optional custom duration in milliseconds
 */
function showToast(message, type = 'success', duration = 5000) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed top-4 right-4 z-50 pointer-events-none';
        document.body.appendChild(container);
    }

    // Remove any existing toasts to prevent stacking
    const existingToasts = container.querySelectorAll('.toast');
    existingToasts.forEach(toast => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    });

    const toast = document.createElement('div');
    toast.className = `toast ${type} toast-enter`;
    
    // Choose icon based on type
    let icon = 'fa-check-circle';
    let iconColor = 'text-green-400';
    if (type === 'error') {
        icon = 'fa-exclamation-triangle';
        iconColor = 'text-red-400';
    } else if (type === 'info') {
        icon = 'fa-info-circle';
        iconColor = 'text-blue-400';
    }
    
    toast.innerHTML = `
        <div class="toast-content">
            <div class="toast-icon ${iconColor}">
                <i class="fas ${icon}"></i>
            </div>
            <div class="toast-message">${message}</div>
            <div class="toast-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </div>
        </div>
    `;

    container.appendChild(toast);

    // Trigger entrance animation
    requestAnimationFrame(() => {
        toast.classList.remove('toast-enter');
        toast.classList.add('toast-show');
    });

    // Auto-remove after specified duration with smooth exit
    setTimeout(() => {
        toast.classList.add('toast-leave');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300); // Wait for exit animation
    }, duration);
}

function showMessage(message, isError = false) {
    showToast(message, isError ? 'error' : 'success', 5000);
}

function togglePassword(inputId, toggleId) {
    const input = document.getElementById(inputId);
    // Try provided toggleId, or fallback to inputId + '-toggle'
    const toggle = document.getElementById(toggleId) || document.getElementById(inputId + '-toggle');
    
    if (input && toggle) {
        if (input.type === 'password') {
            input.type = 'text';
            toggle.classList.remove('fa-eye');
            toggle.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            toggle.classList.remove('fa-eye-slash');
            toggle.classList.add('fa-eye');
        }
    }
}

// Make togglePassword globally available
window.togglePassword = togglePassword;

function registerPageReady(callback) {
    if (typeof callback !== 'function') {
        return;
    }

    if (typeof window.onPageReady === 'function') {
        window.onPageReady(callback);
        return;
    }

    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        Promise.resolve().then(callback);
    } else {
        document.addEventListener('DOMContentLoaded', callback, { once: true });
    }
}

// Phone number formatting function
function formatPhoneNumber(input) {
    // Remove all non-digit characters
    let value = input.value.replace(/\D/g, '');
    
    // Limit to 9 digits
    if (value.length > 9) {
        value = value.slice(0, 9);
    }
    
    // Format as XXX XXX XXX
    if (value.length > 6) {
        value = value.slice(0, 3) + ' ' + value.slice(3, 6) + ' ' + value.slice(6);
    } else if (value.length > 3) {
        value = value.slice(0, 3) + ' ' + value.slice(3);
    }
    
    input.value = value;
}

// Add phone number formatting event listener when page is ready
registerPageReady(function() {
    const phoneInput = document.getElementById('signup-phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function() {
            formatPhoneNumber(this);
        });
        
        // Prevent pasting non-numeric characters
        phoneInput.addEventListener('paste', function(e) {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text');
            const numericData = pastedData.replace(/\D/g, '').slice(0, 9);
            
            // Format the pasted data
            let formattedValue = numericData;
            if (numericData.length > 6) {
                formattedValue = numericData.slice(0, 3) + ' ' + numericData.slice(3, 6) + ' ' + numericData.slice(6);
            } else if (numericData.length > 3) {
                formattedValue = numericData.slice(0, 3) + ' ' + numericData.slice(3);
            }
            
            this.value = formattedValue;
        });
    }
});

// Student email auto-fill functionality
function setupStudentEmailAutoFill() {
    const universitySelect = document.getElementById('signup-university');
    const emailInput = document.getElementById('signup-email');
    const studentEmailInput = document.getElementById('signup-student-email');
    const indicator = document.getElementById('student-email-indicator');
    
    if (!universitySelect || !emailInput || !studentEmailInput || !indicator) return;
    
    function updateStudentEmail() {
        const university = universitySelect.value;
        const email = emailInput.value;
        
        if (university && email) {
            // Extract the username part (before @) from the regular email
            const emailUsername = email.split('@')[0];
            
            if (emailUsername) {
                let domain = '';
                
                // Set domain based on university selection
                if (university === 'University of Zambia') {
                    domain = 'unza.zm';
                } else if (university === 'Copperbelt University') {
                    domain = 'cbu.ac.zm';
                }
                
                if (domain) {
                    // Auto-fill the student email
                    studentEmailInput.value = `${emailUsername}@${domain}`;
                    
                    // Show the green indicator
                    indicator.classList.remove('hidden');
                    
                    // Add visual feedback - briefly highlight the field
                    studentEmailInput.style.borderColor = '#10b981';
                    studentEmailInput.style.backgroundColor = '#f0fdf4';
                    
                    setTimeout(() => {
                        studentEmailInput.style.borderColor = '';
                        studentEmailInput.style.backgroundColor = '';
                    }, 1500);
                } else {
                    // Hide indicator for "Other" university
                    indicator.classList.add('hidden');
                }
            }
        } else {
            // Clear student email and hide indicator if inputs are empty
            if (!email) {
                studentEmailInput.value = '';
                indicator.classList.add('hidden');
            }
        }
    }
    
    // Add event listeners
    universitySelect.addEventListener('change', updateStudentEmail);
    emailInput.addEventListener('input', updateStudentEmail);
    
    // Also update when student email is manually changed (to hide indicator)
    studentEmailInput.addEventListener('input', function() {
        // If user manually changes the student email, hide the auto-fill indicator
        const expectedEmail = getExpectedStudentEmail();
        if (this.value !== expectedEmail) {
            indicator.classList.add('hidden');
        }
    });
}

function getExpectedStudentEmail() {
    const universitySelect = document.getElementById('signup-university');
    const emailInput = document.getElementById('signup-email');
    
    if (!universitySelect || !emailInput) return '';
    
    const university = universitySelect.value;
    const email = emailInput.value;
    const emailUsername = email.split('@')[0];
    
    if (!university || !emailUsername) return '';
    
    let domain = '';
    if (university === 'University of Zambia') {
        domain = 'unza.zm';
    } else if (university === 'Copperbelt University') {
        domain = 'cbu.ac.zm';
    }
    
    return domain ? `${emailUsername}@${domain}` : '';
}

async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email')?.value?.trim();
    const password = document.getElementById('login-password-input')?.value?.trim();

    if (!email || !password) {
        showMessage('Please fill in both email and password.', true);
        return;
    }

    // Show loading state
    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalContent = submitButton.innerHTML;
    submitButton.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Signing in...`;
    submitButton.disabled = true;

    try {
        const requestData = { email, password };
        console.log('🔍 CLIENT DEBUG - Sending login request:', {
            url: `${BASE_API_URL}/login`,
            email: email,
            emailChars: Array.from(email).map(c => `${c}(${c.charCodeAt(0)})`),
            password: password ? '[REDACTED]' : 'undefined',
            requestData: requestData
        });
        
        const response = await fetch(`${BASE_API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });

        const result = await response.json();
        
        console.log('🔍 CLIENT DEBUG - Server response:', {
            status: response.status,
            ok: response.ok,
            result: result
        });

        if (response.ok) {
            showMessage('Login successful! Redirecting...');
            
            // Core Identity Storage
            localStorage.setItem('token', result.token);
            localStorage.setItem('userId', result.user._id);
            localStorage.setItem('userEmail', result.user.email);
            localStorage.setItem('userFullName', result.user.fullName);
            
            // Store complete user data for role system
            localStorage.setItem('user', JSON.stringify(result.user));
            
            console.log('🔍 LOGIN DEBUG - Server response with role data:', result.user);
            
            // Use effectiveRole from login response if available
            if (result.user.effectiveRole) {
                console.log('🔍 Using effectiveRole from login response:', result.user.effectiveRole);
                
                const specializedAdminRoles = ['virtuosa_management', 'marketing_lead', 'support_lead', 'products_lead', 'transaction_safety_lead', 'strategy_growth_lead', 'entry_level'];
                const isSpecializedAdmin = specializedAdminRoles.includes(result.user.effectiveRole);
                
                const roleData = {
                    effectiveRole: result.user.effectiveRole,
                    roleInfo: {
                        effectiveRole: result.user.effectiveRole,
                        title: result.user.effectiveRole === 'admin' ? 'Admin' : 
                               result.user.effectiveRole === 'CEO' ? 'CEO' :
                               isSpecializedAdmin ? 'Admin Lead' :
                               result.user.effectiveRole === 'seller' ? 'Seller' : 'Buyer',
                        level: (result.user.effectiveRole === 'admin' || result.user.effectiveRole === 'CEO') ? 3 : 
                               isSpecializedAdmin ? 2.5 :
                               result.user.effectiveRole === 'seller' ? 2 : 1,
                        isBuyer: true,
                        isSeller: result.user.effectiveRole === 'seller' || result.user.effectiveRole === 'admin' || result.user.effectiveRole === 'CEO' || isSpecializedAdmin,
                        isAdmin: result.user.effectiveRole === 'admin' || result.user.effectiveRole === 'CEO' || isSpecializedAdmin
                    },
                    timestamp: Date.now()
                };
                
                localStorage.setItem('userRoleData', JSON.stringify(roleData));
                
                // Also store basic user data for generic components
                localStorage.setItem('userEmail', result.user.email);
                localStorage.setItem('userFullName', result.user.fullName);
                localStorage.setItem('userId', result.user._id || result.user.id);
                localStorage.setItem('user', JSON.stringify(result.user));

                // Clear legacy keys to prevent staleness
                localStorage.removeItem('isAdmin');
                localStorage.removeItem('isSeller');
                localStorage.removeItem('isBuyer');
            } else {
                // Fallback: fetch full profile for role detection
                try {
                    const profileResponse = await fetch(`${API_BASE}/user/profile`, {
                        headers: { 'Authorization': `Bearer ${result.token}` }
                    });
                    
                    if (profileResponse.ok) {
                        const fullUserData = await profileResponse.json();
                        console.log('🔍 LOGIN DEBUG - Full user profile:', fullUserData);
                        
                        // Use the full user data for role detection
                        const isAdmin = (fullUserData.isAdmin === true || fullUserData.isAdmin === 'true');
                        const isSeller = fullUserData.isSeller === true || fullUserData.isSeller === 'true';
                        
                        console.log('🔍 LOGIN DEBUG - Role detection:', {
                            isAdmin: isAdmin,
                            isSeller: isSeller,
                            userIsAdmin: fullUserData.isAdmin,
                            userEmail: fullUserData.email,
                            userRole: fullUserData.role
                        });
                        
                        // Consolidate role data storage for fallback
                        const effectiveRole = isAdmin ? 'admin' : isSeller ? 'seller' : 'buyer';
                        const roleData = {
                            effectiveRole: effectiveRole,
                            roleInfo: {
                                effectiveRole: effectiveRole,
                                title: effectiveRole === 'admin' ? 'Admin' : 
                                       effectiveRole === 'seller' ? 'Seller' : 'Buyer',
                                level: effectiveRole === 'admin' ? 3 : 
                                       effectiveRole === 'seller' ? 2 : 1,
                                isBuyer: true,
                                isSeller: effectiveRole === 'seller' || effectiveRole === 'admin',
                                isAdmin: effectiveRole === 'admin'
                            },
                            timestamp: Date.now()
                        };
                        
                        localStorage.setItem('userRoleData', JSON.stringify(roleData));
                        
                        // Clear legacy keys to prevent staleness
                        localStorage.removeItem('isAdmin');
                        localStorage.removeItem('isSeller');
                        localStorage.removeItem('isBuyer');
                    } else {
                        console.warn('Could not fetch user profile:', profileResponse);
                        // Fallback: store default consolidated role data
                        const defaultRoleData = {
                            effectiveRole: 'buyer',
                            roleInfo: {
                                effectiveRole: 'buyer',
                                title: 'Buyer',
                                level: 1,
                                isBuyer: true,
                                isSeller: false,
                                isAdmin: false
                            },
                            timestamp: Date.now()
                        };
                        localStorage.setItem('userRoleData', JSON.stringify(defaultRoleData));
                        
                        // Clear legacy keys to prevent staleness
                        localStorage.removeItem('isAdmin');
                        localStorage.removeItem('isSeller');
                        localStorage.removeItem('isBuyer');
                    }
                } catch (profileError) {
                    console.warn('Could not fetch user profile:', profileError);
                    // Fallback: store default consolidated role data
                    const defaultRoleData = {
                        effectiveRole: 'buyer',
                        roleInfo: {
                            effectiveRole: 'buyer',
                            title: 'Buyer',
                            level: 1,
                            isBuyer: true,
                            isSeller: false,
                            isAdmin: false
                        },
                        timestamp: Date.now()
                    };
                    localStorage.setItem('userRoleData', JSON.stringify(defaultRoleData));
                    
                    // Clear legacy keys to prevent staleness
                    localStorage.removeItem('isAdmin');
                    localStorage.removeItem('isSeller');
                    localStorage.removeItem('isBuyer');
                }
            }
            
            // Sync cart from localStorage to backend after login
            await syncCartToBackend();
            
            // Sync wishlist from localStorage to backend after login
            if (window.wishlistManager) {
                try {
                    await window.wishlistManager.syncOnLogin();
                } catch (e) {
                    console.warn('Failed to sync wishlist:', e);
                }
            }
            
            // Redirect using the new role hierarchy system
            setTimeout(() => {
                // Use consolidated role data
                const roleDataStr = localStorage.getItem('userRoleData');
                let effectiveRole = null;
                
                if (roleDataStr) {
                    try {
                        const roleData = JSON.parse(roleDataStr);
                        effectiveRole = roleData.effectiveRole;
                    } catch (e) {
                        console.warn('Failed to parse role data, using fallback');
                    }
                }
                
                // Fallback to legacy checks if needed
                const finalIsAdmin = localStorage.getItem('isAdmin') === 'true';
                const finalIsSeller = localStorage.getItem('isSeller') === 'true';
                
                console.log('🔍 LOGIN REDIRECT - Role data:', {
                    effectiveRole,
                    finalIsAdmin,
                    finalIsSeller
                });
                
                const specializedAdminRoles = ['virtuosa_management', 'marketing_lead', 'support_lead', 'products_lead', 'transaction_safety_lead', 'strategy_growth_lead', 'entry_level'];
                const isSpecializedAdmin = specializedAdminRoles.includes(effectiveRole);
                
                if (effectiveRole === 'admin' || effectiveRole === 'CEO' || isSpecializedAdmin || finalIsAdmin) {
                    window.location.href = '/admin';
                } else if (effectiveRole === 'seller' || finalIsSeller) {
                    window.location.href = '/seller-dashboard';
                } else {
                    // Default to buyer dashboard for all users (buyers, sellers, admins can all access it)
                    window.location.href = '/dashboard';
                }
            }, 1500);
        } else {
            // Handle specific error for email verification
            if (result.requiresEmailVerification) {
                renderVerificationRequiredPanel(email);
            } else {
                showMessage(result.message || 'Login failed', true);
            }
        }
    } catch (error) {
        console.error('Error during login:', error);
        showMessage('An error occurred during login. Please try again later.', true);
    } finally {
        if (submitButton) {
            submitButton.innerHTML = originalContent;
            submitButton.disabled = false;
        }
    }
}

async function resendVerificationEmail(email, button = null) {
    let originalText = '';
    if (button) {
        originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Sending...';
        button.disabled = true;
    }

    try {
        const response = await fetch(`${BASE_API_URL}/resend-verification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const result = await response.json();
        
        if (response.ok) {
            showMessage('Verification email sent! Please check your inbox.');
            if (button) {
                button.innerHTML = '<i class="fas fa-check mr-2"></i> Sent!';
                button.classList.replace('bg-gold', 'bg-green-500');
                setTimeout(() => {
                    button.innerHTML = originalText;
                    button.classList.replace('bg-green-500', 'bg-gold');
                    button.disabled = false;
                }, 3000);
            }
        } else {
            showMessage(result.message || 'Failed to send verification email', true);
            if (button) {
                button.innerHTML = originalText;
                button.disabled = false;
            }
        }
    } catch (error) {
        console.error('Resend verification error:', error);
        showMessage('Failed to send verification email. Please try again.', true);
        if (button) {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }
}

function renderVerificationRequiredPanel(email) {
    const container = document.getElementById('auth-container');
    if (!container) return;

    // Use a premium, centered design
    container.innerHTML = `
        <div class="animate-fadeIn">
            <div class="text-center mb-6">
                <div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-yellow-200">
                    <i class="fas fa-envelope-open-text text-yellow-600 text-2xl"></i>
                </div>
                <h2 class="text-2xl font-bold text-gray-800 mb-2">Verification Required</h2>
                <p class="text-gray-600 text-sm">To ensure your security, please verify your email before logging in.</p>
            </div>
            
            <div class="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
                <p class="text-blue-800 text-sm font-medium mb-1">We sent a link to:</p>
                <p class="text-blue-900 font-bold break-all">${email}</p>
            </div>

            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-3">
                    <a href="https://mail.google.com" target="_blank" class="flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-semibold text-gray-700 text-sm shadow-sm">
                        <img src="https://www.google.com/favicon.ico" class="w-4 h-4" alt="Gmail">
                        Gmail
                    </a>
                    <a href="https://outlook.live.com" target="_blank" class="flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-semibold text-gray-700 text-sm shadow-sm">
                        <img src="https://outlook.live.com/favicon.ico" class="w-4 h-4" alt="Outlook">
                        Outlook
                    </a>
                </div>

                <button onclick="resendVerificationEmail('${email}', this)" class="w-full py-3 bg-gold hover:bg-yellow-500 text-navy font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 uppercase tracking-wide text-sm">
                    <i class="fas fa-paper-plane"></i>
                    Resend Verification Link
                </button>

                <button onclick="location.reload()" class="w-full py-2 text-gray-500 hover:text-navy text-sm font-medium transition-colors">
                    Back to Login
                </button>
            </div>
        </div>
    `;
}

async function handleSignup(event) {
    event.preventDefault();
    const fullName = document.getElementById('signup-fullName')?.value;
    const email = document.getElementById('signup-email')?.value;
    const university = document.getElementById('signup-university')?.value;
    let phoneNumber = document.getElementById('signup-phone')?.value;
    const studentEmail = document.getElementById('signup-student-email')?.value;
    const password = document.getElementById('signup-password')?.value;
    const confirmPassword = document.getElementById('signup-confirm-password')?.value;
    const gender = document.getElementById('signup-gender')?.value;
    const agreedToTerms = document.getElementById('signup-agreedToTerms')?.checked;

    if (!fullName || !email || !university || !phoneNumber || !studentEmail || !password || !confirmPassword || !gender) {
        showMessage('Please fill in all fields.', true);
        return;
    }
    
    // Phone number already includes +260 prefix from the HTML, just use the value as is
    // Remove any spaces from the phone number and add +260 prefix
    phoneNumber = '+260' + phoneNumber.replace(/\s/g, '');
    
    if (password !== confirmPassword) {
        showMessage('Passwords do not match.', true);
        return;
    }
    if (password.length < 6) {
        showMessage('Password must be at least 6 characters long.', true);
        return;
    }
    if (!agreedToTerms) {
        showMessage('You must agree to the terms and conditions.', true);
        return;
    }

    // Show loading state
    const submitButton = document.querySelector('#signup-form button[type="submit"]');
    const originalContent = submitButton.innerHTML;
    submitButton.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Creating Account...`;
    submitButton.disabled = true;

    try {
        console.log('Attempting signup with:', { fullName, email, university, phoneNumber, studentEmail });
        console.log('API URL:', `${BASE_API_URL}/signup`);

        const response = await fetch(`${BASE_API_URL}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName, email, password, university, phoneNumber, studentEmail, gender, agreedToTerms })
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);

        const result = await response.json();
        console.log('Response data:', result);

        if (response.ok) {
            if (result.emailVerificationFailed) {
                showMessage('Account created but email verification failed. Please contact support at virtuosa@gmail.com or try logging in and requesting a new verification email.', true);
                setTimeout(() => {
                    window.location.href = `/pages/verify-email.html?email=${encodeURIComponent(email)}&status=waiting`;
                }, 3000);
            } else {
                showMessage('Account created successfully! Redirecting to verification status...');
                setTimeout(() => {
                    window.location.href = `/pages/verify-email.html?email=${encodeURIComponent(email)}&status=waiting`;
                }, 1500);
            }
        } else {
            // Handle specific error cases
            if (result.message === 'Email already exists') {
                showMessage('An account with this email already exists. Please use a different email or try logging in.', true);
            } else if (result.message === 'All fields are required') {
                showMessage('Please fill in all required fields.', true);
            } else if (result.message === 'Invalid student email domain') {
                showMessage('Please use a valid student email address (e.g., student@unza.zm).', true);
            } else {
                showMessage(result.message || 'Signup failed. Please try again.', true);
            }
        }
    } catch (error) {
        console.error('Error during signup:', error);
        
        // Check if it's a network error
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            showMessage('Unable to connect to the server. Please check your internet connection and try again.', true);
        } else {
            showMessage('An error occurred during signup: ' + error.message, true);
        }
    } finally {
        // Restore button state
        if (submitButton) {
            submitButton.innerHTML = originalContent;
            submitButton.disabled = false;
        }
    }
}

async function handleForgotPassword(event) {
    event.preventDefault();
    const email = document.getElementById('forgot-email')?.value;

    if (!email) {
        showMessage('Please enter your email address.', true);
        return;
    }

    // Show loading state
    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalContent = submitButton.innerHTML;
    submitButton.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Sending link...`;
    submitButton.disabled = true;

    try {
        const response = await fetch(`${BASE_API_URL}/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const result = await response.json();

        if (response.ok) {
            showMessage('Password reset email sent. Check your inbox.');
            setTimeout(() => {
                renderAuthComponent('login');
            }, 2000);
        } else {
            showMessage(result.message || 'Failed to send reset email.', true);
        }
    } catch (error) {
        console.error('Error during reset request:', error);
        showMessage('An error occurred.', true);
    } finally {
        if (submitButton) {
            submitButton.innerHTML = originalContent;
            submitButton.disabled = false;
        }
    }
}

async function handleResetPassword(event) {
    event.preventDefault();
    const token = new URLSearchParams(window.location.search).get('token');
    const password = document.getElementById('reset-password')?.value;
    const confirmPassword = document.getElementById('reset-confirm-password')?.value;

    if (!password || !confirmPassword) {
        showMessage('Please fill in both password fields.', true);
        return;
    }
    if (password !== confirmPassword) {
        showMessage('Passwords do not match.', true);
        return;
    }

    // Show loading state
    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalContent = submitButton.innerHTML;
    submitButton.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Resetting...`;
    submitButton.disabled = true;

    try {
        const response = await fetch(`${BASE_API_URL}/reset-password/${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        const result = await response.json();

        if (response.ok) {
            showMessage('Password reset successfully! Redirecting to login...');
            setTimeout(() => {
                window.location.href = '/login';
            }, 1500);
        } else {
            showMessage(result.message || 'Failed to reset password.', true);
        }
    } catch (error) {
        console.error('Error during reset:', error);
        showMessage('An error occurred.', true);
    } finally {
        if (submitButton) {
            submitButton.innerHTML = originalContent;
            submitButton.disabled = false;
        }
    }
}

function renderAuthComponent(type) {
    const authContainer = document.getElementById('auth-container');
    if (!authContainer) return;

    const loginFormHtml = `
        <div class="login-form-wrapper">
            <form id="login-form" class="space-y-6">
                <div>
                    <label for="login-email" class="form-label block text-sm">Email Address</label>
                    <input type="email" id="login-email" name="email" required 
                        class="auth-input block w-full px-4 py-3 rounded-lg text-sm bg-gray-50 placeholder-gray-400" 
                        placeholder="Enter your email">
                </div>
                <div>
                    <label for="login-password-input" class="form-label block text-sm">Password</label>
                    <div class="relative">
                        <input type="password" id="login-password-input" name="password" required 
                            class="auth-input block w-full px-4 py-3 rounded-lg text-sm bg-gray-50 placeholder-gray-400 pr-12" 
                            placeholder="Enter your password">
                        <span class="password-toggle" onclick="togglePassword('login-password-input', 'login-password-toggle')">
                            <i class="fas fa-eye" id="login-password-toggle"></i>
                        </span>
                    </div>
                    <a href="#" id="forgot-password-link" class="block text-right text-sm text-navy hover:text-gold transition-colors duration-200 mt-2">Forgot Password?</a>
                </div>
                <button type="submit" class="auth-button w-full flex justify-center py-3 px-4 rounded-full text-sm font-bold text-navy transition-all duration-300">
                    Log In
                </button>
                <p class="text-center text-sm mt-6 text-gray-600">
                    Don't have an account? 
                    <a href="#" id="switch-to-signup" class="font-bold text-navy hover:text-gold transition-colors duration-200">Sign Up</a>
                </p>
            </form>
        </div>
    `;

    const signupFormHtml = `
        <div id="signup-form-wrapper" class="form-container p-8 rounded-2xl w-full max-w-md mx-auto text-gray-800">
            <div class="text-center mb-6">
                <h2 class="text-4xl font-bold text-navy">Join Virtuosa</h2>
            </div>
            <form id="signup-form" class="space-y-6">
                <div>
                    <label for="signup-fullName" class="form-label block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input type="text" id="signup-fullName" name="fullName" required class="auth-input block w-full px-4 py-2 rounded-lg text-sm bg-gray-50 placeholder-gray-400" placeholder="Enter your full name">
                </div>
                <div>
                    <label for="signup-university" class="form-label block text-sm font-medium text-gray-700 mb-1">University</label>
                    <select id="signup-university" name="university" required class="auth-input block w-full px-4 py-2 rounded-lg text-sm bg-gray-50">
                        <option value="">Select your university</option>
                        <option value="University of Zambia">University of Zambia</option>
                        <option value="Copperbelt University">Copperbelt University</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div>
                    <label for="signup-email" class="form-label block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input type="email" id="signup-email" name="email" required class="auth-input block w-full px-4 py-2 rounded-lg text-sm bg-gray-50 placeholder-gray-400" placeholder="Enter your email">
                </div>
                <div>
                    <label for="signup-phone" class="form-label block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <div class="phone-input-group">
                        <span class="phone-country-code">+260</span>
                        <input type="tel" id="signup-phone" name="phoneNumber" required 
                            class="auth-input phone-input block w-full px-4 py-2 rounded-lg text-sm bg-gray-50 placeholder-gray-400" 
                            placeholder="XXX XXX XXX" 
                            pattern="[0-9]{9}" 
                            maxlength="9">
                    </div>
                    <p class="phone-hint">Enter 9 digits after +260</p>
                </div>
                <div>
                    <label for="signup-student-email" class="form-label block text-sm font-medium text-gray-700 mb-1">
                        Student Email
                        <span id="student-email-indicator" class="ml-2 text-green-500 hidden">
                            <i class="fas fa-check-circle"></i> Auto-filled
                        </span>
                    </label>
                    <input type="email" id="signup-student-email" name="studentEmail" required class="auth-input block w-full px-4 py-2 rounded-lg text-sm bg-gray-50 placeholder-gray-400" placeholder="student@unza.zm">
                    <p class="text-xs text-gray-500 mt-1">Student email will be auto-filled based on your university selection</p>
                </div>
                <div>
                    <label for="signup-gender" class="form-label block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <select id="signup-gender" name="gender" required class="auth-input block w-full px-4 py-2 rounded-lg text-sm bg-gray-50">
                        <option value="">Select your gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                </div>
                <div>
                    <label for="signup-password" class="form-label block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <div class="relative">
                        <input type="password" id="signup-password" name="password" required class="auth-input block w-full px-4 py-2 rounded-lg text-sm bg-gray-50 placeholder-gray-400 pr-12" placeholder="Enter your password">
                        <span class="password-toggle" onclick="togglePassword('signup-password')">
                            <i class="fas fa-eye" id="signup-password-toggle"></i>
                        </span>
                    </div>
                </div>
                <div>
                    <label for="signup-confirm-password" class="form-label block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                    <div class="relative">
                        <input type="password" id="signup-confirm-password" name="confirmPassword" required class="auth-input block w-full px-4 py-2 rounded-lg text-sm bg-gray-50 placeholder-gray-400 pr-12" placeholder="Confirm your password">
                        <span class="password-toggle" onclick="togglePassword('signup-confirm-password')">
                            <i class="fas fa-eye" id="signup-confirm-password-toggle"></i>
                        </span>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    <input type="checkbox" id="signup-agreedToTerms" name="agreedToTerms" required class="w-4 h-4 text-navy bg-gray-100 border-gray-300 rounded focus:ring-gold">
                    <label for="signup-agreedToTerms" class="text-sm text-gray-700">I agree to the <a href="pages/terms.html" target="_blank" class="text-navy hover:text-gold font-medium">Terms and Conditions</a></label>
                </div>
                <button type="submit" class="auth-button w-full flex justify-center py-3 px-4 rounded-full text-sm font-bold text-navy transition-all duration-300 transform hover:scale-105">
                    Create Account
                </button>
            </form>
            <p class="text-center text-sm mt-6 text-gray-600">
                Already have an account? 
                <a href="#" id="switch-to-login" class="font-bold text-navy hover:text-gold transition-colors duration-200">Log In</a>
            </p>
        </div>
    `;

    const forgotPasswordFormHtml = `
        <div id="forgot-form-wrapper" class="form-container p-8 rounded-2xl w-full max-w-md mx-auto text-gray-800">
            <div class="text-center mb-6">
                <h2 class="text-4xl font-bold text-navy">Reset Password</h2>
            </div>
            <form id="forgot-form" class="space-y-6">
                <div>
                    <label for="forgot-email" class="form-label block text-sm">Email Address</label>
                    <input type="email" id="forgot-email" name="email" required 
                        class="auth-input block w-full px-4 py-3 rounded-lg text-sm bg-gray-50 placeholder-gray-400" 
                        placeholder="Enter your email">
                </div>
                <button type="submit" class="auth-button w-full flex justify-center py-3 px-4 rounded-full text-sm font-bold text-navy transition-all duration-300">
                    Send Reset Link
                </button>
                <div class="text-center">
                    <a href="#" id="switch-to-login-from-forgot" class="text-sm text-navy hover:text-gold transition-colors duration-200">Back to Login</a>
                </div>
            </form>
        </div>
    `;

    const resetPasswordFormHtml = `
        <div id="reset-form-wrapper" class="form-container">
            <form id="reset-form" class="space-y-6">
                <div>
                    <label for="reset-password" class="form-label block text-sm">New Password</label>
                    <div class="relative">
                        <input type="password" id="reset-password" name="password" required 
                            class="auth-input block w-full px-4 py-3 rounded-lg text-sm bg-gray-50 placeholder-gray-400 pr-12" 
                            placeholder="Enter your new password">
                        <span class="password-toggle" onclick="togglePassword('reset-password')">
                            <i class="fas fa-eye" id="reset-password-toggle"></i>
                        </span>
                    </div>
                </div>
                <div>
                    <label for="reset-confirm-password" class="form-label block text-sm">Confirm New Password</label>
                    <div class="relative">
                        <input type="password" id="reset-confirm-password" name="confirmPassword" required 
                            class="auth-input block w-full px-4 py-3 rounded-lg text-sm bg-gray-50 placeholder-gray-400 pr-12" 
                            placeholder="Confirm your new password">
                        <span class="password-toggle" onclick="togglePassword('reset-confirm-password')">
                            <i class="fas fa-eye" id="reset-confirm-password-toggle"></i>
                        </span>
                    </div>
                </div>
                <button type="submit" class="auth-button w-full flex justify-center py-3 px-4 rounded-full text-sm font-bold text-navy transition-all duration-300">
                    Reset Password
                </button>
                <div class="text-center">
                    <a href="#" id="switch-to-login-from-reset" class="text-sm text-navy hover:text-gold transition-colors duration-200">Back to Login</a>
                </div>
            </form>
        </div>
    `;

    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('token');
    
    authContainer.innerHTML = resetToken ? resetPasswordFormHtml : (type === 'login' ? loginFormHtml : type === 'forgot' ? forgotPasswordFormHtml : signupFormHtml);

    // Attach Event Listeners
    if (type === 'login') {
        document.getElementById('switch-to-signup')?.addEventListener('click', (e) => { e.preventDefault(); renderAuthComponent('signup'); });
        document.getElementById('forgot-password-link')?.addEventListener('click', (e) => { e.preventDefault(); 
            if (typeof navigateToPage === 'function') {
                navigateToPage('/pages/forgot-password.html');
            } else {
                window.location.href = '/pages/forgot-password.html';
            }
        });
        document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    } else if (type === 'signup') {
        document.getElementById('switch-to-login')?.addEventListener('click', (e) => { e.preventDefault(); renderAuthComponent('login'); });
        document.getElementById('signup-form')?.addEventListener('submit', handleSignup);
        // Setup student email auto-fill functionality
        setupStudentEmailAutoFill();
    } else if (type === 'forgot') {
        document.getElementById('switch-to-login-from-forgot')?.addEventListener('click', (e) => { e.preventDefault(); renderAuthComponent('login'); });
        document.getElementById('forgot-form')?.addEventListener('submit', handleForgotPassword);
    } else if (type === 'reset') {
        document.getElementById('switch-to-login-from-reset')?.addEventListener('click', (e) => { e.preventDefault(); renderAuthComponent('login'); });
        document.getElementById('reset-form')?.addEventListener('submit', handleResetPassword);
    }
}

// Initialize auth system when page is ready
registerPageReady(() => {
    // Prevent multiple initializations
    if (window.authSystemInitialized) {
        console.log('Auth system already initialized');
        return;
    }
    window.authSystemInitialized = true;
    
    const token = localStorage.getItem('token');
    const pathname = window.location.pathname.toLowerCase();
    const isAuthPage = pathname.includes('login') || pathname.includes('signup') || pathname.includes('forgot-password');

    if (token && isAuthPage) {
        // Redirect to role-specific dashboard based on stored user data
        const isAdmin = localStorage.getItem('isAdmin') === 'true';
        const isSeller = localStorage.getItem('isSeller') === 'true';
        
        if (isAdmin) {
            window.location.href = '/admin';
        } else if (isSeller) {
            window.location.href = '/seller-dashboard';
        } else {
            window.location.href = '/dashboard';
        }
    } else if (!token) {
        const urlParams = new URLSearchParams(window.location.search);
        const resetToken = urlParams.get('token');
        
        if (resetToken) {
            renderAuthComponent('reset');
        } else {
            const pathname = window.location.pathname.toLowerCase();
            if (pathname.includes('signup')) {
                renderAuthComponent('signup');
            } else if (pathname.includes('forgot-password')) {
                renderAuthComponent('forgot');
            } else if (pathname.includes('reset-password')) {
                renderAuthComponent('reset');
            } else {
                renderAuthComponent('login');
            }
        }
    }
});

// Standardized logout function
window.logout = function() {
    // Clear role manager caches and data first
    if (window.roleManager) {
        window.roleManager.clearCaches();
        window.roleManager.clearAllData();
        window.roleManager.isInitialized = false;
        window.roleManager.currentRole = null;
        window.roleManager.roleInfo = null;
        window.roleManager.initializationPromise = null;
        window.roleManager.initializationLock = false;
        // Properly dispose of redirect tracking to prevent memory leaks
        if (window.roleManager.redirectAttempts) {
            window.roleManager.redirectAttempts.clear();
            window.roleManager.redirectAttempts = null;
        }
        // Clear initialization queue
        if (window.roleManager.initQueue) {
            window.roleManager.initQueue = [];
        }
    }
    
    // Clear all authentication and role data from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userFullName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('roleInfo');
    localStorage.removeItem('userRoleData'); // Clear consolidated role data
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('isSeller');
    localStorage.removeItem('isBuyer');
    
    // Clear session storage as well
    sessionStorage.clear();
    
    console.log('🔓 Logged out - all data cleared');
    
    // Redirect to login
    window.location.href = '/login.html';
};

// Cart synchronization function
async function syncCartToBackend() {
    const localCart = localStorage.getItem('virtuosa_cart');
    
    if (localCart) {
        try {
            const cart = JSON.parse(localCart);
            console.log('🔄 Syncing cart to backend after login:', cart);
            
            const response = await fetch(`${API_BASE}/cart`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ items: cart })
            });
            
            if (response.ok) {
                console.log('✅ Cart synced to backend successfully');
                // Clear localStorage to rely on backend going forward
                localStorage.removeItem('virtuosa_cart');
                console.log('🗑️ Cleared localStorage cart, now using backend cart');
            } else {
                console.warn('⚠️ Failed to sync cart to backend, keeping localStorage');
            }
        } catch (error) {
            console.error('❌ Error syncing cart to backend:', error);
        }
    } else {
        console.log('📦 No local cart to sync, using backend cart');
    }
}
