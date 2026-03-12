const BASE_API_URL = '/api/auth';

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
    `;
    messageBox.className = isError ? 'bg-red-600' : 'bg-green-600';
    messageBox.textContent = message;
    authContainer.appendChild(messageBox);

    setTimeout(() => {
        messageBox.style.opacity = '1';
    }, 10);
    setTimeout(() => {
        messageBox.style.opacity = '0';
        setTimeout(() => messageBox.remove(), 500);
    }, 3000);
}

async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email')?.value;
    const password = document.getElementById('login-password')?.value;

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
            localStorage.setItem('token', result.token);
            localStorage.setItem('userId', result.user._id);
            localStorage.setItem('userEmail', result.user.email);
            localStorage.setItem('userFullName', result.user.fullName);
            localStorage.setItem('userRole', result.user.role || 'user');
            localStorage.setItem('isAdmin', result.user.isAdmin || false);
            console.log('Login successful, user data stored:', {
                userId: result.user._id,
                email: result.user.email,
                role: result.user.role,
                isAdmin: result.user.isAdmin
            });
            setTimeout(() => {
                window.location.href = '/pages/index.html';
            }, 1000);
        } else {
            showMessage(result.message || 'Login failed. Please try again.', true);
        }
    } catch (error) {
        console.error('Error during login:', error);
        showMessage('An error occurred during login. Please try again later.', true);
    }
}

async function handleSignup(event) {
    event.preventDefault();
    const fullName = document.getElementById('signup-fullName')?.value;
    const email = document.getElementById('signup-email')?.value;
    const university = document.getElementById('signup-university')?.value;
    const phoneNumber = document.getElementById('signup-phone')?.value;
    const studentEmail = document.getElementById('signup-student-email')?.value;
    const password = document.getElementById('signup-password')?.value;
    const confirmPassword = document.getElementById('signup-confirm-password')?.value;
    const agreedToTerms = document.getElementById('signup-agreedToTerms')?.checked;

    if (!fullName || !email || !university || !phoneNumber || !studentEmail || !password || !confirmPassword) {
        showMessage('Please fill in all fields.', true);
        return;
    }
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
                renderAuthComponent('login');
            }, 2000);
        } else {
            showMessage(result.message || 'Signup failed. Please try again.', true);
        }
    } catch (error) {
        console.error('Error during signup:', error);
        showMessage('An error occurred during signup. Please try again later.', true);
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
            showMessage(result.message || 'Failed to send reset email. Please try again.', true);
        }
    } catch (error) {
        console.error('Error during password reset request:', error);
        showMessage('An error occurred. Please try again later.', true);
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
    if (password.length < 6) {
        showMessage('Password must be at least 6 characters long.', true);
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
            }, 1000);
        } else {
            showMessage(result.message || 'Failed to reset password. Please try again.', true);
        }
    } catch (error) {
        console.error('Error during password reset:', error);
        showMessage('An error occurred. Please try again later.', true);
    }
}

function renderAuthComponent(type) {
    const authContainer = document.getElementById('auth-container');
    if (!authContainer) {
        console.error('Auth container not found');
        return;
    }

    const loginFormHtml = `
        <div id="login-form-wrapper" class="form-container p-8 rounded-2xl w-full max-w-md mx-auto text-gray-800">
            <div class="text-center mb-6">
                <h2 class="text-4xl font-bold text-navy">Welcome Back</h2>
            </div>
            <form id="login-form" class="space-y-6">
                <div>
                    <label for="login-email" class="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input type="email" id="login-email" name="email" required class="auth-input block w-full px-4 py-2 rounded-lg text-sm bg-gray-50 placeholder-gray-400" placeholder="Enter your email">
                </div>
                <div>
                    <label for="login-password" class="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input type="password" id="login-password" name="password" required class="auth-input block w-full px-4 py-2 rounded-lg text-sm bg-gray-50 placeholder-gray-400" placeholder="Enter your password">
                    <a href="#" id="forgot-password-link" class="block text-right text-sm text-navy hover:text-gold transition-colors duration-200 mt-2">Forgot Password?</a>
                </div>
                <button type="submit" class="auth-button w-full flex justify-center py-3 px-4 rounded-full text-sm font-bold text-navy transition-all duration-300 transform hover:scale-105">
                    Log In
                </button>
            </form>
            <p class="text-center text-sm mt-6 text-gray-600">
                Don't have an account? 
                <a href="#" id="switch-to-signup" class="font-bold text-navy hover:text-gold transition-colors duration-200">Sign Up</a>
            </p>
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
                    <input type="tel" id="signup-phone" name="phoneNumber" required class="auth-input block w-full px-4 py-2 rounded-lg text-sm bg-gray-50 placeholder-gray-400" placeholder="+260XXXXXXXXX" pattern="\+260[0-9]{9}">
                </div>
                <div>
                    <label for="signup-student-email" class="block text-sm font-medium text-gray-700 mb-1">Student Email</label>
                    <input type="email" id="signup-student-email" name="studentEmail" required class="auth-input block w-full px-4 py-2 rounded-lg text-sm bg-gray-50 placeholder-gray-400" placeholder="student@unza.zm">
                    <p class="text-xs text-gray-500 mt-1">Must be a valid university email address</p>
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
        <div id="forgot-form-wrapper" class="form-container p-8 rounded-2xl w-full max-w-md mx-auto text-gray-800">
            <div class="text-center mb-6">
                <h2 class="text-4xl font-bold text-navy">Reset Password</h2>
                <p class="text-sm text-gray-600 mt-2">Enter your email to receive a password reset link.</p>
            </div>
            <form id="forgot-form" class="space-y-6">
                <div>
                    <label for="forgot-email" class="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input type="email" id="forgot-email" name="email" required class="auth-input block w-full px-4 py-2 rounded-lg text-sm bg-gray-50 placeholder-gray-400" placeholder="Enter your email">
                </div>
                <button type="submit" class="auth-button w-full flex justify-center py-3 px-4 rounded-full text-sm font-bold text-navy transition-all duration-300 transform hover:scale-105">
                    Send Reset Link
                </button>
            </form>
            <p class="text-center text-sm mt-6 text-gray-600">
                Back to 
                <a href="#" id="switch-to-login-from-forgot" class="font-bold text-navy hover:text-gold transition-colors duration-200">Log In</a>
            </p>
        </div>
    `;

    const resetPasswordFormHtml = `
        <div id="reset-form-wrapper" class="form-container p-8 rounded-2xl w-full max-w-md mx-auto text-gray-800">
            <div class="text-center mb-6">
                <h2 class="text-4xl font-bold text-navy">Set New Password</h2>
                <p class="text-sm text-gray-600 mt-2">Enter your new password.</p>
            </div>
            <form id="reset-form" class="space-y-6">
                <div>
                    <label for="reset-password" class="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <input type="password" id="reset-password" name="password" required class="auth-input block w-full px-4 py-2 rounded-lg text-sm bg-gray-50 placeholder-gray-400" placeholder="Enter new password">
                </div>
                <div>
                    <label for="reset-confirm-password" class="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                    <input type="password" id="reset-confirm-password" name="confirmPassword" required class="auth-input block w-full px-4 py-2 rounded-lg text-sm bg-gray-50 placeholder-gray-400" placeholder="Confirm new password">
                </div>
                <button type="submit" class="auth-button w-full flex justify-center py-3 px-4 rounded-full text-sm font-bold text-navy transition-all duration-300 transform hover:scale-105">
                    Reset Password
                </button>
            </form>
            <p class="text-center text-sm mt-6 text-gray-600">
                Back to 
                <a href="#" id="switch-to-login-from-reset" class="font-bold text-navy hover:text-gold transition-colors duration-200">Log In</a>
            </p>
        </div>
    `;

    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('token');
    authContainer.innerHTML = resetToken ? resetPasswordFormHtml : (type === 'login' ? loginFormHtml : type === 'forgot' ? forgotPasswordFormHtml : signupFormHtml);

    if (type === 'login') {
        document.getElementById('switch-to-signup')?.addEventListener('click', (e) => {
            e.preventDefault();
            renderAuthComponent('signup');
        });
        document.getElementById('forgot-password-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            renderAuthComponent('forgot');
        });
        document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    } else if (type === 'signup') {
        document.getElementById('switch-to-login')?.addEventListener('click', (e) => {
            e.preventDefault();
            renderAuthComponent('login');
        });
        document.getElementById('signup-form')?.addEventListener('submit', handleSignup);
    } else if (type === 'forgot') {
        document.getElementById('switch-to-login-from-forgot')?.addEventListener('click', (e) => {
            e.preventDefault();
            renderAuthComponent('login');
        });
        document.getElementById('forgot-form')?.addEventListener('submit', handleForgotPassword);
    } else if (resetToken) {
        document.getElementById('switch-to-login-from-reset')?.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '/pages/login.html';
        });
        document.getElementById('reset-form')?.addEventListener('submit', handleResetPassword);
    }

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (token) {
        window.location.href = '/pages/index.html';
    } else {
        const urlParams = new URLSearchParams(window.location.search);
        const resetToken = urlParams.get('token');
        renderAuthComponent(resetToken ? 'reset' : 'login');
    }
});
