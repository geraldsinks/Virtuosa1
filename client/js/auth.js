// Use the global API_BASE from config.js
const BASE_API_URL = `${API_BASE}/auth`;

function showMessage(message, isError = false) {
    const authContainer = document.getElementById('auth-container');
    if (!authContainer) return;

    const messageBox = document.createElement('div');
    messageBox.style.cssText = `
        padding: 15px 30px;
        border-radius: 10px;
        color: white;
        font-weight: bold;
        text-align: center;
        margin-top: 1rem;
        opacity: 0;
        transition: opacity 0.5s ease-in-out;
        z-index: 1000;
        position: relative;
    `;
    messageBox.className = isError ? 'bg-red-600' : 'bg-green-600';
    messageBox.textContent = message;
    authContainer.appendChild(messageBox);

    setTimeout(() => { messageBox.style.opacity = '1'; }, 10);
    setTimeout(() => {
        messageBox.style.opacity = '0';
        setTimeout(() => messageBox.remove(), 500);
    }, 3000);
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const toggle = document.getElementById(inputId + '-toggle');
    
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

async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email')?.value;
    const password = document.getElementById('login-password-input')?.value;

    if (!email || !password) {
        showMessage('Please fill in both email and password.', true);
        return;
    }

    try {
        const response = await fetch(`${BASE_API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (response.ok) {
            showMessage('Login successful! Redirecting...');
            
            // Core Identity Storage
            localStorage.setItem('token', result.token);
            localStorage.setItem('userId', result.user._id);
            localStorage.setItem('userEmail', result.user.email);
            localStorage.setItem('userFullName', result.user.fullName);
            
            // Role Persistence Logic
            console.log('🔍 LOGIN DEBUG - Server response:', result.user);
            
            // The login response doesn't include admin fields, so fetch full profile
            try {
                const profileResponse = await fetch(`${API_BASE}/user/profile`, {
                    headers: { 'Authorization': `Bearer ${result.token}` }
                });
                
                if (profileResponse.ok) {
                    const fullUserData = await profileResponse.json();
                    console.log('🔍 LOGIN DEBUG - Full user profile:', fullUserData);
                    
                    // Use the full user data for role detection
                    const isAdmin = (fullUserData.isAdmin === true || fullUserData.isAdmin === 'true' || fullUserData.email === 'admin@virtuosa.com');
                    const isSeller = fullUserData.isSeller === true || fullUserData.isSeller === 'true';
                    
                    console.log('🔍 LOGIN DEBUG - Role detection:', {
                        isAdmin: isAdmin,
                        isSeller: isSeller,
                        userIsAdmin: fullUserData.isAdmin,
                        userEmail: fullUserData.email,
                        userRole: fullUserData.role
                    });
                    
                    // Store role information
                    localStorage.setItem('isAdmin', isAdmin.toString());
                    localStorage.setItem('isSeller', isSeller.toString());
                } else {
                    console.warn('Could not fetch user profile:', profileResponse);
                    // Fallback: store default values
                    localStorage.setItem('isAdmin', 'false');
                    localStorage.setItem('isSeller', 'false');
                }
                
                // Redirect to appropriate dashboard
                setTimeout(() => {
                    const isAdmin = localStorage.getItem('isAdmin') === 'true';
                    const isSeller = localStorage.getItem('isSeller') === 'true';
                    
                    if (isAdmin) {
                        window.location.href = '/pages/admin-dashboard.html';
                    } else if (isSeller) {
                        window.location.href = '/pages/seller-dashboard.html';
                    } else {
                        window.location.href = '/pages/buyer-dashboard.html';
                    }
                }, 1500);
                localStorage.setItem('isSeller', 'false');
            } catch (profileError) {
                console.warn('Could not fetch user profile:', profileError);
                // Fallback: store default values
                localStorage.setItem('isAdmin', 'false');
                localStorage.setItem('isSeller', 'false');
            }
            
            // Redirect directly to role-specific dashboard (no more universal router)
            const finalIsAdmin = localStorage.getItem('isAdmin') === 'true';
            const finalIsSeller = localStorage.getItem('isSeller') === 'true';
            
            if (finalIsAdmin) {
                window.location.href = '/pages/admin-dashboard.html';
            } else if (finalIsSeller) {
                window.location.href = '/pages/seller-dashboard.html';
            } else {
                window.location.href = '/pages/buyer-dashboard.html';
            }
        } else {
            // Handle specific error for email verification
            if (result.requiresEmailVerification) {
                showMessage(result.message, true);
                // Show option to resend verification email
                setTimeout(() => {
                    if (confirm('Would you like us to resend the verification email?')) {
                        resendVerificationEmail(email);
                    }
                }, 2000);
            } else {
                showMessage(result.message || 'Login failed', true);
            }
        }
    } catch (error) {
        console.error('Error during login:', error);
        showMessage('An error occurred during login. Please try again later.', true);
    }
}

async function resendVerificationEmail(email) {
    try {
        const response = await fetch(`${API_BASE}/auth/resend-verification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const result = await response.json();
        
        if (response.ok) {
            showMessage('Verification email sent! Please check your inbox.');
        } else {
            showMessage(result.message || 'Failed to send verification email', true);
        }
    } catch (error) {
        console.error('Resend verification error:', error);
        showMessage('Failed to send verification email. Please try again.', true);
    }
}

async function handleSignup(event) {
    event.preventDefault();
    const fullName = document.getElementById('signup-fullName')?.value;
    const email = document.getElementById('signup-email')?.value;
    const university = document.getElementById('signup-university')?.value;
    let phoneNumber = document.getElementById('signup-phone')?.value;
    const studentEmail = document.getElementById('signup-student-email')?.value;
    const password = document.getElementById('signup-password-input')?.value;
    const confirmPassword = document.getElementById('signup-confirm-password-input')?.value;
    const agreedToTerms = document.getElementById('signup-agreedToTerms')?.checked;

    if (!fullName || !email || !university || !phoneNumber || !studentEmail || !password || !confirmPassword) {
        showMessage('Please fill in all fields.', true);
        return;
    }
    
    // Add +260 country code to phone number
    phoneNumber = '+260' + phoneNumber;
    
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

    try {
        const response = await fetch(`${BASE_API_URL}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName, email, password, university, phoneNumber, studentEmail, agreedToTerms })
        });

        const result = await response.json();

        if (response.ok) {
            showMessage('Account created successfully! Please check your student email for verification.');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            showMessage(result.message || 'Signup failed. Please try again.', true);
        }
    } catch (error) {
        console.error('Error during signup:', error);
        showMessage('An error occurred during signup.', true);
    }
}

async function handleForgotPassword(event) {
    event.preventDefault();
    const email = document.getElementById('forgot-email')?.value;

    if (!email) {
        showMessage('Please enter your email address.', true);
        return;
    }

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
                window.location.href = '/pages/login.html';
            }, 1500);
        } else {
            showMessage(result.message || 'Failed to reset password.', true);
        }
    } catch (error) {
        console.error('Error during reset:', error);
        showMessage('An error occurred.', true);
    }
}

function renderAuthComponent(type) {
    const authContainer = document.getElementById('auth-container');
    if (!authContainer) return;

    const loginFormHtml = `
        <div id="login-form-wrapper" class="form-container">
            <form id="login-form" class="space-y-6">
                <div>
                    <label for="login-email" class="form-label block text-sm">Email Address</label>
                    <input type="email" id="login-email" name="email" required 
                        class="auth-input block w-full px-4 py-3 rounded-lg text-sm bg-gray-50 placeholder-gray-400" 
                        placeholder="Enter your email">
                </div>
                <div>
                    <label for="login-password" class="form-label block text-sm">Password</label>
                    <div class="relative">
                        <input type="password" id="login-password-input" name="password" required 
                            class="auth-input block w-full px-4 py-3 rounded-lg text-sm bg-gray-50 placeholder-gray-400 pr-12" 
                            placeholder="Enter your password">
                        <span class="password-toggle" onclick="togglePassword('login-password-input')">
                            <i class="fas fa-eye" id="login-password-toggle"></i>
                        </span>
                    </div>
                    <a href="#" id="forgot-password-link" class="block text-right text-sm text-navy hover:text-gold transition-colors duration-200 mt-2">Forgot Password?</a>
                </div>
                <button type="submit" class="auth-button w-full flex justify-center py-3 px-4 rounded-full text-sm font-bold text-navy transition-all duration-300">
                    Log In
                </button>
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
                    <label for="signup-fullName" class="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input type="text" id="signup-fullName" name="fullName" required class="auth-input block w-full px-4 py-2 rounded-lg text-sm bg-gray-50 placeholder-gray-400" placeholder="Enter your full name">
                </div>
                <div>
                    <label for="signup-email" class="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input type="email" id="signup-email" name="email" required class="auth-input block w-full px-4 py-2 rounded-lg text-sm bg-gray-50 placeholder-gray-400" placeholder="Enter your email">
                </div>
                <div>
                    <label for="signup-phone" class="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input type="tel" id="signup-phone" name="phoneNumber" required class="auth-input block w-full px-4 py-2 rounded-lg text-sm bg-gray-50 placeholder-gray-400" placeholder="+260XXXXXXXXX" pattern="\\+260[0-9]{9}">
                </div>
                <div>
                    <label for="signup-student-email" class="block text-sm font-medium text-gray-700 mb-1">Student Email</label>
                    <input type="email" id="signup-student-email" name="studentEmail" required class="auth-input block w-full px-4 py-2 rounded-lg text-sm bg-gray-50 placeholder-gray-400" placeholder="student@unza.zm">
                </div>
                <div>
                    <label for="signup-university" class="block text-sm font-medium text-gray-700 mb-1">University</label>
                    <select id="signup-university" name="university" required class="auth-input block w-full px-4 py-2 rounded-lg text-sm bg-gray-50">
                        <option value="">Select your university</option>
                        <option value="University of Zambia">University of Zambia</option>
                        <option value="Copperbelt University">Copperbelt University</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div>
                    <label for="signup-password" class="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input type="password" id="signup-password" name="password" required class="auth-input block w-full px-4 py-2 rounded-lg text-sm bg-gray-50 placeholder-gray-400" placeholder="Enter your password">
                </div>
                <div>
                    <label for="signup-confirm-password" class="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                    <input type="password" id="signup-confirm-password" name="confirmPassword" required class="auth-input block w-full px-4 py-2 rounded-lg text-sm bg-gray-50 placeholder-gray-400" placeholder="Confirm your password">
                </div>
                <div class="flex items-center space-x-2">
                    <input type="checkbox" id="signup-agreedToTerms" name="agreedToTerms" required class="w-4 h-4 text-navy bg-gray-100 border-gray-300 rounded focus:ring-gold">
                    <label for="signup-agreedToTerms" class="text-sm text-gray-700">I agree to the <a href="#" class="text-navy hover:text-gold font-medium">terms and conditions</a></label>
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
        <div id="forgot-form-wrapper" class="form-container">
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
            </form>
        </div>
    `;

    const resetPasswordFormHtml = `
        <div id="reset-form-wrapper" class="form-container">
            <form id="reset-form" class="space-y-6">
                <div>
                    <label for="reset-password" class="form-label block text-sm">New Password</label>
                    <input type="password" id="reset-password" name="password" required 
                        class="auth-input block w-full px-4 py-3 rounded-lg text-sm bg-gray-50 placeholder-gray-400" 
                        placeholder="Enter your new password">
                </div>
                <div>
                    <label for="reset-confirm-password" class="form-label block text-sm">Confirm New Password</label>
                    <input type="password" id="reset-confirm-password" name="confirmPassword" required 
                        class="auth-input block w-full px-4 py-3 rounded-lg text-sm bg-gray-50 placeholder-gray-400" 
                        placeholder="Confirm your new password">
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
        document.getElementById('forgot-password-link')?.addEventListener('click', (e) => { e.preventDefault(); renderAuthComponent('forgot'); });
        document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    } else if (type === 'signup') {
        document.getElementById('switch-to-login')?.addEventListener('click', (e) => { e.preventDefault(); renderAuthComponent('login'); });
        document.getElementById('signup-form')?.addEventListener('submit', handleSignup);
    } else if (type === 'forgot') {
        document.getElementById('switch-to-login-from-forgot')?.addEventListener('click', (e) => { e.preventDefault(); renderAuthComponent('login'); });
        document.getElementById('forgot-form')?.addEventListener('submit', handleForgotPassword);
    } else if (type === 'reset') {
        document.getElementById('switch-to-login-from-reset')?.addEventListener('click', (e) => { e.preventDefault(); renderAuthComponent('login'); });
        document.getElementById('reset-form')?.addEventListener('submit', handleResetPassword);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (token) {
        // Redirect to role-specific dashboard based on stored user data
        const isAdmin = localStorage.getItem('isAdmin') === 'true';
        const isSeller = localStorage.getItem('isSeller') === 'true';
        
        if (isAdmin) {
            window.location.href = '/pages/admin-dashboard.html';
        } else if (isSeller) {
            window.location.href = '/pages/seller-dashboard.html';
        } else {
            window.location.href = '/pages/buyer-dashboard.html';
        }
    } else {
        const urlParams = new URLSearchParams(window.location.search);
        const resetToken = urlParams.get('token');
        renderAuthComponent(resetToken ? 'reset' : 'login');
    }
});
