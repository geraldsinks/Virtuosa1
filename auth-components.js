// This file contains the components and logic for the login and sign-up pages,
// with live API calls to a backend.

/**
 * Main function to initialize and render the authentication components.
 */
function initAuthComponents() {
    // A placeholder for authentication state
    let isAuthenticated = false;
    let currentUser = null;
    let currentState = 'login'; // Initial state is to show the login form

    // Get the container element from the main HTML file
    const appContainer = document.getElementById('auth-components');

    // This function will be called whenever we need to re-render the UI
    function renderApp() {
        if (!appContainer) return;
        
        // Render the main app content if the user is authenticated
        if (isAuthenticated) {
            appContainer.innerHTML = `
                <div class="text-center text-gray-600">
                    <h2 class="text-2xl font-semibold mb-4">Welcome back, ${currentUser.email}!</h2>
                    <p>You have successfully logged in.</p>
                </div>
            `;
        } else {
            // Otherwise, render the main authentication component based on the state
            renderAuthComponent();
        }
    }

    /**
     * Renders the authentication components based on the current state.
     */
    function renderAuthComponent() {
        if (!appContainer) return;
        
        if (currentState === 'login') {
            renderLoginForm();
        } else {
            renderSignUpForm();
        }
    }

    /**
     * Renders the login form.
     */
    function renderLoginForm() {
        appContainer.innerHTML = `
            <div class="w-full max-w-md bg-white p-8 rounded-xl shadow-lg transform transition-transform duration-500 ease-in-out hover:scale-105">
                <h2 class="text-3xl font-bold text-center text-navy mb-6">Log In</h2>
                <form id="login-form" class="space-y-6">
                    <div>
                        <label for="login-email" class="block text-sm font-medium text-gray-700">Email Address</label>
                        <input type="email" id="login-email" class="mt-1 block w-full px-4 py-2 bg-gray-100 border-2 border-gray-300 rounded-md focus:border-navy focus:ring focus:ring-navy focus:ring-opacity-50" required>
                    </div>
                    <div>
                        <label for="login-password" class="block text-sm font-medium text-gray-700">Password</label>
                        <input type="password" id="login-password" class="mt-1 block w-full px-4 py-2 bg-gray-100 border-2 border-gray-300 rounded-md focus:border-navy focus:ring focus:ring-navy focus:ring-opacity-50" required>
                    </div>
                    <button type="submit" class="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-lg font-bold text-white bg-navy hover:bg-gold hover:text-navy transition-colors">
                        Log In
                    </button>
                </form>
                <p class="mt-6 text-center text-sm text-gray-600">
                    Don't have an account? <a href="#" id="switch-to-signup" class="font-medium text-navy hover:text-gold">Sign Up</a>
                </p>
            </div>
        `;

        // Event listener for form submission
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            handleLogin(email, password);
        });

        // Event listener to switch to the sign-up form
        document.getElementById('switch-to-signup').addEventListener('click', (e) => {
            e.preventDefault();
            currentState = 'signup';
            renderAuthComponent();
        });
    }

    /**
     * Renders the sign-up form.
     */
    function renderSignUpForm() {
        appContainer.innerHTML = `
            <div class="w-full max-w-md bg-white p-8 rounded-xl shadow-lg transform transition-transform duration-500 ease-in-out hover:scale-105">
                <h2 class="text-3xl font-bold text-center text-navy mb-6">Create Account</h2>
                <form id="signup-form" class="space-y-6">
                    <div>
                        <label for="signup-email" class="block text-sm font-medium text-gray-700">Email Address</label>
                        <input type="email" id="signup-email" class="mt-1 block w-full px-4 py-2 bg-gray-100 border-2 border-gray-300 rounded-md focus:border-navy focus:ring focus:ring-navy focus:ring-opacity-50" required>
                    </div>
                    <div>
                        <label for="signup-password" class="block text-sm font-medium text-gray-700">Password</label>
                        <input type="password" id="signup-password" class="mt-1 block w-full px-4 py-2 bg-gray-100 border-2 border-gray-300 rounded-md focus:border-navy focus:ring focus:ring-navy focus:ring-opacity-50" required>
                    </div>
                    <div>
                        <label for="signup-phone" class="block text-sm font-medium text-gray-700">Phone Number (Zambia only)</label>
                        <input type="tel" id="signup-phone" pattern="\\+260[0-9]{9}" placeholder="+260XXXXXXXXX" class="mt-1 block w-full px-4 py-2 bg-gray-100 border-2 border-gray-300 rounded-md focus:border-navy focus:ring focus:ring-navy focus:ring-opacity-50" required>
                        <p class="mt-1 text-xs text-gray-500">Format: +260XXXXXXXXX</p>
                    </div>
                    <div>
                        <label for="signup-university" class="block text-sm font-medium text-gray-700">University</label>
                        <select id="signup-university" class="mt-1 block w-full px-4 py-2 bg-gray-100 border-2 border-gray-300 rounded-md focus:border-navy focus:ring focus:ring-navy focus:ring-opacity-50" required>
                            <option value="" disabled selected>Select your university</option>
                            <option value="University of Zambia">University of Zambia</option>
                        </select>
                    </div>
                    <button type="submit" class="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-lg font-bold text-white bg-navy hover:bg-gold hover:text-navy transition-colors">
                        Sign Up
                    </button>
                </form>
                <p class="mt-6 text-center text-sm text-gray-600">
                    Already have an account? <a href="#" id="switch-to-login" class="font-medium text-navy hover:text-gold">Log In</a>
                </p>
            </div>
        `;

        // Event listener for form submission
        document.getElementById('signup-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const phoneNumber = document.getElementById('signup-phone').value;
            const university = document.getElementById('signup-university').value;
            handleSignUp(email, password, phoneNumber, university);
        });

        // Event listener to switch to the login form
        document.getElementById('switch-to-login').addEventListener('click', (e) => {
            e.preventDefault();
            currentState = 'login';
            renderAuthComponent();
        });
    }

    /**
     * Handles the sign-up process by sending a POST request to the backend.
     * @param {string} email - User's email.
     * @param {string} password - User's password.
     * @param {string} phoneNumber - User's phone number.
     * @param {string} university - User's university.
     */
    async function handleSignUp(email, password, phoneNumber, university) {
        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, phoneNumber, university })
            });

            const data = await response.json();

            if (response.ok) {
                console.log("Sign-up successful:", data);
                isAuthenticated = true;
                currentUser = { email: data.user.email }; // Assuming the response has a user object
                renderApp();
            } else {
                console.error("Sign-up failed:", data.message);
                // In a real app, you would show a user-friendly error message here
            }
        } catch (error) {
            console.error("Network error during sign-up:", error);
        }
    }

    /**
     * Handles the login process by sending a POST request to the backend.
     * @param {string} email - User's email.
     * @param {string} password - User's password.
     */
    async function handleLogin(email, password) {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                console.log("Login successful for user:", data.user);
                isAuthenticated = true;
                currentUser = { email: data.user.email }; // Assuming the response has a user object
                renderApp();
            } else {
                console.error("Login failed:", data.message);
            }
        } catch (error) {
            console.error("Network error during login:", error);
        }
    }
    
    // Initial render of the authentication components
    renderAuthComponent();
}

// Attach the function to the window to be called by index.html after the DOM loads
window.initAuthComponents = initAuthComponents;
