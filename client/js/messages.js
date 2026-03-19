// Messages JavaScript
// API_BASE is provided by config.js

// Helper function to fix URLs to point to server
function fixServerUrl(url) {
    if (!url) return url;
    return url.startsWith('/') ? `${API_BASE}${url}` : url;
}

// Make the helper function globally available
window.fixServerUrl = fixServerUrl;

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
        console.log('🔍 Attempting to parse token...');
        console.log('Token length:', token.length);
        console.log('Token parts:', token.split('.').length);
        
        try {
            const parts = token.split('.');
            if (parts.length !== 3) {
                throw new Error('Invalid JWT format - should have 3 parts');
            }
            
            const base64Url = parts[1];
            console.log('Base64URL payload:', base64Url.substring(0, 50) + '...');
            
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            const decoded = JSON.parse(jsonPayload);
            
            console.log('✅ Successfully decoded token:', decoded);
            
            // Try different possible userId field names
            userId = decoded.userId || decoded.id || decoded._id || decoded.sub;
            
            if (userId) {
                localStorage.setItem('userId', userId);
                console.log('✅ Extracted userId from token:', userId);
            } else {
                console.error('❌ No userId field found in token. Available fields:', Object.keys(decoded));
            }
            
        } catch (e) {
            console.error('❌ Error parsing token for userId:', e);
            console.log('Token structure:', token.split('.').map((part, i) => `Part ${i}: ${part.substring(0, 50)}...`).join(' | '));
            
            // As a fallback, try to get userId from the first message sender
            console.log('🔄 Attempting fallback method...');
        }
    } else if (userId && userId !== 'undefined') {
        console.log('✅ Using stored userId:', userId);
    } else {
        console.error('❌ No userId available and no token to parse');
    }
    
    // Get URL parameters immediately
    const urlParams = new URLSearchParams(window.location.search);
    let currentRecipientId = urlParams.get('recipientId');
    const currentProductId = urlParams.get('productId');
    
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
    window.startChat = async (recipientId, recipientName, recipientProfilePicture) => {
        console.log('🚀 startChat called with:', { recipientId, recipientName, recipientProfilePicture });
        
        currentRecipientId = recipientId;
        activeConversationId = recipientId;

        // Join socket room for real-time messaging
        if (socketConnected && socket) {
            socket.emit('join_conversation', recipientId);
        }

        // Mobile UI handle
        if (window.innerWidth < 768) {
            sidebar.classList.add('hidden');
            chatArea.classList.remove('hidden');
            chatArea.classList.add('flex');
            
            // Update mobile header title
            const mobileTitle = document.querySelector('.mobile-messages-header h1');
            if (mobileTitle && recipientName) {
                mobileTitle.textContent = recipientName;
            }
        } else {
            chatArea.classList.remove('hidden');
            chatArea.classList.add('flex');
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
                                <button onclick="location.href='/login.html'" class="mt-2 bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600">
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

    // Load initial data
    loadConversations();

        // Helper functions for real-time updates
    function addMessageToUI(message) {
        const isMine = message.sender === userId;
        const messageHtml = createMessageHTML(message, isMine);
        messageContainer.insertAdjacentHTML('beforeend', messageHtml);
        messageContainer.scrollTop = messageContainer.scrollHeight;
        
        // Mobile: Add haptic feedback if available
        if (window.innerWidth < 768 && navigator.vibrate) {
            navigator.vibrate(50); // Light vibration for new message
        }
    }

    function createMessageHTML(message, isMine) {
        const messageClass = isMine ? 'bg-navy text-white rounded-tr-none' : 'bg-white text-navy rounded-tl-none border border-gray-100';
        const mobileMessageClass = window.innerWidth < 768 ? 'mobile-message-bubble' : '';
        
        return `
            <div class="flex ${isMine ? 'justify-end' : 'justify-start'} message-bubble ${mobileMessageClass}" data-message-id="${message._id}">
                <div class="max-w-[75%] md:max-w-[75%] max-mobile-w-[85%] p-3 md:p-3 p-4 rounded-2xl text-sm md:text-sm text-base shadow-sm ${messageClass} relative group message-content">
                    ${message.replyTo ? `
                        <div class="mb-2 p-2 bg-black bg-opacity-10 rounded text-xs md:text-xs opacity-70 mobile-reply-bubble">
                            <p class="font-semibold">Replying to: ${message.replyTo.content.substring(0, 50)}...</p>
                        </div>
                    ` : ''}
                    
                    ${message.product ? `
                        <div class="mb-2 p-2 bg-black bg-opacity-10 rounded-lg flex items-center gap-2 cursor-pointer mobile-product-bubble" onclick="window.location.href='/pages/product-detail.html?id=${message.product._id}'">
                            <img src="${message.product.images?.[0]}" class="w-8 h-8 md:w-8 md:h-8 w-10 h-10 rounded object-cover">
                            <div class="min-w-0">
                                <p class="text-[10px] md:text-[10px] text-xs font-bold truncate">${message.product.name}</p>
                                <p class="text-[10px] md:text-[10px] text-xs opacity-70">ZMW ${message.product.price}</p>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${message.messageType === 'image' ? `
                        <div class="mb-2 mobile-image-bubble">
                            <img src="${fixServerUrl(message.fileUrl)}" class="max-w-full rounded cursor-pointer mobile-message-image" onclick="window.open('${fixServerUrl(message.fileUrl)}', '_blank')">
                        </div>
                    ` : ''}
                    
                    ${message.messageType === 'file' ? `
                        <div class="mb-2 p-2 bg-black bg-opacity-10 rounded flex items-center gap-2 cursor-pointer mobile-file-bubble" onclick="window.open('${message.fileUrl}', '_blank')">
                            <svg class="w-4 h-4 md:w-4 md:h-4 w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                                <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 102 0V3h4v1a1 1 0 102 0V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
                            </svg>
                            <div class="min-w-0">
                                <p class="text-[10px] md:text-[10px] text-xs font-bold truncate">${message.fileName}</p>
                                <p class="text-[10px] md:text-[10px] text-xs opacity-70">${formatFileSize(message.fileSize)}</p>
                            </div>
                        </div>
                    ` : ''}
                    
                    <p class="break-words mobile-message-text">${message.content}</p>
                    
                    <div class="flex items-center justify-between mt-2 md:mt-1 mobile-message-meta">
                        <span class="text-[10px] md:text-[10px] text-xs opacity-50 mobile-message-time">${formatTime(message.createdAt)}</span>
                        <div class="flex items-center gap-1">
                            ${message.isEdited ? '<span class="text-[8px] md:text-[8px] text-xs opacity-50 italic mobile-message-edited">edited</span>' : ''}
                            ${isMine ? `
                                <span class="text-[10px] md:text-[10px] text-xs opacity-50 message-status mobile-message-status" data-message-id="${message._id}">${message.status === 'read' ? '✓✓' : message.status === 'delivered' ? '✓' : ''}</span>
                            ` : ''}
                        </div>
                    </div>
                    
                    ${message.reactions && message.reactions.length > 0 ? `
                        <div class="flex flex-wrap gap-1 mt-2 md:mt-2 message-reactions mobile-message-reactions" data-message-id="${message._id}">
                            ${message.reactions.map(r => `
                                <span class="text-xs md:text-xs text-sm bg-black bg-opacity-10 px-1 md:px-1 px-2 py-1 rounded cursor-pointer hover:bg-opacity-20 mobile-reaction" onclick="addReaction('${message._id}', '${r.emoji}')">${r.emoji}</span>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    ${!message.isDeleted && isMine ? `
                        <div class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 mobile-message-actions">
                            <button onclick="editMessage('${message._id}', '${message.content.replace(/'/g, "\\'")}')" class="text-xs md:text-xs text-sm bg-black bg-opacity-20 rounded px-1 md:px-1 px-2 py-1 hover:bg-opacity-30 mobile-action-button">✏️</button>
                            <button onclick="deleteMessage('${message._id}')" class="text-xs md:text-xs text-sm bg-black bg-opacity-20 rounded px-1 md:px-1 px-2 py-1 hover:bg-opacity-30 mobile-action-button">🗑️</button>
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
        
        if (conversations.length === 0) {
            conversationList.innerHTML = '<div class="p-8 text-center text-gray-400"><p>No conversations yet. Start messaging to see conversations here.</p></div>';
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
                    <span class="online-status absolute bottom-0 right-0 w-3 h-3 md:w-3 md:h-3 w-4 h-4 rounded-full border-2 border-white ${false ? 'bg-green-500' : 'bg-gray-300'} mobile-online-indicator"></span>
                </div>
                <div class="flex-grow min-w-0 mobile-conversation-content">
                    <div class="flex justify-between items-center mb-1 mobile-conversation-header">
                        <h4 class="font-bold text-navy truncate mobile-conversation-name">${c.user.fullName}</h4>
                        <span class="text-[10px] md:text-[10px] text-xs text-gray-400 mobile-conversation-time">${formatTime(c.createdAt)}</span>
                    </div>
                    <p class="text-xs md:text-xs text-sm text-gray-500 truncate mobile-conversation-message">${c.lastMessage}</p>
                </div>
                ${c.unreadCount > 0 ? `<span class="bg-gold text-navy text-[10px] md:text-[10px] text-xs font-bold px-2 py-0.5 md:px-2 md:py-0.5 px-3 py-1 rounded-full mobile-unread-badge">${c.unreadCount}</span>` : ''}
            </div>
        `);

        if (window.lucide) window.lucide.createIcons();
        
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

    // Message form handler
    messageForm.onsubmit = async (e) => {
        e.preventDefault();
        const content = messageInput.value.trim();
        if (!content || !currentRecipientId) return;

        if (!token) {
            alert('Please log in to send messages');
            return;
        }

        // Use socket for real-time delivery if available
        if (socketConnected && socket) {
            socket.emit('send_message', {
                receiverId: currentRecipientId,
                content,
                productId: currentProductId || undefined
            });
            messageInput.value = '';
            stopTyping();
            
            // Mobile: Focus back to input and scroll to bottom
            if (window.innerWidth < 768) {
                setTimeout(() => {
                    messageInput.focus();
                    messageContainer.scrollTop = messageContainer.scrollHeight;
                }, 100);
            }
        } else {
            // Fallback to HTTP
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
                        productId: currentProductId || undefined
                    })
                });

                if (response.ok) {
                    messageInput.value = '';
                    loadMessages();
                    loadConversations();
                    stopTyping();
                    
                    // Mobile: Focus back to input and scroll to bottom
                    if (window.innerWidth < 768) {
                        setTimeout(() => {
                            messageInput.focus();
                            messageContainer.scrollTop = messageContainer.scrollHeight;
                        }, 100);
                    }
                } else {
                    alert('Failed to send message');
                }
            } catch (error) {
                console.error('Error sending message:', error);
                alert('Error sending message');
            }
        }
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
        
        // Add double-tap message indicator
        const doubleTapMessage = document.createElement('div');
        doubleTapMessage.id = 'double-tap-message';
        doubleTapMessage.innerHTML = 'Double tap to type';
        doubleTapMessage.style.cssText = `
            position: absolute;
            bottom: 90px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(10, 17, 40, 0.9);
            color: #FFD700;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 500;
            z-index: 45;
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
            white-space: nowrap;
        `;
        
        // Add message to chat area
        const chatArea = document.getElementById('chat-area');
        if (chatArea) {
            chatArea.style.position = 'relative';
            chatArea.appendChild(doubleTapMessage);
        }
        
        // Add scroll indicator button
        const scrollIndicator = document.createElement('button');
        scrollIndicator.id = 'scroll-to-input-btn';
        scrollIndicator.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m7 15 5 5 5-5"/>
                <path d="m7 9 5-5 5 5"/>
            </svg>
        `;
        scrollIndicator.style.cssText = `
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
        
        document.body.appendChild(scrollIndicator);
        
        // Show/hide scroll indicator and double-tap message based on scroll position
        const updateScrollIndicator = () => {
            const scrollTop = messageContainer.scrollTop;
            const scrollHeight = messageContainer.scrollHeight;
            const clientHeight = messageContainer.clientHeight;
            const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50;
            
            if (isAtBottom) {
                scrollIndicator.style.opacity = '0';
                scrollIndicator.style.transform = 'translateY(20px)';
                scrollIndicator.style.pointerEvents = 'none';
                doubleTapMessage.style.opacity = '0';
            } else {
                scrollIndicator.style.opacity = '1';
                scrollIndicator.style.transform = 'translateY(0)';
                scrollIndicator.style.pointerEvents = 'auto';
                doubleTapMessage.style.opacity = '1';
            }
        };
        
        // Scroll to input functionality
        scrollIndicator.addEventListener('click', () => {
            console.log('Scroll to input clicked');
            
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
                
                // Focus input field after scrolling
                setTimeout(() => {
                    const messageInput = document.getElementById('message-input');
                    if (messageInput) {
                        messageInput.focus();
                        console.log('Input field focused');
                    }
                }, 300);
            }, 100);
        });
        
        // Listen for scroll events
        messageContainer.addEventListener('scroll', updateScrollIndicator);
        
        // Initial check
        updateScrollIndicator();
        
        // Also add keyboard shortcut
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Down arrow scrolls to input
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
                    
                    // Focus input field after scrolling
                    setTimeout(() => {
                        const messageInput = document.getElementById('message-input');
                        if (messageInput) {
                            messageInput.focus();
                            console.log('Input field focused via keyboard');
                        }
                    }, 300);
                }, 100);
            }
        });
        
        // Add double-tap to scroll to input
        let lastTap = 0;
        messageContainer.addEventListener('touchend', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            
            if (tapLength < 500 && tapLength > 0) {
                // Double tap detected
                e.preventDefault();
                console.log('Double tap detected');
                
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
                    
                    // Focus input field after scrolling
                    setTimeout(() => {
                        const messageInput = document.getElementById('message-input');
                        if (messageInput) {
                            messageInput.focus();
                            console.log('Input field focused via double tap');
                        }
                    }, 300);
                }, 100);
            }
            
            lastTap = currentTime;
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
