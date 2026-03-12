console.log('Messages debug script loaded');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Initializing debug messaging...');
    
    const token = localStorage.getItem('token');
    console.log('Token found:', !!token);
    console.log('User data:', {
        userId: localStorage.getItem('userId'),
        userEmail: localStorage.getItem('userEmail'),
        userFullName: localStorage.getItem('userFullName'),
        userRole: localStorage.getItem('userRole'),
        isAdmin: localStorage.getItem('isAdmin')
    });
    
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const recipientId = urlParams.get('recipientId');
    const productId = urlParams.get('productId');
    
    console.log('URL Parameters:', { recipientId, productId });
    
    // Get DOM elements
    const conversationList = document.getElementById('conversation-list');
    const messageContainer = document.getElementById('message-container');
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    const chatArea = document.getElementById('chat-area');
    const sidebar = document.getElementById('sidebar');
    
    console.log('DOM Elements found:', {
        conversationList: !!conversationList,
        messageContainer: !!messageContainer,
        messageForm: !!messageForm,
        messageInput: !!messageInput,
        chatArea: !!chatArea,
        sidebar: !!sidebar
    });
    
    // Show chat area if we have a recipient
    if (recipientId && chatArea) {
        console.log('Showing chat area for recipient:', recipientId);
        chatArea.classList.remove('hidden');
        chatArea.classList.add('flex');
        
        // Update recipient info
        const recipientNameEl = document.getElementById('recipient-name');
        const recipientAvatarEl = document.getElementById('recipient-avatar');
        
        if (recipientNameEl) recipientNameEl.textContent = 'User';
        if (recipientAvatarEl) recipientAvatarEl.textContent = 'U';
        
        // Show demo messages
        if (messageContainer) {
            messageContainer.innerHTML = `
                <div class="text-center text-gray-400 mb-4">
                    <p>Debug mode - Messaging interface loaded successfully!</p>
                    <p class="text-sm mt-2">Recipient ID: ${recipientId}</p>
                    ${productId ? `<p class="text-sm">Product ID: ${productId}</p>` : ''}
                    <p class="text-sm mt-2">Authentication: ${token ? 'Logged in' : 'Demo mode'}</p>
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
    }
    
    // Show demo conversations
    if (conversationList) {
        conversationList.innerHTML = `
            <div class="p-8 text-center text-gray-400">
                <p>Debug mode - Conversations loaded!</p>
                <p class="text-sm mt-2">Authentication: ${token ? 'Logged in' : 'Demo mode'}</p>
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
        `;
    }
    
    // Message form handler
    if (messageForm) {
        messageForm.onsubmit = (e) => {
            e.preventDefault();
            const content = messageInput?.value?.trim();
            
            if (!content) return;
            
            if (!token) {
                alert('Please log in to send real messages');
                return;
            }
            
            console.log('Message submitted:', content);
            alert('Message sent! (Debug mode - not actually sent)');
            messageInput.value = '';
        };
    }
    
    console.log('Debug messaging initialization complete');
});
