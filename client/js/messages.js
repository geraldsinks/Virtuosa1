// Messages JavaScript
// API_BASE is provided by config.js

// HTML Sanitization function to prevent XSS
function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Helper function to fix URLs to point to server
function fixServerUrl(url) {
    if (!url) return url;
    return url.startsWith('/') ? `${API_BASE}${url}` : url;
}

// Toast Notification System (shared with cart.js)
const toastStyles = `
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
function showToast(message, type = 'success', duration = 4000) {
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

document.addEventListener('DOMContentLoaded', () => {
    console.log('Messages page loading...');
    
    // Initialize mobile header functionality
    initializeMobileHeader();
    
    const token = localStorage.getItem('token');
    const userEmail = localStorage.getItem('userEmail');
    const userFullName = localStorage.getItem('userFullName');
    let userId = localStorage.getItem('userId');
    
    console.log('Authentication status:', { 
        hasToken: !!token, 
        userId,
        userEmail, 
        userFullName 
    });
    
    // Load token manager for automatic refresh
    const tokenManagerScript = document.createElement('script');
    tokenManagerScript.src = '/js/token-manager.js';
    tokenManagerScript.onload = () => {
        console.log('Token manager loaded');
        
        // Update token reference when token manager refreshes
        setInterval(() => {
            const currentToken = localStorage.getItem('token');
            if (currentToken !== token) {
                console.log('Token updated by token manager, reconnecting...');
                if (socket && socketConnected) {
                    socket.emit('authenticate', currentToken);
                }
            }
        }, 30000); // Check every 30 seconds
    };
    document.head.appendChild(tokenManagerScript);
    
    // Fix userId if it's undefined - try to get from token
    if (!userId && token) {
        console.log('🔍 Attempting to extract user ID from token...');
        
        try {
            const parts = token.split('.');
            if (parts.length !== 3) {
                throw new Error('Invalid JWT format - should have 3 parts');
            }
            
            const base64Url = parts[1];
            
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            const decoded = JSON.parse(jsonPayload);
            
            // Try different possible userId field names
            userId = decoded.userId || decoded.id || decoded._id || decoded.sub;
            
            if (userId) {
                localStorage.setItem('userId', userId);
                console.log('✅ User ID extracted and stored');
            } else {
                console.error('❌ No userId field found in token');
            }
            
        } catch (e) {
            console.error('❌ Error parsing token for userId:', e.message);
            
            // As a fallback, try to get userId from the first message sender
            console.log('🔄 Attempting fallback method...');
        }
    } else if (userId && userId !== 'undefined') {
        console.log('✅ Using stored userId');
    } else {
        console.error('❌ No userId available and no token to parse');
    }
    
    // Get URL parameters immediately
    const urlParams = new URLSearchParams(window.location.search);
    let currentRecipientId = urlParams.get('recipientId') || urlParams.get('seller');
    const currentProductId = urlParams.get('productId');
    const currentOrderId = urlParams.get('order');
    
    // If seller and order parameters are present, start chat with seller about order
    if (urlParams.get('seller') && urlParams.get('order')) {
        const sellerId = urlParams.get('seller');
        const orderId = urlParams.get('order');
        console.log('Starting chat with seller about order:', { sellerId, orderId });
        
        // Wait for conversations to load before starting chat
        startChatAfterConversationsLoad(sellerId, orderId);
    }
    
    console.log('URL parameters:', { currentRecipientId, currentProductId });

    // Get DOM elements
    const conversationList = document.getElementById('conversation-list');
    const messageContainer = document.getElementById('message-container');
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    const chatArea = document.getElementById('chat-area');
    const sidebar = document.getElementById('sidebar');
    const searchInput = document.getElementById('search-input');
    const emojiButton = document.getElementById('emoji-button');
    const emojiPicker = document.getElementById('emoji-picker');
    const typingIndicator = document.getElementById('typing-indicator');

    let activeConversationId = null;
    let pollInterval = null;
    let typingTimeout = null;
    let isTyping = false;
    let socket = null;
    let socketConnected = false;

    console.log('DOM Elements found:', {
        conversationList: !!conversationList,
        messageContainer: !!messageContainer,
        messageForm: !!messageForm,
        messageInput: !!messageInput,
        chatArea: !!chatArea,
        sidebar: !!sidebar
    });

    // Define startChat function BEFORE calling it
    window.startChat = async (recipientId, recipientName, recipientProfilePicture, orderId = '') => {
        console.log('🚀 startChat called with:', { recipientId, recipientName, recipientProfilePicture, orderId });
        
        currentRecipientId = recipientId;
        activeConversationId = recipientId;

        // Join socket room for real-time messaging
        if (socketConnected && socket) {
            socket.emit('join_conversation', recipientId);
        }

        // If orderId is provided, send an initial message about the order
        if (orderId) {
            setTimeout(async () => {
                const initialMessage = `Hello! I'm messaging you about order #${orderId.slice(-8)}. I have some questions about this order.`;
                
                // Send the initial message
                await sendMessage(initialMessage, orderId);
                
                console.log('📝 Sent initial order message:', initialMessage);
            }, 1500); // Wait a bit for the chat to fully load
        }

        // Mobile UI handle - improved navigation
        if (window.innerWidth < 768) {
            console.log('📱 Mobile navigation - switching to chat view');
            
            // Hide sidebar and show chat area
            if (sidebar) {
                sidebar.classList.add('hidden');
                sidebar.classList.remove('mobile-full');
            }
            if (chatArea) {
                chatArea.classList.remove('hidden');
                chatArea.classList.add('mobile-full', 'flex');
            }
            
            // Add mobile navigation state
            document.body.classList.add('mobile-chat-active');
            
            // Prevent body scroll when chat is active
            document.body.style.overflow = 'hidden';
            
            // Handle mobile header transitions
            const mobileHeader = document.querySelector('.mobile-messages-header');
            const mobileTitle = document.getElementById('mobile-header-title');
            const menuBtn = document.getElementById('mobile-menu-toggle-btn');
            const backBtn = document.getElementById('mobile-chat-back-button');
            
            if (mobileTitle) mobileTitle.textContent = recipientName || 'Chat';
            if (menuBtn) menuBtn.classList.add('hidden');
            if (backBtn) backBtn.classList.remove('hidden');
            
        } else {
            // Desktop behavior
            if (chatArea) {
                chatArea.classList.remove('hidden');
                chatArea.classList.add('flex');
            }
        }

        if (recipientName) {
            document.getElementById('recipient-name').textContent = recipientName;
            
            // Update avatar with profile picture or initial
            const avatarElement = document.getElementById('recipient-avatar');
            if (recipientProfilePicture) {
                avatarElement.innerHTML = `<img src="${fixServerUrl(recipientProfilePicture)}" class="w-full h-full rounded-full object-cover">`;
            } else {
                avatarElement.textContent = recipientName.charAt(0);
            }
        }

        await loadMessages();

        // Start polling for new messages (fallback)
        if (pollInterval) clearInterval(pollInterval);
        pollInterval = setInterval(loadMessages, 10000);

        // Highlight active conversation
        loadConversations();
    };
    
    // Mobile back to conversation list function
    window.backToConversations = () => {
        console.log('📱 Back to conversations');
        
        if (window.innerWidth < 768) {
            // Show sidebar and hide chat area
            if (sidebar) {
                sidebar.classList.remove('hidden');
                sidebar.classList.add('mobile-full');
            }
            if (chatArea) {
                chatArea.classList.add('hidden');
                chatArea.classList.remove('mobile-full', 'flex');
            }
            
            // Remove mobile navigation state
            document.body.classList.remove('mobile-chat-active');
            
            // Restore body scroll
            document.body.style.overflow = '';
            
            // Restore mobile header state
            const mobileTitle = document.getElementById('mobile-header-title');
            const menuBtn = document.getElementById('mobile-menu-toggle-btn');
            const backBtn = document.getElementById('mobile-chat-back-button');
            
            if (mobileTitle) mobileTitle.textContent = 'Messages';
            if (menuBtn) menuBtn.classList.remove('hidden');
            if (backBtn) backBtn.classList.add('hidden');
            
            // Clear active conversation
            activeConversationId = null;
            currentRecipientId = null;
            
            // Stop polling
            if (pollInterval) {
                clearInterval(pollInterval);
                pollInterval = null;
            }
        }
    };

    // IMMEDIATELY show chat area if we have recipientId
    if (currentRecipientId && chatArea) {
        console.log('🚀 AUTO-OPENING CHAT for recipient:', currentRecipientId);
        startChat(currentRecipientId, 'User', '');
    }

    // Initialize Socket.io if authenticated
    if (token) {
        // Load Socket.io dynamically
        const script = document.createElement('script');
        script.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
        script.onload = () => {
            console.log('Socket.io loaded, initializing...');
            initializeSocket();
        };
        script.onerror = () => {
            console.error('Failed to load Socket.io - using HTTP only');
        };
        document.head.appendChild(script);
    } else {
        console.log('No token - proceeding without Socket.io');
    }

    // Cleanup function to prevent memory leaks
    function cleanup() {
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }
        if (typingTimeout) {
            clearTimeout(typingTimeout);
            typingTimeout = null;
        }
        if (socket) {
            socket.disconnect();
            socket = null;
        }
    }

    // Add cleanup on page unload
    window.addEventListener('beforeunload', cleanup);
    window.addEventListener('pagehide', cleanup);

    function initializeSocket() {
        try {
            socket = io();
            
            // Register socket with token manager for automatic reconnection
            if (window.tokenManager) {
                window.tokenManager.setSocket(socket);
            }
            
            socket.on('connect', () => {
                console.log('Socket.io connected');
                socketConnected = true;
                
                // Get fresh token for authentication
                const currentToken = localStorage.getItem('token');
                socket.emit('authenticate', currentToken);
            });

            socket.on('disconnect', () => {
                console.log('Socket.io disconnected');
                socketConnected = false;
            });

            // Handle authentication errors
            socket.on('token_expired', (data) => {
                console.warn('Token expired, triggering automatic refresh:', data.message);
                
                // Let token manager handle the refresh automatically
                if (window.tokenManager) {
                    window.tokenManager.refreshToken().then(() => {
                        console.log('Token refreshed automatically by token manager');
                    }).catch(() => {
                        console.log('Token refresh failed, token manager will handle redirect');
                    });
                } else {
                    console.error('Token manager not available, falling back to manual refresh');
                    // Show manual refresh notification as fallback
                    const messageDiv = document.createElement('div');
                    messageDiv.className = 'fixed top-4 right-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded shadow-lg z-50';
                    messageDiv.innerHTML = `
                        <div class="flex">
                            <div class="py-1">
                                <svg class="fill-current h-6 w-6 text-yellow-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                    <path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM9 11V9h2v6H9v-4zm0-6h2v2H9V5z"/>
                                </svg>
                            </div>
                            <div>
                                <p class="font-bold">Session Expired</p>
                                <p class="text-sm">${data.message}</p>
                                <button onclick="location.reload()" class="mt-2 bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600">
                                    Refresh Page
                                </button>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(messageDiv);
                    
                    setTimeout(() => {
                        if (messageDiv.parentNode) {
                            messageDiv.parentNode.removeChild(messageDiv);
                        }
                    }, 10000);
                }
            });

            socket.on('auth_error', (data) => {
                console.error('Authentication error:', data.message);
                
                // Let token manager handle authentication errors
                if (window.tokenManager) {
                    window.tokenManager.handleRefreshFailure(data.message);
                } else {
                    console.error('Token manager not available, showing manual error');
                    // Show manual error notification as fallback
                    const messageDiv = document.createElement('div');
                    messageDiv.className = 'fixed top-4 right-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-lg z-50';
                    messageDiv.innerHTML = `
                        <div class="flex">
                            <div class="py-1">
                                <svg class="fill-current h-6 w-6 text-red-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                    <path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM9 11V9h2v6H9v-4zm0-6h2v2H9V5z"/>
                                </svg>
                            </div>
                            <div>
                                <p class="font-bold">Authentication Error</p>
                                <p class="text-sm">${data.message}</p>
                                <button onclick="location.href='/login'" class="mt-2 bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600">
                                    Login Again
                                </button>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(messageDiv);
                    
                    setTimeout(() => {
                        if (messageDiv.parentNode) {
                            messageDiv.parentNode.removeChild(messageDiv);
                        }
                    }, 10000);
                }
            });

            socket.on('new_message', (message) => {
                console.log('New message received:', message);
                if (currentRecipientId && 
                    (message.sender === currentRecipientId || message.receiver === userId)) {
                    addMessageToUI(message);
                    if (message.sender !== userId) {
                        markMessageAsRead(message._id);
                    }
                }
                loadConversations();
            });

            socket.on('conversation_updated', () => {
                loadConversations();
            });

            socket.on('user_typing', (data) => {
                if (data.userId === currentRecipientId) {
                    showTypingIndicator(data.isTyping);
                }
            });

            socket.on('message_read', (data) => {
                updateMessageStatus(data.messageId, 'read');
            });

            socket.on('reaction_added', (data) => {
                updateMessageReactions(data.messageId, data.reactions);
            });

        } catch (error) {
            console.error('Socket.io initialization error:', error);
        }
    }

    // Mobile keyboard and viewport handling
    function initializeMobileKeyboardHandling() {
        if (window.innerWidth >= 768) return; // Only on mobile
        
        const messageInput = document.getElementById('message-input');
        const messageContainer = document.getElementById('message-container');
        const chatArea = document.getElementById('chat-area');
        
        if (!messageInput || !messageContainer) return;
        
        // Handle keyboard show/hide on mobile
        let originalViewportHeight = window.innerHeight;
        
        // Store original viewport height
        const updateViewportHeight = () => {
            originalViewportHeight = window.innerHeight;
        };
        
        window.addEventListener('resize', updateViewportHeight);
        
        // Handle input focus (keyboard show)
        messageInput.addEventListener('focus', () => {
            console.log('📱 Mobile keyboard shown');
            
            // Wait for keyboard to appear
            setTimeout(() => {
                const currentViewportHeight = window.innerHeight;
                const heightDifference = originalViewportHeight - currentViewportHeight;
                
                if (heightDifference > 150) { // Keyboard is likely shown
                    console.log('📱 Keyboard detected, adjusting layout');
                    
                    // Adjust message container height for keyboard
                    if (chatArea && messageContainer) {
                        const headerHeight = 68; // Approximate header height
                        const inputHeight = 80; // Approximate input height
                        const safeAreaBottom = env(safe-area-inset-bottom) || 0;
                        
                        messageContainer.style.height = `${currentViewportHeight - headerHeight - inputHeight - safeAreaBottom}px`;
                        messageContainer.scrollTop = messageContainer.scrollHeight;
                    }
                }
            }, 300);
        });
        
        // Handle input blur (keyboard hide)
        messageInput.addEventListener('blur', () => {
            console.log('📱 Mobile keyboard hidden');
            
            // Reset message container height
            setTimeout(() => {
                if (messageContainer && chatArea) {
                    messageContainer.style.height = '';
                    messageContainer.scrollTop = messageContainer.scrollHeight;
                }
            }, 100);
        });
        
        // Handle visual viewport API if available
        if ('visualViewport' in window) {
            window.visualViewport.addEventListener('resize', () => {
                const viewport = window.visualViewport;
                const heightDifference = originalViewportHeight - viewport.height;
                
                if (messageContainer && chatArea) {
                    if (heightDifference > 150) { // Keyboard is shown
                        const headerHeight = 68;
                        const inputHeight = 80;
                        const safeAreaBottom = env(safe-area-inset-bottom) || 0;
                        
                        messageContainer.style.height = `${viewport.height - headerHeight - inputHeight - safeAreaBottom}px`;
                    } else {
                        messageContainer.style.height = '';
                    }
                    messageContainer.scrollTop = messageContainer.scrollHeight;
                }
            });
        }
    }
    
    // Helper function to get safe area inset
    function env(cssVar) {
        if (typeof CSS !== 'undefined' && CSS.supports && CSS.supports('env', cssVar)) {
            return parseInt(getComputedStyle(document.documentElement).getPropertyValue(cssVar)) || 0;
        }
        return 0;
    }
    
    // Initialize mobile keyboard handling
    if (window.innerWidth < 768) {
        initializeMobileKeyboardHandling();
    }
    
    // Handle orientation changes
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            if (window.innerWidth < 768) {
                initializeMobileKeyboardHandling();
            }
            
            // Scroll to bottom after orientation change
            if (messageContainer) {
                messageContainer.scrollTop = messageContainer.scrollHeight;
            }
        }, 500);
    });

    // Initialize mobile header visibility
    if (window.innerWidth < 768) {
        const mobileHeader = document.querySelector('.mobile-messages-header');
        const chatArea = document.getElementById('chat-area');
        
        // Show mobile header by default (conversation list view)
        if (mobileHeader) {
            mobileHeader.classList.remove('hidden');
        }
        
        // Hide chat area by default on mobile
        if (chatArea && !currentRecipientId) {
            chatArea.classList.add('hidden');
        }
    }

    // Load initial data
    loadConversations();

    // Helper function to start chat after conversations are loaded
    async function startChatAfterConversationsLoad(sellerId, orderId) {
        try {
            // Wait for conversations to load
            await loadConversations();
            console.log('Conversations loaded, starting chat...');
            
            // Now start the chat with proper context
            startChat(sellerId, 'Seller', '', orderId);
        } catch (error) {
            console.error('Error starting chat after conversations load:', error);
            // Fallback: start chat anyway if conversations loading fails
            startChat(sellerId, 'Seller', '', orderId);
        }
    }

    // Helper functions for real-time updates
    function addMessageToUI(message) {
        const isMine = message.sender === userId;
        const messageHtml = createMessageHTML(message, isMine);
        
        if (messageContainer) {
            messageContainer.insertAdjacentHTML('beforeend', messageHtml);
            
            // Smooth scroll to bottom on mobile
            if (window.innerWidth < 768) {
                setTimeout(() => {
                    messageContainer.scrollTo({
                        top: messageContainer.scrollHeight,
                        behavior: 'smooth'
                    });
                }, 100);
            } else {
                messageContainer.scrollTop = messageContainer.scrollHeight;
            }
        }
        
        // Mobile: Add haptic feedback if available
        if (window.innerWidth < 768 && navigator.vibrate) {
            navigator.vibrate(50); // Light vibration for new message
        }
    }

    function createMessageHTML(message, isMine) {
        const messageClass = isMine ? 'bg-navy text-white rounded-tr-none' : 'bg-white text-navy rounded-tl-none border border-gray-100';
        const mobileMessageClass = window.innerWidth < 768 ? 'mobile-message-bubble' : '';
        const isMobile = window.innerWidth < 768;
        
        return `
            <div class="flex ${isMine ? 'justify-end' : 'justify-start'} message-bubble ${mobileMessageClass}" data-message-id="${sanitizeHTML(message._id)}">
                <div class="max-w-[75%] ${isMobile ? 'max-w-[85%]' : 'md:max-w-[75%]'} p-3 ${isMobile ? 'p-4' : 'md:p-3'} rounded-2xl text-sm ${isMobile ? 'text-base' : 'md:text-sm'} shadow-sm ${messageClass} relative group message-content">
                    ${message.replyTo ? `
                        <div class="mb-2 p-2 bg-black bg-opacity-10 rounded text-xs ${isMobile ? 'opacity-70 mobile-reply-bubble' : 'md:text-xs opacity-70'}">
                            <p class="font-semibold">Replying to: ${sanitizeHTML(message.replyTo.content.substring(0, 50))}...</p>
                        </div>
                    ` : ''}
                    
                    ${message.product ? `
                        <div class="mb-2 p-2 bg-black bg-opacity-10 rounded-lg flex items-center gap-2 cursor-pointer ${isMobile ? 'mobile-product-bubble' : ''}" onclick="window.location.href='/product/${sanitizeHTML(message.product._id)}'">
                            <img src="${sanitizeHTML(fixServerUrl(message.product.images?.[0]))}" class="w-8 h-8 ${isMobile ? 'w-10 h-10' : 'md:w-8 md:h-8'} rounded object-cover">
                            <div class="min-w-0">
                                <p class="text-[10px] ${isMobile ? 'text-xs' : 'md:text-[10px]'} font-bold truncate">${sanitizeHTML(message.product.name)}</p>
                                <p class="text-[10px] ${isMobile ? 'text-xs' : 'md:text-[10px]'} opacity-70">ZMW ${sanitizeHTML(message.product.price)}</p>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${message.messageType === 'image' ? `
                        <div class="mb-2 ${isMobile ? 'mobile-image-bubble' : ''}">
                            <img src="${sanitizeHTML(fixServerUrl(message.fileUrl))}" class="max-w-full rounded cursor-pointer ${isMobile ? 'mobile-message-image' : ''}" onclick="window.open('${sanitizeHTML(fixServerUrl(message.fileUrl))}', '_blank')">
                        </div>
                    ` : ''}
                    
                    ${message.messageType === 'file' ? `
                        <div class="mb-2 p-2 bg-black bg-opacity-10 rounded flex items-center gap-2 cursor-pointer ${isMobile ? 'mobile-file-bubble' : ''}" onclick="window.open('${sanitizeHTML(message.fileUrl)}', '_blank')">
                            <svg class="w-4 h-4 ${isMobile ? 'w-5 h-5' : 'md:w-4 md:h-4'}" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                                <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 102 0V3h4v1a1 1 0 102 0V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
                            </svg>
                            <div class="min-w-0">
                                <p class="text-[10px] ${isMobile ? 'text-xs' : 'md:text-[10px]'} font-bold truncate">${sanitizeHTML(message.fileName)}</p>
                                <p class="text-[10px] ${isMobile ? 'text-xs' : 'md:text-[10px]'} opacity-70">${formatFileSize(message.fileSize)}</p>
                            </div>
                        </div>
                    ` : ''}
                    
                    <p class="break-words ${isMobile ? 'mobile-message-text' : ''}">${sanitizeHTML(message.content)}</p>
                    
                    <div class="flex items-center justify-between mt-2 ${isMobile ? 'md:mt-1 mobile-message-meta' : 'md:mt-1'}">
                        <span class="text-[10px] ${isMobile ? 'text-xs mobile-message-time' : 'md:text-[10px] text-xs opacity-50'}">${formatTime(message.createdAt)}</span>
                        <div class="flex items-center gap-1">
                            ${message.isEdited ? `<span class="text-[8px] ${isMobile ? 'text-xs mobile-message-edited' : 'md:text-[8px] text-xs opacity-50 italic'}">edited</span>` : ''}
                            ${isMine ? `
                                <span class="text-[10px] ${isMobile ? 'text-xs mobile-message-status' : 'md:text-[10px] text-xs opacity-50 message-status'}" data-message-id="${message._id}">${message.status === 'read' ? '✓✓' : message.status === 'delivered' ? '✓' : ''}</span>
                            ` : ''}
                        </div>
                    </div>
                    
                    ${message.reactions && message.reactions.length > 0 ? `
                        <div class="flex flex-wrap gap-1 mt-2 ${isMobile ? 'message-reactions mobile-message-reactions' : 'md:mt-2 message-reactions'}" data-message-id="${message._id}">
                            ${message.reactions.map(r => `
                                <span class="text-xs ${isMobile ? 'text-sm mobile-reaction' : 'md:text-xs'} bg-black bg-opacity-10 px-1 ${isMobile ? 'px-2' : 'md:px-1'} py-1 rounded cursor-pointer hover:bg-opacity-20" onclick="addReaction('${message._id}', '${r.emoji}')">${r.emoji}</span>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    ${!message.isDeleted && isMine ? `
                        <div class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 ${isMobile ? 'mobile-message-actions' : ''}">
                            <button onclick="editMessage('${message._id}', '${message.content.replace(/'/g, "\\'")}')" class="text-xs ${isMobile ? 'text-sm mobile-action-button' : 'md:text-xs text-sm'} bg-black bg-opacity-20 rounded px-1 ${isMobile ? 'px-2' : 'md:px-1'} py-1 hover:bg-opacity-30">✏️</button>
                            <button onclick="deleteMessage('${message._id}')" class="text-xs ${isMobile ? 'text-sm mobile-action-button' : 'md:text-xs text-sm'} bg-black bg-opacity-20 rounded px-1 ${isMobile ? 'px-2' : 'md:px-1'} py-1 hover:bg-opacity-30">🗑️</button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    function markMessageAsRead(messageId) {
        if (socketConnected && socket) {
            socket.emit('mark_read', messageId);
        }
    }

    function updateMessageStatus(messageId, status) {
        const statusElement = document.querySelector(`[data-message-id="${messageId}"].message-status`);
        if (statusElement) {
            statusElement.textContent = status === 'read' ? '✓✓' : status === 'delivered' ? '✓' : '';
        }
    }

    function updateMessageReactions(messageId, reactions) {
        const reactionsContainer = document.querySelector(`[data-message-id="${messageId}"].message-reactions`);
        if (reactionsContainer) {
            reactionsContainer.innerHTML = reactions.map(r => `
                <span class="text-xs bg-black bg-opacity-10 px-1 rounded cursor-pointer hover:bg-opacity-20" onclick="addReaction('${messageId}', '${r.emoji}')">${r.emoji}</span>
            `).join('');
        }
    }

    function showTypingIndicator(show) {
        if (typingIndicator) {
            typingIndicator.style.display = show ? 'block' : 'none';
            if (show) {
                typingIndicator.textContent = 'Someone is typing...';
                setTimeout(() => {
                    typingIndicator.style.display = 'none';
                }, 3000);
            }
        }
    }

    function updateUserOnlineStatus(userId, isOnline) {
        const userElement = document.querySelector(`[data-user-id="${userId}"]`);
        if (userElement) {
            const statusIndicator = userElement.querySelector('.online-status');
            if (statusIndicator) {
                statusIndicator.className = `online-status ${isOnline ? 'online' : 'offline'}`;
            }
        }
    }

    // Load conversations
    async function loadConversations() {
        console.log('Loading conversations...');
        try {
            if (!token) {
                console.log('No token - cannot load conversations');
                if (conversationList) {
                    conversationList.innerHTML = '<div class="p-8 text-center text-gray-400"><p>Please log in to see conversations</p></div>';
                }
                return;
            }

            console.log('Fetching conversations from API...');
            const response = await fetch(`${API_BASE}/messages/conversations`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            console.log('API response status:', response.status);
            
            if (response.ok) {
                const conversations = await response.json();
                console.log('Conversations loaded:', conversations);
                displayConversations(conversations);
            } else {
                console.error('Failed to load conversations:', response.status);
                const errorText = await response.text();
                console.error('Error details:', errorText);
                
                if (conversationList) {
                    conversationList.innerHTML = `
                        <div class="p-8 text-center text-gray-400">
                            <p>Failed to load conversations</p>
                            <p class="text-sm mt-2">Status: ${response.status}</p>
                            <p class="text-sm">Please try refreshing</p>
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
            
            if (conversationList) {
                conversationList.innerHTML = `
                    <div class="p-8 text-center text-gray-400">
                        <p>Error loading conversations</p>
                        <p class="text-sm mt-2">${error.message}</p>
                        <p class="text-sm">Please check your connection</p>
                    </div>
                `;
            }
        }
    }

    function displayConversations(conversations) {
        if (!conversationList) return;
        
        const isMobile = window.innerWidth < 768;
        
        if (conversations.length === 0) {
            if (isMobile) {
                conversationList.innerHTML = `
                    <div class="mobile-empty-state">
                        <i data-lucide="message-circle" class="mobile-empty-state-icon"></i>
                        <div class="mobile-empty-state-title">No conversations yet</div>
                        <div class="mobile-empty-state-text">Start messaging to see conversations here</div>
                    </div>
                `;
            } else {
                conversationList.innerHTML = '<div class="p-8 text-center text-gray-400"><p>No conversations yet. Start messaging to see conversations here.</p></div>';
            }
            return;
        }

        conversationList.innerHTML = conversations.map(c => `
            <div onclick="startChat('${c._id}', '${c.user.fullName}', '${c.user.profilePicture || ''}')" 
                 class="conversation-list-item p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-3 ${activeConversationId === c._id ? 'bg-orange-50' : ''} mobile-conversation-item"
                 data-user-id="${c._id}">
                <div class="w-12 h-12 md:w-12 md:h-12 w-14 h-14 rounded-full bg-gold bg-opacity-10 flex items-center justify-center font-bold text-gold relative overflow-hidden mobile-avatar">
                    ${c.user.profilePicture ? 
                        `<img src="${fixServerUrl(c.user.profilePicture)}" class="w-full h-full rounded-full object-cover">` : 
                        c.user.fullName.charAt(0)
                    }
                    ${c.user.isOnline ? '<div class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full mobile-online-indicator"></div>' : ''}
                </div>
                <div class="flex-grow min-w-0 mobile-conversation-content">
                    <div class="flex items-center justify-between mobile-conversation-header">
                        <h3 class="font-semibold text-gray-900 truncate mobile-conversation-name">${c.user.fullName}</h3>
                        <span class="text-xs text-gray-500 mobile-conversation-time">${formatTime(c.lastMessageTime)}</span>
                    </div>
                    <div class="flex items-center justify-between mt-1">
                        <p class="text-sm text-gray-600 truncate mobile-conversation-message">${c.lastMessage || 'No messages yet'}</p>
                        ${c.unreadCount > 0 ? `<span class="bg-gold text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center mobile-unread-badge">${c.unreadCount}</span>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
        
        // Re-initialize Lucide icons if available
        if (window.lucide) {
            window.lucide.createIcons();
        }
        
        // Add mobile-specific conversation list enhancements
        if (window.innerWidth < 768) {
            enhanceMobileConversationList();
        }
    }

    function enhanceMobileConversationList() {
        // Add touch feedback for conversation items
        const conversationItems = document.querySelectorAll('.mobile-conversation-item');
        
        conversationItems.forEach(item => {
            item.addEventListener('touchstart', function() {
                this.style.transform = 'scale(0.98)';
                this.style.transition = 'transform 0.1s ease';
            });
            
            item.addEventListener('touchend', function() {
                this.style.transform = 'scale(1)';
            });
            
            // Add swipe-to-delete functionality (optional)
            let startX = 0;
            let currentX = 0;
            
            item.addEventListener('touchstart', function(e) {
                startX = e.touches[0].clientX;
            }, { passive: true });
            
            item.addEventListener('touchmove', function(e) {
                currentX = e.touches[0].clientX;
                const diffX = startX - currentX;
                
                if (diffX > 50) { // Swipe left threshold
                    this.style.transform = `translateX(-${diffX}px)`;
                }
            }, { passive: true });
            
            item.addEventListener('touchend', function() {
                const diffX = startX - currentX;
                
                if (diffX > 100) { // Confirm swipe threshold
                    // Could add swipe-to-delete functionality here
                    console.log('Swipe to delete detected');
                }
                
                this.style.transform = 'translateX(0)';
                this.style.transition = 'transform 0.3s ease';
            });
        });
    }

    function showDemoConversations() {
        if (!conversationList) return;
        
        conversationList.innerHTML = `
            <div class="p-8 text-center text-gray-400">
                <p>✅ Conversations loaded!</p>
                <p class="text-sm mt-2">Authentication: ${token ? 'Logged in' : 'Demo mode'}</p>
                <p class="text-sm mt-2">User: ${userFullName || userEmail || 'Guest'}</p>
                <p class="text-sm mt-2">User ID: ${userId || 'Not available'}</p>
            </div>
            <div class="p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-3">
                <div class="w-12 h-12 rounded-full bg-gold bg-opacity-10 flex items-center justify-center font-bold text-gold">
                    JD
                </div>
                <div class="flex-grow min-w-0">
                    <div class="flex justify-between items-center mb-1">
                        <h4 class="font-bold text-navy truncate">John Doe</h4>
                        <span class="text-[10px] text-gray-400">10:30 AM</span>
                    </div>
                    <p class="text-xs text-gray-500 truncate">Hello! I'm interested in this product.</p>
                </div>
                <span class="bg-gold text-navy text-[10px] font-bold px-2 py-0.5 rounded-full">1</span>
            </div>
            <div class="p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-3">
                <div class="w-12 h-12 rounded-full bg-gold bg-opacity-10 flex items-center justify-center font-bold text-gold">
                    AS
                </div>
                <div class="flex-grow min-w-0">
                    <div class="flex justify-between items-center mb-1">
                        <h4 class="font-bold text-navy truncate">Alice Smith</h4>
                        <span class="text-[10px] text-gray-400">Yesterday</span>
                    </div>
                    <p class="text-xs text-gray-500 truncate">Thanks for your help!</p>
                </div>
            </div>
            <div class="p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-3">
                <div class="w-12 h-12 rounded-full bg-gold bg-opacity-10 flex items-center justify-center font-bold text-gold">
                    BJ
                </div>
                <div class="flex-grow min-w-0">
                    <div class="flex justify-between items-center mb-1">
                        <h4 class="font-bold text-navy truncate">Bob Johnson</h4>
                        <span class="text-[10px] text-gray-400">2 days ago</span>
                    </div>
                    <p class="text-xs text-gray-500 truncate">Is the book still available?</p>
                </div>
                <span class="bg-gold text-navy text-[10px] font-bold px-2 py-0.5 rounded-full">2</span>
            </div>
        `;
    }

    // Load messages
    async function loadMessages() {
        if (!currentRecipientId) return;

        console.log('Loading messages for recipient:', currentRecipientId);

        try {
            if (!token) {
                console.log('No token - cannot load messages');
                if (messageContainer) {
                    messageContainer.innerHTML = '<div class="text-center text-gray-400"><p>Please log in to view messages</p></div>';
                }
                return;
            }

            console.log('Fetching messages from API...');
            const response = await fetch(`${API_BASE}/messages/${currentRecipientId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            console.log('Messages API response status:', response.status);
            
            if (response.ok) {
                const messages = await response.json();
                console.log('Messages loaded:', messages);
                displayMessages(messages);
            } else {
                console.error('Failed to load messages:', response.status);
                const errorText = await response.text();
                console.error('Error details:', errorText);
                
                if (messageContainer) {
                    messageContainer.innerHTML = `
                        <div class="text-center text-gray-400">
                            <p>Failed to load messages</p>
                            <p class="text-sm mt-2">Status: ${response.status}</p>
                            <p class="text-sm">Please try refreshing</p>
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error('Error loading messages:', error);
            
            if (messageContainer) {
                messageContainer.innerHTML = `
                    <div class="text-center text-gray-400">
                        <p>Error loading messages</p>
                        <p class="text-sm mt-2">${error.message}</p>
                        <p class="text-sm">Please check your connection</p>
                    </div>
                `;
            }
        }
    }

    function displayMessages(messages) {
        if (!messageContainer) return;
        
        if (messages.length === 0) {
            messageContainer.innerHTML = '<div class="text-center text-gray-400">No messages yet. Start the conversation!</div>';
            return;
        }

        console.log('Displaying messages:', messages);
        console.log('Current userId:', userId);
        console.log('Current recipientId:', currentRecipientId);

        // Fallback: If userId is still undefined, try to determine it from messages
        if (!userId || userId === 'undefined') {
            console.log('🔄 Using fallback method to determine userId...');
            
            // Count messages from each sender
            const senderCounts = {};
            messages.forEach(m => {
                senderCounts[m.sender] = (senderCounts[m.sender] || 0) + 1;
            });
            
            console.log('Message sender counts:', senderCounts);
            
            // The current user is likely the one who sent messages to the recipient
            // or the one who received messages from the recipient
            const possibleUserIds = Object.keys(senderCounts).filter(senderId => {
                return senderId !== currentRecipientId;
            });
            
            if (possibleUserIds.length === 1) {
                userId = possibleUserIds[0];
                localStorage.setItem('userId', userId);
                console.log('✅ Determined userId from message analysis:', userId);
            } else {
                console.log('⚠️ Multiple possible userIds found:', possibleUserIds);
                // Default to the first sender that's not the recipient
                userId = possibleUserIds[0];
                localStorage.setItem('userId', userId);
                console.log('🔄 Defaulting to userId:', userId);
            }
        }

        messageContainer.innerHTML = messages.map(m => {
            const isMine = m.sender === userId;
            console.log(`Message from ${m.sender}, isMine: ${isMine}, userId: ${userId}`);
            return createMessageHTML(m, isMine);
        }).join('');

        messageContainer.scrollTop = messageContainer.scrollHeight;
        if (window.lucide) window.lucide.createIcons();
    }

    function showDemoMessages() {
        if (!messageContainer) return;
        
        messageContainer.innerHTML = `
            <div class="text-center text-gray-400 mb-4">
                <p>Please log in to send real messages</p>
                <p class="text-sm mt-2">This is a demo view. Actual messaging requires authentication.</p>
            </div>
            <div class="flex justify-start mb-4">
                <div class="max-w-[75%] p-3 rounded-2xl text-sm shadow-sm bg-white text-navy rounded-tl-none border border-gray-100">
                    <p class="break-words">Hello! I'm interested in this product.</p>
                    <span class="text-[10px] opacity-50">10:30 AM</span>
                </div>
            </div>
            <div class="flex justify-end mb-4">
                <div class="max-w-[75%] p-3 rounded-2xl text-sm shadow-sm bg-navy text-white rounded-tr-none">
                    <p class="break-words">Hi! I'd be happy to help you with that.</p>
                    <span class="text-[10px] opacity-50">10:32 AM</span>
                </div>
            </div>
        `;
    }

    // Send message function
    async function sendMessage(content, orderId = null) {
        if (!token || !currentRecipientId) {
            console.error('Cannot send message: missing authentication or recipient');
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    receiverId: currentRecipientId,
                    content,
                    productId: currentProductId || undefined,
                    orderId: orderId || currentOrderId || undefined
                })
            });

            if (response.ok) {
                const message = await response.json();
                console.log('Message sent successfully:', message);
                
                // Clear input and reload messages
                if (messageInput) {
                    messageInput.value = '';
                }
                await loadMessages();
                loadConversations();
                stopTyping();
                
                // Mobile: Focus back to input and scroll to bottom
                if (window.innerWidth < 768) {
                    setTimeout(() => {
                        if (messageInput) messageInput.focus();
                        if (messageContainer) messageContainer.scrollTop = messageContainer.scrollHeight;
                    }, 100);
                }
                
                return message;
            } else {
                console.error('Failed to send message:', response.status);
                showToast('Failed to send message', 'error');
                return null;
            }
        } catch (error) {
            console.error('Error sending message:', error);
            showToast('Error sending message', 'error');
            return null;
        }
    }

    // Message form handler
    messageForm.onsubmit = async (e) => {
        e.preventDefault();
        const content = messageInput.value.trim();
        if (!content || !currentRecipientId) return;

        if (!token) {
            showToast('Please log in to send messages', 'error');
            return;
        }

        await sendMessage(content);
    };

    // Mobile-specific input enhancements
    if (window.innerWidth < 768) {
        // Prevent zoom on focus for iOS
        messageInput.addEventListener('touchstart', function(e) {
            this.style.fontSize = '16px';
        });

        // Handle keyboard appearance/disappearance
        let originalViewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => {
                const currentHeight = window.visualViewport.height;
                const heightDiff = originalViewportHeight - currentHeight;
                
                if (heightDiff > 150) { // Keyboard is likely visible
                    // Adjust chat container height
                    const chatArea = document.getElementById('chat-area');
                    if (chatArea) {
                        chatArea.style.height = `calc(100vh - ${currentHeight + 100}px)`;
                    }
                    
                    // Scroll to bottom
                    setTimeout(() => {
                        if (messageContainer) {
                            messageContainer.scrollTop = messageContainer.scrollHeight;
                        }
                    }, 300);
                } else { // Keyboard is hidden
                    // Reset chat container height
                    const chatArea = document.getElementById('chat-area');
                    if (chatArea) {
                        chatArea.style.height = '';
                    }
                }
            });
        }

        // Handle input focus on mobile
        messageInput.addEventListener('focus', () => {
            // Scroll to bottom when input is focused
            setTimeout(() => {
                if (messageContainer) {
                    messageContainer.scrollTop = messageContainer.scrollHeight;
                }
            }, 300);
        });

        // Add touch-friendly emoji picker positioning
        if (emojiButton && emojiPicker) {
            emojiButton.addEventListener('click', (e) => {
                e.preventDefault();
                const rect = emojiButton.getBoundingClientRect();
                const pickerHeight = 200; // Approximate height of emoji picker
                
                // Position emoji picker above the input area on mobile
                emojiPicker.style.bottom = '60px';
                emojiPicker.style.left = '12px';
                emojiPicker.style.right = '12px';
                emojiPicker.style.position = 'fixed';
                emojiPicker.classList.toggle('hidden');
            });
        }

        // Mobile file input handling
        const fileButton = document.getElementById('file-button');
        const fileInput = document.getElementById('file-input');
        
        if (fileButton && fileInput) {
            fileButton.addEventListener('click', (e) => {
                e.preventDefault();
                fileInput.click();
            });
        }
    }

    // Typing indicator
    messageInput?.addEventListener('input', () => {
        if (!currentRecipientId) return;

        if (!isTyping) {
            isTyping = true;
            if (socketConnected && socket) {
                socket.emit('typing', { receiverId: currentRecipientId, isTyping: true });
            }
        }

        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            stopTyping();
        }, 1000);
    });

    function stopTyping() {
        if (isTyping) {
            isTyping = false;
            if (socketConnected && socket) {
                socket.emit('typing', { receiverId: currentRecipientId, isTyping: false });
            }
        }
        clearTimeout(typingTimeout);
    }

    // Helper functions
    window.showSidebar = () => {
        const sidebar = document.getElementById('sidebar');
        const chatArea = document.getElementById('chat-area');
        const mobileHeader = document.querySelector('.mobile-messages-header');
        const mobileTitle = mobileHeader?.querySelector('h1');
        
        if (sidebar) {
            sidebar.classList.remove('hidden');
            if (chatArea) chatArea.classList.add('hidden');
            
            // Mobile: Add slide-in animation and update header
            if (window.innerWidth < 768) {
                sidebar.style.transform = 'translateX(0)';
                sidebar.style.transition = 'transform 0.3s ease';
                
                // Update mobile header title to show "Conversations"
                if (mobileTitle) {
                    mobileTitle.textContent = 'Conversations';
                }
                
                // Close mobile menu if it's open
                const mobileMenu = document.querySelector('.mobile-menu-content');
                const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
                if (mobileMenu) mobileMenu.classList.remove('active');
                if (mobileMenuOverlay) mobileMenuOverlay.classList.add('hidden');
            }
        }
    };

    // Mobile gesture support
    function initializeMobileGestures() {
        if (window.innerWidth >= 768) return;
        
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;
        
        const chatAreaElement = document.getElementById('chat-area');
        const sidebarElement = document.getElementById('sidebar');
        
        if (chatAreaElement) {
            chatAreaElement.addEventListener('touchstart', function(e) {
                touchStartX = e.changedTouches[0].screenX;
                touchStartY = e.changedTouches[0].screenY;
            }, { passive: true });
            
            chatAreaElement.addEventListener('touchend', function(e) {
                touchEndX = e.changedTouches[0].screenX;
                touchEndY = e.changedTouches[0].screenY;
                handleSwipeGesture();
            }, { passive: true });
        }
        
        function handleSwipeGesture() {
            const swipeThreshold = 50;
            const deltaX = touchEndX - touchStartX;
            const deltaY = Math.abs(touchEndY - touchStartY);
            
            // Only handle horizontal swipes with minimal vertical movement
            if (Math.abs(deltaX) > swipeThreshold && deltaY < 100) {
                if (deltaX > 0) {
                    // Swipe right - show sidebar
                    showSidebar();
                    if (navigator.vibrate) {
                        navigator.vibrate(30);
                    }
                }
            }
        }
        
        // Pull-to-refresh for conversation list
        let pullStartY = 0;
        let isPulling = false;
        
        if (conversationList) {
            conversationList.addEventListener('touchstart', function(e) {
                if (conversationList.scrollTop === 0) {
                    pullStartY = e.touches[0].screenY;
                    isPulling = true;
                }
            }, { passive: true });
            
            conversationList.addEventListener('touchmove', function(e) {
                if (!isPulling) return;
                
                const currentY = e.touches[0].screenY;
                const pullDistance = currentY - pullStartY;
                
                if (pullDistance > 0 && pullDistance < 150) {
                    conversationList.style.transform = `translateY(${pullDistance * 0.5}px)`;
                }
            }, { passive: true });
            
            conversationList.addEventListener('touchend', function(e) {
                if (!isPulling) return;
                
                const currentY = e.changedTouches[0].screenY;
                const pullDistance = currentY - pullStartY;
                
                conversationList.style.transform = '';
                conversationList.style.transition = 'transform 0.3s ease';
                
                if (pullDistance > 100) {
                    // Refresh conversations
                    loadConversations();
                    if (navigator.vibrate) {
                        navigator.vibrate([50, 50, 50]);
                    }
                }
                
                setTimeout(() => {
                    conversationList.style.transition = '';
                    isPulling = false;
                }, 300);
            }, { passive: true });
        }
    }

    // Mobile navigation improvements
    function enhanceMobileNavigation() {
        // Add back button functionality for mobile
        const backButton = document.querySelector('[onclick="showSidebar()"]');
        if (backButton && window.innerWidth < 768) {
            backButton.addEventListener('click', function() {
                // Add haptic feedback
                if (navigator.vibrate) {
                    navigator.vibrate(30);
                }
            });
        }
        
        // Optimize scrolling performance
        if (messageContainer) {
            messageContainer.style.overflowScrolling = 'touch';
            messageContainer.style.webkitOverflowScrolling = 'touch';
        }
        
        if (conversationList) {
            conversationList.style.overflowScrolling = 'touch';
            conversationList.style.webkitOverflowScrolling = 'touch';
        }
    }

    // Initialize mobile enhancements
    if (window.innerWidth < 768) {
        initializeMobileGestures();
        enhanceMobileNavigation();
    }

    // Handle orientation changes
    window.addEventListener('orientationchange', function() {
        setTimeout(() => {
            if (window.innerWidth < 768) {
                initializeMobileGestures();
                enhanceMobileNavigation();
            }
            
            // Adjust chat container height after orientation change
            if (messageContainer) {
                messageContainer.scrollTop = messageContainer.scrollHeight;
            }
        }, 500);
    });

    // Handle resize events
    window.addEventListener('resize', function() {
        // Re-initialize mobile features if crossing breakpoint
        if (window.innerWidth < 768) {
            initializeMobileGestures();
            enhanceMobileNavigation();
        }
    });

    window.addReactionToInput = (emoji) => {
        if (messageInput) {
            messageInput.value += emoji;
            if (emojiPicker) emojiPicker.classList.add('hidden');
            messageInput.focus();
        }
    };

    // Close emoji picker when clicking outside
    document.addEventListener('click', (e) => {
        if (emojiButton && emojiPicker && !emojiButton.contains(e.target) && !emojiPicker.contains(e.target)) {
            emojiPicker.classList.add('hidden');
        }
    });

    function formatTime(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Global functions for message actions
    window.editMessage = async (messageId, currentContent) => {
        const newContent = prompt('Edit message:', currentContent);
        if (!newContent || newContent === currentContent) return;

        try {
            const response = await fetch(`${API_BASE}/messages/${messageId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content: newContent })
            });

            if (response.ok) {
                loadMessages();
            }
        } catch (error) {
            console.error('Error editing message:', error);
        }
    };

    window.deleteMessage = async (messageId) => {
        if (!confirm('Are you sure you want to delete this message?')) return;

        try {
            const response = await fetch(`${API_BASE}/messages/${messageId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                loadMessages();
                loadConversations();
            }
        } catch (error) {
            console.error('Error deleting message:', error);
        }
    };

    window.addReaction = async (messageId, emoji) => {
        if (socketConnected && socket) {
            socket.emit('add_reaction', { messageId, emoji });
        } else {
            // Fallback to HTTP
            try {
                const response = await fetch(`${API_BASE}/messages/${messageId}/reactions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ emoji })
                });

                if (response.ok) {
                    loadMessages();
                }
            } catch (error) {
                console.error('Error adding reaction:', error);
            }
        }
    };

    // Mobile Header Initialization
    function initializeMobileHeader() {
        if (window.innerWidth >= 768) return; // Only on mobile
        
        const mobileHeader = document.querySelector('.mobile-messages-header');
        const siteHeader = document.querySelector('.site-header');
        const chatArea = document.getElementById('chat-area');
        const sidebar = document.getElementById('sidebar');
        const messageContainer = document.getElementById('message-container');
        const mobileMenu = document.querySelector('.mobile-menu-content');
        const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
        
        // Show mobile header, hide site header on mobile
        if (mobileHeader) mobileHeader.classList.remove('hidden');
        if (siteHeader) siteHeader.classList.add('hidden');
        
        // Handle mobile menu button
        const menuButton = document.getElementById('mobile-menu-button');
        if (menuButton) {
            menuButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Menu button clicked');
                
                if (mobileMenu) {
                    const isActive = mobileMenu.classList.contains('active');
                    console.log('Menu active state:', isActive);
                    
                    if (isActive) {
                        mobileMenu.classList.remove('active');
                        if (mobileMenuOverlay) {
                            mobileMenuOverlay.classList.add('hidden');
                        }
                    } else {
                        mobileMenu.classList.add('active');
                        if (mobileMenuOverlay) {
                            mobileMenuOverlay.classList.remove('hidden');
                        }
                    }
                }
            });
        }
        
        // Handle menu overlay click
        if (mobileMenuOverlay) {
            mobileMenuOverlay.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Overlay clicked');
                
                if (mobileMenu) {
                    mobileMenu.classList.remove('active');
                    mobileMenuOverlay.classList.add('hidden');
                }
            });
        }
        
        // Fix scrolling behavior
        fixMobileScrolling();
        
        // Auto-scroll to bottom when new messages are added
        observeNewMessages();
        
        // Handle resize
        window.addEventListener('resize', () => {
            if (window.innerWidth >= 768) {
                // Desktop: show site header, hide mobile header
                if (mobileHeader) mobileHeader.classList.add('hidden');
                if (siteHeader) siteHeader.classList.remove('hidden');
                document.body.style.overflow = '';
                document.body.style.position = '';
                if (mobileMenu) mobileMenu.classList.remove('active');
                if (mobileMenuOverlay) mobileMenuOverlay.classList.add('hidden');
            } else {
                // Mobile: show mobile header, hide site header
                if (mobileHeader) mobileHeader.classList.remove('hidden');
                if (siteHeader) siteHeader.classList.add('hidden');
                fixMobileScrolling();
            }
        });
    }
    
    function observeNewMessages() {
        const messageContainer = document.getElementById('message-container');
        if (!messageContainer) return;
        
        // Create a MutationObserver to watch for new messages
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Auto-scroll to bottom when new messages are added
                    setTimeout(() => {
                        messageContainer.scrollTop = messageContainer.scrollHeight;
                    }, 100);
                }
            });
        });
        
        observer.observe(messageContainer, {
            childList: true,
            subtree: true
        });
    }
    
    function fixMobileScrolling() {
        const messageContainer = document.getElementById('message-container');
        const conversationList = document.getElementById('conversation-list');
        const mobileMenu = document.querySelector('.mobile-menu-content');
        const chatArea = document.getElementById('chat-area');
        const inputArea = document.getElementById('input-area');
        
        // Prevent body scroll, allow individual containers to scroll
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.overscrollBehavior = 'none';
        
        // Enable touch scrolling for message containers with improved behavior
        if (messageContainer) {
            messageContainer.style.overflowY = 'auto';
            messageContainer.style.webkitOverflowScrolling = 'touch';
            messageContainer.style.overscrollBehavior = 'contain';
            
            // Add padding to bottom to ensure last message is visible
            messageContainer.style.paddingBottom = '20px';
            
            // Improved scroll prevention - only prevent at very edges
            messageContainer.addEventListener('touchmove', function(e) {
                const scrollTop = messageContainer.scrollTop;
                const scrollHeight = messageContainer.scrollHeight;
                const clientHeight = messageContainer.clientHeight;
                const tolerance = 5; // Small tolerance for natural scrolling
                
                // Only prevent elastic scrolling at extreme edges
                if ((scrollTop <= tolerance && e.deltaY < 0) || 
                    (scrollTop + clientHeight >= scrollHeight - tolerance && e.deltaY > 0)) {
                    e.preventDefault();
                }
            }, { passive: false });
            
            // Auto-scroll to bottom on load
            setTimeout(() => {
                messageContainer.scrollTop = messageContainer.scrollHeight;
            }, 500);
            
            // Add scroll to input functionality
            addScrollToInputFunctionality(messageContainer, inputArea);
        }
        
        if (conversationList) {
            conversationList.style.overflowY = 'auto';
            conversationList.style.webkitOverflowScrolling = 'touch';
            conversationList.style.overscrollBehavior = 'contain';
            
            // Improved scroll prevention for conversation list
            conversationList.addEventListener('touchmove', function(e) {
                const scrollTop = conversationList.scrollTop;
                const scrollHeight = conversationList.scrollHeight;
                const clientHeight = conversationList.clientHeight;
                const tolerance = 5;
                
                if ((scrollTop <= tolerance && e.deltaY < 0) || 
                    (scrollTop + clientHeight >= scrollHeight - tolerance && e.deltaY > 0)) {
                    e.preventDefault();
                }
            }, { passive: false });
        }
        
        // Fix mobile menu scrolling
        if (mobileMenu) {
            mobileMenu.style.overscrollBehavior = 'contain';
            
            mobileMenu.addEventListener('touchmove', function(e) {
                const scrollTop = mobileMenu.scrollTop;
                const scrollHeight = mobileMenu.scrollHeight;
                const clientHeight = mobileMenu.clientHeight;
                const tolerance = 5;
                
                if ((scrollTop <= tolerance && e.deltaY < 0) || 
                    (scrollTop + clientHeight >= scrollHeight - tolerance && e.deltaY > 0)) {
                    e.preventDefault();
                }
            }, { passive: false });
        }
        
        // Ensure input area is accessible
        if (inputArea && chatArea) {
            // Make sure chat area layout allows input area to be visible
            chatArea.style.display = 'flex';
            chatArea.style.flexDirection = 'column';
            
            // Add scroll to input functionality
            const scrollToInput = () => {
                setTimeout(() => {
                    inputArea.scrollIntoView({ behavior: 'smooth', block: 'end' });
                }, 100);
            };
            
            // Auto-scroll to input when focusing
            const messageInput = document.getElementById('message-input');
            if (messageInput) {
                messageInput.addEventListener('focus', scrollToInput);
            }
        }
        
        // Handle touch events for swipe gestures
        let touchStartY = 0;
        let touchEndY = 0;
        
        document.addEventListener('touchstart', (e) => {
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });
        
        document.addEventListener('touchend', (e) => {
            touchEndY = e.changedTouches[0].screenY;
            handleSwipeGesture(touchStartY, touchEndY);
        }, { passive: true });
    }
    
    function addScrollToInputFunctionality(messageContainer, inputArea) {
        if (!messageContainer || !inputArea) return;
        
        // Add automatic input widget
        const inputWidget = document.createElement('button');
        inputWidget.id = 'auto-input-widget';
        inputWidget.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 2.59 5.14L12 22l-6.59-3.72L2 14.14l5-4.87 3.09-6.26L12 2z"/>
            </svg>
        `;
        inputWidget.style.cssText = `
            position: fixed;
            bottom: 100px;
            right: 16px;
            width: 44px;
            height: 44px;
            background: #0A1128;
            color: #FFD700;
            border: none;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            z-index: 50;
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.3s ease;
            cursor: pointer;
        `;
        
        document.body.appendChild(inputWidget);
        
        // Show/hide input widget based on scroll position
        const updateInputWidget = () => {
            const scrollTop = messageContainer.scrollTop;
            const scrollHeight = messageContainer.scrollHeight;
            const clientHeight = messageContainer.clientHeight;
            const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50;
            
            if (isAtBottom) {
                inputWidget.style.opacity = '0';
                inputWidget.style.transform = 'translateY(20px)';
                inputWidget.style.pointerEvents = 'none';
            } else {
                inputWidget.style.opacity = '1';
                inputWidget.style.transform = 'translateY(0)';
                inputWidget.style.pointerEvents = 'auto';
            }
        };
        
        // Auto input functionality
        inputWidget.addEventListener('click', () => {
            console.log('Auto input widget clicked');
            
            // First scroll to bottom of message container
            if (messageContainer) {
                messageContainer.scrollTop = messageContainer.scrollHeight;
            }
            
            // Then scroll input area into view with better positioning
            setTimeout(() => {
                if (inputArea) {
                    // Get input area position
                    const inputRect = inputArea.getBoundingClientRect();
                    const viewportHeight = window.innerHeight;
                    
                    // Calculate scroll position to show input field with some padding
                    const targetScrollY = window.pageYOffset + inputRect.top - (viewportHeight - inputRect.height - 100);
                    
                    window.scrollTo({
                        top: targetScrollY,
                        behavior: 'smooth'
                    });
                }
                
                // Focus input field and open keyboard after scrolling
                setTimeout(() => {
                    const messageInput = document.getElementById('message-input');
                    if (messageInput) {
                        messageInput.focus();
                        
                        // Trigger keyboard on mobile
                        if (messageInput.scrollIntoView) {
                            messageInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                        
                        // Force keyboard to show on mobile
                        if ('virtualKeyboard' in navigator) {
                            navigator.virtualKeyboard.show();
                        }
                        
                        console.log('Input field focused and keyboard triggered');
                    }
                }, 500);
            }, 100);
        });
        
        // Listen for scroll events
        messageContainer.addEventListener('scroll', updateInputWidget);
        
        // Initial check
        updateInputWidget();
        
        // Also add keyboard shortcut
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Down arrow triggers auto input
            if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowDown') {
                e.preventDefault();
                console.log('Keyboard shortcut triggered');
                
                // First scroll to bottom of message container
                if (messageContainer) {
                    messageContainer.scrollTop = messageContainer.scrollHeight;
                }
                
                // Then scroll input area into view with better positioning
                setTimeout(() => {
                    if (inputArea) {
                        const inputRect = inputArea.getBoundingClientRect();
                        const viewportHeight = window.innerHeight;
                        const targetScrollY = window.pageYOffset + inputRect.top - (viewportHeight - inputRect.height - 100);
                        
                        window.scrollTo({
                            top: targetScrollY,
                            behavior: 'smooth'
                        });
                    }
                    
                    // Focus input field and open keyboard after scrolling
                    setTimeout(() => {
                        const messageInput = document.getElementById('message-input');
                        if (messageInput) {
                            messageInput.focus();
                            
                            // Trigger keyboard on mobile
                            if (messageInput.scrollIntoView) {
                                messageInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                            
                            // Force keyboard to show on mobile
                            if ('virtualKeyboard' in navigator) {
                                navigator.virtualKeyboard.show();
                            }
                            
                            console.log('Input field focused and keyboard triggered via keyboard');
                        }
                    }, 500);
                }, 100);
            }
        });
        
        // Auto-trigger when user scrolls up significantly
        let scrollTimeout;
        messageContainer.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                const scrollTop = messageContainer.scrollTop;
                const scrollHeight = messageContainer.scrollHeight;
                const clientHeight = messageContainer.clientHeight;
                const scrollPercentage = scrollTop / (scrollHeight - clientHeight);
                
                // Auto-trigger input if user scrolls up more than 30%
                if (scrollPercentage < 0.7) {
                    console.log('Auto-triggering input due to scroll up');
                    
                    // Scroll to bottom and focus input
                    messageContainer.scrollTop = messageContainer.scrollHeight;
                    
                    setTimeout(() => {
                        const messageInput = document.getElementById('message-input');
                        if (messageInput) {
                            messageInput.focus();
                            
                            // Trigger keyboard on mobile
                            if (messageInput.scrollIntoView) {
                                messageInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                            
                            // Force keyboard to show on mobile
                            if ('virtualKeyboard' in navigator) {
                                navigator.virtualKeyboard.show();
                            }
                        }
                    }, 300);
                }
            }, 1000); // Wait 1 second after scroll stops
        });
    }
    
    function handleSwipeGesture(startY, endY) {
        const swipeThreshold = 50;
        const deltaY = startY - endY;
        
        // Handle vertical swipes for scrolling
        if (Math.abs(deltaY) > swipeThreshold) {
            // Allow natural scrolling behavior
            return;
        }
    }

    console.log('Messages initialization complete');
});
