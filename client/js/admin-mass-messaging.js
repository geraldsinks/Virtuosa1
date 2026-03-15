// Admin Mass Messaging JavaScript
// API_BASE is provided by config.js

// Admin Mass Messaging System - Enhanced Version
class AdminMassMessaging {
    constructor() {
        this.token = localStorage.getItem('token');
        this.currentStep = 1;
        this.messageData = {
            title: '',
            content: '',
            template: '',
            targetType: 'all',
            customUserIds: [],
            filters: {
                accountType: '',
                verification: '',
                subscription: '',
                dateRange: null,
                activity: {
                    lastActive: '',
                    minOrders: 0
                }
            },
            scheduleTime: null,
            searchQuery: ''
        };
        this.targetUsers = [];
        this.filteredUsers = [];
        this.userStats = null;
        this.sendingProgress = {
            total: 0,
            sent: 0,
            pending: 0,
            failed: 0,
            isActive: false
        };

        this.templates = {
            'new-features': {
                title: '🚀 New Features Available!',
                content: 'We\'ve added exciting new features to make your experience even better. Check them out in your dashboard!'
            },
            'promotion': {
                title: ' Special Promotion Inside!',
                content: 'Limited time offer! Get exclusive discounts on premium features. Don\'t miss out!'
            },
            'maintenance': {
                title: ' Scheduled Maintenance Notice',
                content: 'We\'ll be performing scheduled maintenance on [DATE]. Service may be temporarily unavailable during this time.'
            }
        };

        this.init();
    }

    async init() {
        this.token = localStorage.getItem('token');
        
        console.log('🔑 Token check:', this.token ? 'Token found' : 'No token found');
        
        if (!this.token) {
            alert('Please log in to access admin features');
            window.location.href = '/pages/login.html';
            return;
        }

        console.log('🚀 Initializing enhanced admin mass messaging system...');
        console.log('🔍 Checking auth-helper availability:', !!window.authHelper);

        await this.loadUserStats();
        await this.loadTargetUsers(); // Load initial target users
        this.setupEventListeners();
        this.setupAdvancedFiltering();
        this.setupProgressTracking();
        this.renderStep1();
        
        // Initialize default audience selection
        this.selectAudience('all');

        console.log('✅ Admin mass messaging system initialized');
    }

    setupEventListeners() {
        // Template selection
        document.querySelectorAll('input[name="template"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.selectTemplate(e.target.value));
        });

        // Character counting
        document.getElementById('message-title').addEventListener('input', (e) => {
            this.updateCharCount('title', e.target.value.length, 100);
        });

        document.getElementById('message-content').addEventListener('input', (e) => {
            this.updateCharCount('content', e.target.value.length, 1000);
        });

        // Navigation
        document.getElementById('next-step-1').addEventListener('click', () => this.validateAndNext(1));
        document.getElementById('prev-step-2').addEventListener('click', () => this.goToStep(1));
        document.getElementById('next-step-2').addEventListener('click', () => this.validateAndNext(2));
        document.getElementById('prev-step-3').addEventListener('click', () => this.goToStep(2));

        // Preview and refresh
        document.getElementById('preview-message')?.addEventListener('click', () => this.previewMessage());
        document.getElementById('refresh-preview')?.addEventListener('click', () => this.previewMessage());

        // Send options
        document.querySelectorAll('input[name="sendTiming"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.toggleScheduleOptions(e.target.value));
        });

        // Confirmation
        document.getElementById('confirm-send').addEventListener('change', (e) => this.toggleSendButton());

        // Send message
        document.getElementById('send-message').addEventListener('click', () => this.sendMessage());

        // Draft saving
        document.getElementById('save-draft').addEventListener('click', () => this.saveDraft());
        document.getElementById('save-draft-final').addEventListener('click', () => this.saveDraft());
    }

    setupAdvancedFiltering() {
        // Filter toggle
        document.getElementById('toggle-filters').addEventListener('click', () => {
            const filters = document.getElementById('advanced-filters');
            const isHidden = filters.classList.contains('hidden');
            filters.classList.toggle('hidden');

            const button = document.getElementById('toggle-filters');
            button.innerHTML = isHidden ?
                '<i data-lucide="filter" class="w-4 h-4 mr-1"></i>Hide Filters' :
                '<i data-lucide="filter" class="w-4 h-4 mr-1"></i>Advanced Filters';
        });

        // Filter controls
        document.getElementById('enable-date-filter').addEventListener('change', (e) => {
            const dateOptions = document.getElementById('date-filter-options');
            if (dateOptions) {
                dateOptions.classList.toggle('hidden', !e.target.checked);
            }
        });

        document.getElementById('enable-activity-filter').addEventListener('change', (e) => {
            const activityOptions = document.getElementById('activity-filter-options');
            if (activityOptions) {
                activityOptions.classList.toggle('hidden', !e.target.checked);
            }
        });

        // Debounced search
        let searchTimeout;
        document.getElementById('user-search').addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.messageData.searchQuery = e.target.value;
                console.log('🔍 Searching for:', this.messageData.searchQuery);
                this.applyFilters();
            }, 300); // 300ms debounce
        });

        // Filter changes
        document.querySelectorAll('#advanced-filters select, #advanced-filters input').forEach(element => {
            element.addEventListener('change', () => {
                console.log('🔄 Filter changed, updating...');
                this.updateFilters();
            });
        });

        // Apply filters
        document.getElementById('apply-filters').addEventListener('click', () => {
            console.log('✨ Applying filters...');
            this.applyFilters();
        });

        // Clear filters
        document.getElementById('clear-filters').addEventListener('click', () => {
            console.log('🧹 Clearing filters...');
            this.clearFilters();
        });

        // Audience selection
        document.querySelectorAll('input[name="targetType"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                console.log('🎯 Audience type changed to:', e.target.value);
                this.selectAudience(e.target.value);
            });
        });
    }

    setupProgressTracking() {
        // Progress tracking is handled in the sendMessage method
        console.log('📊 Progress tracking initialized');
    }

    selectAudience(targetType) {
        this.messageData.targetType = targetType;
        
        console.log('🎯 Selecting audience:', targetType);
        
        // Update UI - remove gold border from all options
        document.querySelectorAll('.audience-option').forEach(option => {
            option.classList.remove('border-gold', 'ring-2', 'ring-gold', 'ring-opacity-50');
            option.classList.add('border-gray-200');
        });

        // Add gold border to selected option
        const selectedOption = document.querySelector(`input[value="${targetType}"]`)?.closest('.audience-option');
        if (selectedOption) {
            selectedOption.classList.remove('border-gray-200');
            selectedOption.classList.add('border-gold', 'ring-2', 'ring-gold', 'ring-opacity-50');
            console.log('✅ Updated UI for selected audience');
        }

        // Load target users for the new audience
        this.loadTargetUsers();
    }

    updateFilters() {
        if (!this.messageData.filters) {
            this.messageData.filters = {
                accountType: '',
                verification: '',
                subscription: '',
                dateRange: null,
                activity: { lastActive: '', minOrders: 0 }
            };
        }

        this.messageData.filters.accountType = document.getElementById('filter-account-type')?.value || '';
        this.messageData.filters.verification = document.getElementById('filter-verification')?.value || '';
        this.messageData.filters.subscription = document.getElementById('filter-subscription')?.value || '';

        // Date range
        if (document.getElementById('enable-date-filter')?.checked) {
            const from = document.getElementById('date-from')?.value;
            const to = document.getElementById('date-to')?.value;
            this.messageData.filters.dateRange = from && to ? { from, to } : null;
        } else {
            this.messageData.filters.dateRange = null;
        }

        // Activity filters
        if (document.getElementById('enable-activity-filter')?.checked) {
            this.messageData.filters.activity.lastActive = document.getElementById('last-active')?.value || '';
            this.messageData.filters.activity.minOrders = parseInt(document.getElementById('min-orders')?.value) || 0;
        } else {
            this.messageData.filters.activity = { lastActive: '', minOrders: 0 };
        }
    }

    applyFilters() {
        this.updateFilters();
        this.loadTargetUsers();
    }

    clearFilters() {
        // Reset all filter inputs
        const searchInput = document.getElementById('user-search');
        const accountTypeSelect = document.getElementById('filter-account-type');
        const verificationSelect = document.getElementById('filter-verification');
        const subscriptionSelect = document.getElementById('filter-subscription');
        const enableDateFilter = document.getElementById('enable-date-filter');
        const dateFromInput = document.getElementById('date-from');
        const dateToInput = document.getElementById('date-to');
        const enableActivityFilter = document.getElementById('enable-activity-filter');
        const lastActiveSelect = document.getElementById('last-active');
        const minOrdersInput = document.getElementById('min-orders');

        if (searchInput) searchInput.value = '';
        if (accountTypeSelect) accountTypeSelect.value = '';
        if (verificationSelect) verificationSelect.value = '';
        if (subscriptionSelect) subscriptionSelect.value = '';
        if (enableDateFilter) enableDateFilter.checked = false;
        if (dateFromInput) dateFromInput.value = '';
        if (dateToInput) dateToInput.value = '';
        if (enableActivityFilter) enableActivityFilter.checked = false;
        if (lastActiveSelect) lastActiveSelect.value = '';
        if (minOrdersInput) minOrdersInput.value = '';

        // Reset data
        this.messageData.searchQuery = '';
        this.messageData.filters = {
            accountType: '',
            verification: '',
            subscription: '',
            dateRange: null,
            activity: { lastActive: '', minOrders: 0 }
        };

        // Hide filter options
        const dateFilterOptions = document.getElementById('date-filter-options');
        const activityFilterOptions = document.getElementById('activity-filter-options');
        if (dateFilterOptions) dateFilterOptions.classList.add('hidden');
        if (activityFilterOptions) activityFilterOptions.classList.add('hidden');

        this.loadTargetUsers();
    }

    renderStep1() {
        // Hide all steps
        document.querySelectorAll('.step-content').forEach(el => {
            el.classList.add('hidden');
        });

        // Show step 1
        document.getElementById('step-1').classList.remove('hidden');

        // Update progress indicators
        document.querySelectorAll('.step-indicator').forEach((el, index) => {
            if (index === 0) {
                el.classList.add('active');
                el.classList.remove('completed');
            } else {
                el.classList.remove('active', 'completed');
            }
        });
    }

    async loadUserStats() {
        try {
            // First try the debug endpoint
            console.log('Trying debug endpoint...');
            const response = await fetch(`${API_BASE}/admin/debug/stats`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (response.ok) {
                this.userStats = await response.json();
                this.updateStatsDisplay();
                console.log('Debug stats loaded successfully:', this.userStats);
            } else {
                throw new Error('Debug endpoint failed');
            }
        } catch (error) {
            console.error('Error loading user stats with debug endpoint:', error);

            // Fallback to original endpoint
            try {
                console.log('Trying original endpoint...');
                const response = await fetch(`${API_BASE}/admin/users/stats`, {
                    headers: { 'Authorization': `Bearer ${this.token}` }
                });

                if (response.ok) {
                    this.userStats = await response.json();
                    this.updateStatsDisplay();
                    console.log('Original stats loaded successfully:', this.userStats);
                } else {
                    throw new Error('Original endpoint also failed');
                }
            } catch (fallbackError) {
                console.error('Error loading user stats with original endpoint:', fallbackError);
                alert('Error loading user statistics. Please check console for details.');

                // Set default values
                this.userStats = {
                    stats: {
                        totalUsers: 0,
                        totalBuyers: 0,
                        totalSellers: 0,
                        verifiedSellers: 0,
                        proSellers: 0,
                        studentVerified: 0
                    },
                    recentUsers: []
                };
                this.updateStatsDisplay();
            }
        }
    }

    updateStatsDisplay() {
        if (!this.userStats) return;

        console.log('Updating stats display with:', this.userStats);

        // Update main stats
        const stats = this.userStats.stats || this.userStats;
        document.getElementById('total-users').innerHTML = `<div class="text-2xl sm:text-3xl font-bold text-blue-800">${stats.totalUsers || 0}</div>`;
        document.getElementById('total-buyers').innerHTML = `<div class="text-2xl sm:text-3xl font-bold text-green-800">${stats.totalBuyers || 0}</div>`;
        document.getElementById('total-sellers').innerHTML = `<div class="text-2xl sm:text-3xl font-bold text-purple-800">${stats.totalSellers || 0}</div>`;
        document.getElementById('verified-sellers').innerHTML = `<div class="text-2xl sm:text-3xl font-bold text-emerald-800">${stats.verifiedSellers || 0}</div>`;
        document.getElementById('pro-sellers').innerHTML = `<div class="text-2xl sm:text-3xl font-bold text-amber-800">${stats.proSellers || 0}</div>`;
        document.getElementById('student-verified').innerHTML = `<div class="text-2xl sm:text-3xl font-bold text-indigo-800">${stats.studentVerified || 0}</div>`;

        // Update header count
        document.getElementById('header-user-count').textContent = stats.totalUsers || 0;

        // Update audience counts
        document.getElementById('all-users-count').textContent = `${stats.totalUsers || 0} users`;
        document.getElementById('buyers-count').textContent = `${stats.totalBuyers || 0} users`;
        document.getElementById('sellers-count').textContent = `${stats.totalSellers || 0} users`;
    }

    // Template selection
    selectTemplate(templateKey) {
        this.messageData.template = templateKey;

        if (templateKey && this.templates[templateKey]) {
            const template = this.templates[templateKey];
            document.getElementById('message-title').value = template.title;
            document.getElementById('message-content').value = template.content;

            // Update character counts
            this.updateCharCount('title', template.title.length, 100);
            this.updateCharCount('content', template.content.length, 1000);
        }

        // Update template selection UI
        document.querySelectorAll('.template-option').forEach(option => {
            option.classList.remove('border-gold');
            option.classList.add('border-gray-200');
        });

        if (templateKey) {
            const selectedOption = document.querySelector(`input[value="${templateKey}"]`).closest('.template-option');
            selectedOption.classList.remove('border-gray-200');
            selectedOption.classList.add('border-gold');
        }
    }

    // Character counting
    updateCharCount(type, length, max) {
        const elementId = type === 'title' ? 'title-char-count' : 'content-char-count';
        const element = document.getElementById(elementId);

        element.textContent = `${length}/${max}`;
        element.className = length > max ? 'text-sm text-red-400' : 'text-sm text-gray-400';
    }

    // Validation and navigation
    validateAndNext(step) {
        if (step === 1) {
            const title = document.getElementById('message-title').value.trim();
            const content = document.getElementById('message-content').value.trim();

            if (!title || !content) {
                alert('Please fill in both title and content fields');
                return;
            }

            if (title.length > 100 || content.length > 1000) {
                alert('Title or content exceeds maximum length');
                return;
            }

            this.messageData.title = title;
            this.messageData.content = content;

            this.goToStep(2);
        } else if (step === 2) {
            // Validate target selection
            if (this.targetUsers.length === 0) {
                alert('No users found matching your criteria. Please adjust your filters or audience selection.');
                return;
            }
            
            this.goToStep(3);
            // Generate preview and summary when entering step 3
            setTimeout(() => {
                this.previewMessage();
                this.updateSummary();
                this.updateFinalRecipientCount();
            }, 100);
        }
    }

    goToStep(step) {
        this.currentStep = step;
        
        // Hide all steps
        document.querySelectorAll('.step-content').forEach(el => {
            el.classList.add('hidden');
        });
        
        // Show current step
        document.getElementById(`step-${step}`).classList.remove('hidden');
        
        // Update progress indicators
        document.querySelectorAll('.step-indicator').forEach((el, index) => {
            if (index < step) {
                el.classList.add('completed');
                el.classList.remove('active');
            } else if (index === step - 1) {
                el.classList.add('active');
                el.classList.remove('completed');
            } else {
                el.classList.remove('active', 'completed');
            }
        });
        
        // Update navigation buttons
        document.getElementById('prev-step-2').style.display = step === 1 ? 'none' : 'block';
        document.getElementById('prev-step-3').style.display = step === 1 ? 'none' : 'block';
        document.getElementById('next-step-1').style.display = step === 3 ? 'none' : 'block';
        document.getElementById('next-step-2').style.display = step === 3 ? 'none' : 'block';
        document.getElementById('send-message').style.display = step === 3 ? 'block' : 'none';
        document.getElementById('save-draft').style.display = step === 3 ? 'block' : 'none';
    }

    async loadTargetUsers() {
        try {
            console.log('🎯 Starting loadTargetUsers...');
            console.log('🔍 Auth-helper available:', !!window.authHelper);
            
            // Build query parameters based on current filters
            const queryParams = new URLSearchParams();
            
            // Map targetType to userType (API expects userType)
            const userType = this.messageData.targetType || 'all';
            if (userType !== 'all') {
                queryParams.set('userType', userType);
            }
            
            // Add verifiedOnly filter if verification is set
            if (this.messageData.filters?.verification === 'verified') {
                queryParams.set('verifiedOnly', 'true');
            }
            
            // Add search query (basic implementation)
            if (this.messageData.searchQuery) {
                // Note: API doesn't support search yet, but we'll include it for future use
                console.log('🔍 Search query:', this.messageData.searchQuery);
            }
            
            // Add limit
            queryParams.set('limit', '1000');

            // Add date range if available
            if (this.messageData.filters?.dateRange) {
                queryParams.set('dateRange', JSON.stringify({
                    start: this.messageData.filters.dateRange.from,
                    end: this.messageData.filters.dateRange.to
                }));
            }

            console.log('📡 Loading target users with params:', queryParams.toString());
            console.log('🌐 Full API URL:', `/api/admin/users/target?${queryParams}`);

            let response;
            if (window.authHelper) {
                console.log('🔐 Using authHelper for API call...');
                response = await window.authHelper.authenticatedFetch(`${API_BASE}/admin/users/target?${queryParams}`);
            } else {
                console.log('⚠️ Using regular fetch (no authHelper)...');
                response = await fetch(`${API_BASE}/admin/users/target?${queryParams}`, {
                    headers: { 'Authorization': `Bearer ${this.token}` }
                });
            }

            console.log('📊 Response status:', response.status, response.statusText);

            if (response.ok) {
                const data = await response.json();
                console.log('📋 API Response data:', data);
                this.targetUsers = data.users || [];
                this.updateTargetUsersDisplay();
                console.log(`✅ Loaded ${this.targetUsers.length} target users`);
                console.log('📈 Total count from API:', data.totalCount);
            } else {
                console.error('❌ Failed to load target users:', response.status, response.statusText);
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Error details:', errorData);
                
                // Try fallback without filters
                console.log('🔄 Trying fallback without filters...');
                let fallbackResponse;
                if (window.authHelper) {
                    fallbackResponse = await window.authHelper.authenticatedFetch('/api/admin/users/target?limit=1000');
                } else {
                    fallbackResponse = await fetch('/api/admin/users/target?limit=1000', {
                        headers: { 'Authorization': `Bearer ${this.token}` }
                    });
                }
                
                if (fallbackResponse.ok) {
                    const fallbackData = await fallbackResponse.json();
                    console.log('📋 Fallback response data:', fallbackData);
                    this.targetUsers = fallbackData.users || [];
                    this.updateTargetUsersDisplay();
                    console.log(`✅ Loaded ${this.targetUsers.length} target users with fallback`);
                } else {
                    console.error('❌ Even fallback failed');
                    throw new Error('Failed to load target users');
                }
            }
        } catch (error) {
            console.error('❌ Error loading target users:', error);
            this.targetUsers = [];
            this.updateTargetUsersDisplay();
        }
    }

    updateTargetUsersDisplay() {
        const selectedCountEl = document.getElementById('selected-count');
        const filterCountEl = document.getElementById('filter-result-count');
        const audiencePreviewEl = document.getElementById('audience-preview');
        
        const count = this.targetUsers.length;
        
        // Update selected count
        if (selectedCountEl) {
            selectedCountEl.textContent = `${count} users selected`;
        }
        
        // Update filter result count
        if (filterCountEl) {
            filterCountEl.textContent = `${count} user${count !== 1 ? 's' : ''} found`;
        }
        
        // Update audience preview
        if (audiencePreviewEl) {
            if (count === 0) {
                audiencePreviewEl.innerHTML = `
                    <div class="text-center text-gray-500 p-4">
                        <i data-lucide="users" class="w-8 h-8 text-gray-400 mx-auto mb-2"></i>
                        <p class="text-gray-500">No users found. Try adjusting your targeting criteria.</p>
                    </div>
                `;
            } else {
                // Show sample of users (first 5)
                const sampleUsers = this.targetUsers.slice(0, 5);
                audiencePreviewEl.innerHTML = `
                    <div class="space-y-2">
                        ${sampleUsers.map(user => `
                            <div class="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                                <div class="w-8 h-8 bg-gradient-gold rounded-full flex items-center justify-center text-white font-medium text-sm">
                                    ${user.fullName ? user.fullName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-medium text-gray-900 truncate">${user.fullName || 'Unknown User'}</p>
                                    <p class="text-xs text-gray-500 truncate">${user.email}</p>
                                </div>
                            </div>
                        `).join('')}
                        ${count > 5 ? `<p class="text-xs text-gray-500 text-center pt-2">+ ${count - 5} more users</p>` : ''}
                    </div>
                `;
            }
        }
        
        // Update final recipient count if we're on step 3
        if (this.currentStep === 3) {
            this.updateFinalRecipientCount();
        }
        
        // Reinitialize Lucide icons
        if (window.lucide) {
            window.lucide.createIcons();
        }
        
        console.log(`📊 Updated display: ${count} users`);
    }

    previewMessage() {
        console.log('👁️ Generating message preview...');
        
        const previewEl = document.getElementById('message-preview');
        if (!previewEl) {
            console.error('❌ message-preview element not found');
            return;
        }

        const title = this.messageData.title || 'No title';
        const content = this.messageData.content || 'No content';
        const recipientCount = this.targetUsers.length || 0;

        previewEl.innerHTML = `
            <div class="space-y-4">
                <!-- Message Header -->
                <div class="border-b border-gray-200 pb-4">
                    <div class="flex items-center justify-between">
                        <span class="text-xs bg-gold text-navy px-3 py-1 rounded-full font-bold">ADMIN MESSAGE</span>
                        <span class="text-xs text-gray-500">From: Virtuosa Admin</span>
                    </div>
                    <h3 class="text-xl font-bold text-gray-800 mt-3">${this.escapeHtml(title)}</h3>
                </div>
                
                <!-- Message Content -->
                <div class="prose prose-sm max-w-none">
                    ${this.formatMessage(content)}
                </div>
                
                <!-- Message Footer -->
                <div class="border-t border-gray-200 pt-4">
                    <div class="flex items-center justify-between text-sm text-gray-600">
                        <div class="flex items-center space-x-4">
                            <span class="flex items-center">
                                <i data-lucide="target" class="w-4 h-4 mr-1"></i>
                                ${this.getTargetTypeLabel()}
                            </span>
                            <span class="flex items-center">
                                <i data-lucide="users" class="w-4 h-4 mr-1"></i>
                                ${recipientCount} recipient${recipientCount !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <span class="text-xs text-gray-400">
                            ${new Date().toLocaleDateString()}
                        </span>
                    </div>
                </div>
            </div>
        `;
        
        // Reinitialize Lucide icons
        if (window.lucide) {
            window.lucide.createIcons();
        }
        
        console.log('✅ Message preview generated');
    }

    getTargetTypeLabel() {
        const labels = {
            'all': 'All Users',
            'buyers': 'Buyers Only',
            'sellers': 'Sellers Only',
            'verifiedSellers': 'Verified Sellers',
            'proSellers': 'Pro Sellers',
            'custom': 'Custom Selection'
        };
        return labels[this.messageData.targetType] || 'Unknown';
    }

    updateSummary() {
        console.log('📋 Updating campaign summary...');
        
        // Update message details
        const titleEl = document.getElementById('summary-title');
        const lengthEl = document.getElementById('summary-length');
        const templateEl = document.getElementById('summary-template');
        
        if (titleEl) titleEl.textContent = this.messageData.title || 'Not set';
        if (lengthEl) lengthEl.textContent = `${this.messageData.content.length} characters`;
        if (templateEl) templateEl.textContent = this.messageData.template ? 'Yes' : 'No';
        
        // Update audience details
        const targetEl = document.getElementById('summary-target');
        const countEl = document.getElementById('summary-count');
        const filtersEl = document.getElementById('summary-filters');
        
        if (targetEl) targetEl.textContent = this.getTargetTypeLabel();
        if (countEl) countEl.textContent = this.targetUsers.length;
        if (filtersEl) filtersEl.textContent = this.hasActiveFilters() ? 'Yes' : 'No';
        
        console.log('✅ Campaign summary updated');
    }

    updateFinalRecipientCount() {
        const recipientCountEl = document.getElementById('final-recipient-count');
        if (recipientCountEl) {
            const count = this.targetUsers.length || 0;
            recipientCountEl.textContent = count;
            console.log(`👥 Updated final recipient count: ${count}`);
        }
        
        // Also update send button state
        this.toggleSendButton();
    }

    hasActiveFilters() {
        if (!this.messageData.filters) return false;
        
        return !!(
            this.messageData.filters.accountType ||
            this.messageData.filters.verification ||
            this.messageData.filters.subscription ||
            this.messageData.filters.dateRange ||
            (this.messageData.filters.activity && (
                this.messageData.filters.activity.lastActive ||
                this.messageData.filters.activity.minOrders > 0
            )) ||
            this.messageData.searchQuery
        );
    }

    toggleSendButton() {
        const confirmed = document.getElementById('confirm-send')?.checked;
        const hasRecipients = this.targetUsers.length > 0;
        const button = document.getElementById('send-message');

        if (button) {
            button.disabled = !confirmed || !hasRecipients;
            
            // Update button text based on state
            const buttonTextEl = document.getElementById('send-button-text');
            if (buttonTextEl) {
                if (!hasRecipients) {
                    buttonTextEl.textContent = 'No Recipients';
                } else if (!confirmed) {
                    buttonTextEl.textContent = 'Confirm to Send';
                } else {
                    buttonTextEl.textContent = 'Send Message';
                }
            }
        }

        console.log('🔘 Send button state:', {
            confirmed,
            hasRecipients,
            disabled: button?.disabled
        });
    }

    // Utility functions
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatMessage(content) {
        return content
            .split('\n')
            .map(line => line.trim() ? `<p class="mb-2">${this.escapeHtml(line)}</p>` : '')
            .join('');
    }

    async sendMessage() {
        console.log('📤 Starting message send process...');
        
        if (!this.targetUsers || this.targetUsers.length === 0) {
            alert('No recipients selected. Please select users to send the message to.');
            return;
        }

        // Get send timing preference
        const sendTiming = document.querySelector('input[name="sendTiming"]:checked')?.value || 'immediate';
        
        // Handle scheduled sending
        if (sendTiming === 'scheduled') {
            const date = document.getElementById('schedule-date')?.value;
            const time = document.getElementById('schedule-time')?.value;

            if (!date || !time) {
                alert('Please select both date and time for scheduled sending.');
                return;
            }

            const scheduleDateTime = new Date(`${date}T${time}`);
            if (scheduleDateTime <= new Date()) {
                alert('Scheduled time must be in the future.');
                return;
            }

            this.messageData.scheduleTime = scheduleDateTime.toISOString();
        }

        // Show progress
        const progressEl = document.getElementById('send-progress');
        const buttonEl = document.getElementById('send-message');
        const buttonTextEl = document.getElementById('send-button-text');
        
        if (progressEl) progressEl.classList.remove('hidden');
        if (buttonEl) buttonEl.disabled = true;
        if (buttonTextEl) buttonTextEl.textContent = 'Sending...';

        try {
            console.log('📡 Sending message to', this.targetUsers.length, 'users');
            
            // Prepare payload with user IDs
            const payload = {
                title: this.messageData.title,
                content: this.messageData.content,
                userIds: this.targetUsers.map(user => user.id)
            };

            const response = await fetch(`${API_BASE}/admin/messages/mass-send`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            console.log('📊 Send response status:', response.status);

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Send result:', result);
                
                const messageCount = result.messageCount || result.totalMessages || result.count || this.targetUsers.length;
                const successMessage = sendTiming === 'scheduled' 
                    ? `Message scheduled successfully for ${messageCount} users!`
                    : `Message sent successfully to ${messageCount} users!`;
                
                alert(successMessage);
                this.resetForm();
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Send failed:', errorData);
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ Error sending message:', error);
            alert(`Error sending message: ${error.message}. Please try again.`);
        } finally {
            // Hide progress and reset button
            if (progressEl) progressEl.classList.add('hidden');
            if (buttonEl) buttonEl.disabled = false;
            if (buttonTextEl) buttonTextEl.textContent = 'Send Message';
            this.toggleSendButton();
        }
    }

    saveDraft() {
        const draft = {
            ...this.messageData,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('massMessageDraft', JSON.stringify(draft));
        alert('Draft saved successfully!');
    }

    loadDraft() {
        const draft = localStorage.getItem('massMessageDraft');
        if (draft) {
            this.messageData = JSON.parse(draft);
            
            // Update UI
            document.getElementById('message-title').value = this.messageData.title;
            document.getElementById('message-content').value = this.messageData.content;
            
            // Set target type
            const targetRadio = document.querySelector(`input[name="targetType"][value="${this.messageData.targetType}"]`);
            if (targetRadio) targetRadio.checked = true;
            
            this.updateCharCount();
            this.updateTargetOptions();
        }
    }

    loadTemplate(templateId) {
        const templates = {
            'new-features': {
                title: '🎉 Exciting New Features Available!',
                content: `Dear Virtuosa User,

We're thrilled to announce some amazing new features that will enhance your experience:

✨ Enhanced Search Filters
📱 Improved Mobile Experience
💳 Secure Payment Options
🚀 Faster Loading Times

These updates are designed to make buying and selling on Virtuosa easier and more enjoyable than ever before.

Log in now to explore these new features and make the most of your Virtuosa experience!

Best regards,
The Virtuosa Team`
            },
            'promotion': {
                title: '🎊 Limited Time Offer - 50% OFF Seller Verification!',
                content: `Hello Seller,

For a limited time only, get 50% OFF our Professional Seller Verification package!

🌟 Benefits of Verified Seller Status:
- Increased buyer trust
- Higher visibility in search results
- Priority customer support
- Verified seller badge
- Access to advanced analytics

Regular Price: ZMW 100
Special Offer: ZMW 50

This offer won't last long! Upgrade today and start selling more effectively.

Click here to upgrade now: [Link]

Happy selling!
The Virtuosa Team`
            },
            'maintenance': {
                title: '🔧 Scheduled Maintenance Notice',
                content: `Dear Virtuosa Users,

We will be performing scheduled maintenance on our platform:

📅 Date: [Date]
⏰ Time: [Time]
⏱️ Duration: 2 hours

During this time, you may experience:
- Temporary inability to list new products
- Brief interruptions in messaging
- Slow loading times

We apologize for any inconvenience and appreciate your patience as we work to improve your experience.

All services will return to normal after the maintenance period.

Thank you for your understanding,
The Virtuosa Team`
            }
        };

        const template = templates[templateId];
        if (template) {
            this.messageData.title = template.title;
            this.messageData.content = template.content;
            
            document.getElementById('message-title').value = template.title;
            document.getElementById('message-content').value = template.content;
            
            this.updateCharCount();
        }
    }

    resetForm() {
        console.log('🔄 Resetting form...');
        
        // Reset message data
        this.messageData = {
            title: '',
            content: '',
            template: '',
            targetType: 'all',
            customUserIds: [],
            filters: {
                accountType: '',
                verification: '',
                subscription: '',
                dateRange: null,
                activity: { lastActive: '', minOrders: 0 }
            },
            scheduleTime: null,
            searchQuery: ''
        };
        
        this.targetUsers = [];
        this.currentStep = 1;
        
        // Reset to step 1
        this.goToStep(1);
        
        // Clear form fields that exist
        const titleInput = document.getElementById('message-title');
        const contentInput = document.getElementById('message-content');
        const searchInput = document.getElementById('user-search');
        
        if (titleInput) titleInput.value = '';
        if (contentInput) contentInput.value = '';
        if (searchInput) searchInput.value = '';
        
        // Reset template selection
        document.querySelectorAll('input[name="template"]').forEach(radio => {
            radio.checked = false;
        });
        
        // Reset audience selection to "all"
        const allUsersRadio = document.querySelector('input[name="targetType"][value="all"]');
        if (allUsersRadio) allUsersRadio.checked = true;
        
        // Reset filters
        this.clearFilters();
        
        // Reset character counts
        const titleCharCount = document.getElementById('title-char-count');
        const contentCharCount = document.getElementById('content-char-count');
        
        if (titleCharCount) titleCharCount.textContent = '0/100';
        if (contentCharCount) titleCharCount.className = 'text-sm text-gray-400';
        if (contentCharCount) contentCharCount.textContent = '0/1000';
        if (contentCharCount) contentCharCount.className = 'text-sm text-gray-400';
        
        // Hide progress bar
        const progressEl = document.getElementById('send-progress');
        if (progressEl) progressEl.classList.add('hidden');
        
        // Reset confirmation checkbox
        const confirmCheckbox = document.getElementById('confirm-send');
        if (confirmCheckbox) confirmCheckbox.checked = false;
        
        // Reload initial data
        this.loadTargetUsers();
        
        console.log('✅ Form reset complete');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AdminMassMessaging();
});
