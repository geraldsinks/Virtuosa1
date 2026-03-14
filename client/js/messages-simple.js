// Messages Simple JavaScript
const API_BASE = 'https://virtuosa-server.onrender.com/api';

document.addEventListener('DOMContentLoaded', () => {
    console.log('Messages page loaded');
    
    const token = localStorage.getItem('token');
    console.log('Token found:', !!token);
    
    const conversationList = document.getElementById('conversation-list');
    const messageContainer = document.getElementById('message-container');
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    const chatArea = document.getElementById('chat-area');
    const sidebar = document.getElementById('sidebar');

    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const recipientId = urlParams.get('recipientId');
    const productId = urlParams.get('productId');
    
    console.log('URL params:', { recipientId, productId });

    // Show chat area if we have a recipient
    if (recipientId) {
        console.log('Starting chat with recipient:', recipientId);
        startChat(recipientId, 'User');
    }

    // Simple start chat function
    function startChat(recipientId, recipientName) {
        console.log('Starting chat with:', recipientId, recipientName);
        
        // Show chat area
        if (chatArea) {
            chatArea.classList.remove('hidden');
            chatArea.classList.add('flex');
        }
        
        // Update recipient info
        const recipientNameEl = document.getElementById('recipient-name');
        const recipientAvatarEl = document.getElementById('recipient-avatar');
        
        if (recipientNameEl) recipientNameEl.textContent = recipientName || 'User';
        if (recipientAvatarEl) recipientAvatarEl.textContent = (recipientName || 'U').charAt(0);
        
        // Load messages (mock for now)
        loadMessages(recipientId);
    }

    // Load messages function
    async function loadMessages(recipientId) {
        if (!messageContainer) return;
        
        console.log('Loading messages for:', recipientId);
        
        // Show loading state
        messageContainer.innerHTML = '<div class="text-center text-gray-400">Loading messages...</div>';
        
        if (token) {
            try {
                const response = await fetch(`${API_BASE}/messages/${recipientId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok) {
                    const messages = await response.json();
                    displayMessages(messages);
                } else {
                    console.error('Failed to load messages:', response.status);
                    showMockMessages();
                }
            } catch (error) {
                console.error('Error loading messages:', error);
                showMockMessages();
            }
        } else {
            // Show mock messages if no token
            showMockMessages();
        }
    }

    function displayMessages(messages) {
        if (!messageContainer) return;
        
        if (messages.length === 0) {
            messageContainer.innerHTML = '<div class="text-center text-gray-400">No messages yet. Start the conversation!</div>';
            return;
        }
        
        messageContainer.innerHTML = messages.map(msg => `
            <div class="flex ${msg.sender === 'current-user' ? 'justify-end' : 'justify-start'} mb-4">
                <div class="max-w-[75%] p-3 rounded-2xl text-sm shadow-sm ${
                    msg.sender === 'current-user' 
                        ? 'bg-navy text-white rounded-tr-none' 
                        : 'bg-white text-navy rounded-tl-none border border-gray-100'
                }">
                    <p class="break-words">${msg.content}</p>
                    <span class="text-[10px] opacity-50">${new Date(msg.createdAt).toLocaleTimeString()}</span>
                </div>
            </div>
        `).join('');
        
        messageContainer.scrollTop = messageContainer.scrollHeight;
    }

    function showMockMessages() {
        if (!messageContainer) return;
        
        messageContainer.innerHTML = `
            <div class="text-center text-gray-400 mb-4">
                <p>Please log in to send messages</p>
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

    // Load conversations
    async function loadConversations() {
        if (!conversationList) return;
        
        console.log('Loading conversations');
        
        if (token) {
            try {
                const response = await fetch(`${API_BASE}/messages/conversations`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok) {
                    const conversations = await response.json();
                    displayConversations(conversations);
                } else {
                    showMockConversations();
                }
            } catch (error) {
                console.error('Error loading conversations:', error);
                showMockConversations();
            }
        } else {
            showMockConversations();
        }
    }

    function displayConversations(conversations) {
        if (!conversationList) return;
        
        if (conversations.length === 0) {
            conversationList.innerHTML = '<div class="p-8 text-center text-gray-400"><p>No conversations yet.</p></div>';
            return;
        }
        
        conversationList.innerHTML = conversations.map(c => `
            <div onclick="startChat('${c._id}', '${c.user.fullName}')" 
                 class="p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-3">
                <div class="w-12 h-12 rounded-full bg-gold bg-opacity-10 flex items-center justify-center font-bold text-gold">
                    ${c.user.fullName.charAt(0)}
                </div>
                <div class="flex-grow min-w-0">
                    <div class="flex justify-between items-center mb-1">
                        <h4 class="font-bold text-navy truncate">${c.user.fullName}</h4>
                        <span class="text-[10px] text-gray-400">${new Date(c.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p class="text-xs text-gray-500 truncate">${c.lastMessage}</p>
                </div>
                ${c.unreadCount > 0 ? `<span class="bg-gold text-navy text-[10px] font-bold px-2 py-0.5 rounded-full">${c.unreadCount}</span>` : ''}
            </div>
        `).join('');
    }

    function showMockConversations() {
        if (!conversationList) return;
        
        conversationList.innerHTML = `
            <div class="p-8 text-center text-gray-400">
                <p>Please log in to see your conversations</p>
                <p class="text-sm mt-2">This is a demo view.</p>
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
                    <div class="div flex justify-between items-center mb-1">
                        <h4 class="font-bold text-navy truncate">Alice Smith</h4>
                        <span class="text-[10px] text-gray-400">Yesterday</span>
                    </div>
                    <p class="text-xs text-gray-500 truncate">Thanks for your help!</p>
                </div>
            </div>
        `;
    }

    // Message form handler
    if (messageForm) {
        messageForm.onsubmit = async (e) => {
            e.preventDefault();
            const content = messageInput?.value?.trim();
            
            if (!content || !recipientId) return;
            
            if (!token) {
                alert('Please log in to send messages');
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
                        receiverId: recipientId,
                        content,
                        productId: productId || undefined
                    })
                });
                
                if (response.ok) {
                    messageInput.value = '';
                    loadMessages(recipientId);
                    loadConversations();
                } else {
                    alert('Failed to send message');
                }
            } catch (error) {
                console.error('Error sending message:', error);
                alert('Error sending message');
            }
        };
    }

    // Helper functions
    window.showSidebar = () => {
        if (sidebar) {
            sidebar.classList.remove('hidden');
            if (chatArea) chatArea.classList.add('hidden');
        }
    };

    // Initialize
    loadConversations();
    
    console.log('Messages initialization complete');
});
