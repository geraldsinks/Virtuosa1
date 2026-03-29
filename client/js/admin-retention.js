class AdminRetentionManagement {
    constructor() {
        this.token = localStorage.getItem('token');
        this.currentConfig = null;
        this.archivePage = 1;
        this.archiveLimit = 10;
        
        this.init();
    }

    async init() {
        if (!this.token) {
            alert('Please log in to access admin features');
            window.location.href = '/pages/login.html';
            return;
        }

        console.log('🗂️ Initializing retention management system...');
        
        this.setupEventListeners();
        await this.loadStats();
        await this.loadConfig();
        await this.loadArchive();
        
        console.log('✅ Retention management system initialized');
    }

    setupEventListeners() {
        // Refresh buttons
        document.getElementById('refresh-stats').addEventListener('click', () => this.loadStats());
        document.getElementById('refresh-archive').addEventListener('click', () => this.loadArchive());
        
        // Cleanup
        document.getElementById('run-cleanup').addEventListener('click', () => this.runCleanup());
        
        // Configuration
        document.getElementById('edit-default-config').addEventListener('click', () => this.openConfigModal());
        document.getElementById('close-config-modal').addEventListener('click', () => this.closeConfigModal());
        document.getElementById('cancel-config').addEventListener('click', () => this.closeConfigModal());
        document.getElementById('config-form').addEventListener('submit', (e) => this.saveConfig(e));
        
        // Archive filter
        document.getElementById('archive-filter').addEventListener('change', () => {
            this.archivePage = 1;
            this.loadArchive();
        });
    }

    async loadStats() {
        try {
            console.log('📊 Loading retention statistics...');
            console.log('🔍 Checking auth-helper availability:', !!window.authHelper);
            console.log('🔑 Token check:', this.token ? 'Token found' : 'No token');
            
            if (!window.authHelper) {
                console.error('❌ auth-helper not available');
                this.showError('Authentication helper not loaded');
                return;
            }
            
            // First test the connection
            console.log('🧪 Testing connection...');
            try {
                const testResponse = await window.authHelper.authenticatedFetch('/api/admin/retention/test');
                if (testResponse.ok) {
                    const testData = await testResponse.json();
                    console.log('✅ Test successful:', testData);
                } else {
                    console.error('❌ Test failed:', testResponse.status);
                }
            } catch (testError) {
                console.error('❌ Test error:', testError);
                this.showError('Connection test failed');
                return;
            }
            
            console.log('📡 Making API call to /api/admin/retention/stats...');
            
            const response = await window.authHelper.authenticatedFetch('/api/admin/retention/stats');
            
            console.log('📊 Response status:', response.status, response.statusText);
            console.log('📊 Response headers:', response.headers);
            
            if (response.ok) {
                const stats = await response.json();
                console.log('✅ Statistics loaded:', stats);
                this.updateStatsDisplay(stats);
            } else if (response.status === 401 || response.status === 403) {
                // Authentication or authorization error - redirect to login
                console.error('❌ Authentication error:', response.status);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/pages/login.html';
                return;
            } else {
                console.error('❌ Response not OK:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('❌ Error response body:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ Error loading stats:', error);
            console.error('❌ Full error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            this.showError(`Failed to load statistics: ${error.message}`);
        }
    }

    updateStatsDisplay(stats) {
        // Update count cards
        document.getElementById('total-messages').textContent = stats.totalMessages.toLocaleString();
        document.getElementById('expired-messages').textContent = stats.expiredMessages.toLocaleString();
        document.getElementById('archived-messages').textContent = stats.archivedMessages.toLocaleString();
        document.getElementById('expiring-soon').textContent = stats.expiringSoon.toLocaleString();
        
        // Update policy breakdown
        document.getElementById('policy-standard-count').textContent = (stats.messagesByPolicy.standard || 0).toLocaleString();
        document.getElementById('policy-extended-count').textContent = (stats.messagesByPolicy.extended || 0).toLocaleString();
        document.getElementById('policy-permanent-count').textContent = (stats.messagesByPolicy.permanent || 0).toLocaleString();
        document.getElementById('policy-custom-count').textContent = (stats.messagesByPolicy.custom || 0).toLocaleString();
        
        // Update storage statistics
        const totalMB = (stats.storage.estimatedTotal / 1024 / 1024).toFixed(2);
        const archivedMB = (stats.storage.archived / 1024 / 1024).toFixed(2);
        const savingsMB = (stats.storage.savings / 1024 / 1024).toFixed(2);
        
        document.getElementById('storage-total').textContent = `${totalMB} MB`;
        document.getElementById('storage-archived').textContent = `${archivedMB} MB`;
        document.getElementById('storage-savings').textContent = `${savingsMB} MB`;
        
        // Update storage bar
        const percentage = stats.storage.estimatedTotal > 0 ? 
            (stats.storage.archived / stats.storage.estimatedTotal * 100).toFixed(1) : 0;
        document.getElementById('storage-bar').style.width = `${percentage}%`;
        document.getElementById('storage-percentage').textContent = `${percentage}% archived`;
        
        // Update cleanup info
        const lastCleanup = stats.lastCleanup ? 
            new Date(stats.lastCleanup).toLocaleDateString() : 'Never';
        document.getElementById('last-cleanup').textContent = lastCleanup;
    }

    async loadConfig() {
        try {
            console.log('⚙️ Loading retention configuration...');
            
            const response = await window.authHelper.authenticatedFetch('/api/admin/retention/config');
            
            if (response.ok) {
                const data = await response.json();
                const defaultConfig = data.configs.find(c => c.name === 'default');
                
                if (defaultConfig) {
                    this.currentConfig = defaultConfig;
                    this.updateConfigDisplay(defaultConfig);
                }
                
                console.log('✅ Configuration loaded');
            } else if (response.status === 401 || response.status === 403) {
                // Authentication or authorization error - redirect to login
                console.error('❌ Authentication error in loadConfig:', response.status);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/pages/login.html';
                return;
            } else {
                throw new Error('Failed to load configuration');
            }
        } catch (error) {
            console.error('❌ Error loading config:', error);
            this.showError('Failed to load configuration');
        }
    }

    updateConfigDisplay(config) {
        document.getElementById('config-standard').textContent = `${config.standardRetention} days`;
        document.getElementById('config-extended').textContent = `${config.extendedRetention} days`;
        document.getElementById('config-mass').textContent = `${config.massMessageRetention} days`;
        document.getElementById('config-archive').textContent = config.autoArchiveEnabled ? 'Enabled' : 'Disabled';
        document.getElementById('config-frequency').textContent = config.cleanupSchedule.frequency;
        
        // Update next cleanup time
        if (config.cleanupSchedule.nextRun) {
            const nextRun = new Date(config.cleanupSchedule.nextRun);
            document.getElementById('next-cleanup').textContent = nextRun.toLocaleDateString();
        }
    }

    openConfigModal() {
        if (!this.currentConfig) return;
        
        // Populate form with current config
        document.getElementById('standard-retention').value = this.currentConfig.standardRetention;
        document.getElementById('extended-retention').value = this.currentConfig.extendedRetention;
        document.getElementById('mass-retention').value = this.currentConfig.massMessageRetention;
        document.getElementById('cleanup-frequency').value = this.currentConfig.cleanupSchedule.frequency;
        document.getElementById('auto-archive-enabled').checked = this.currentConfig.autoArchiveEnabled;
        
        // Show modal
        document.getElementById('config-modal').classList.remove('hidden');
    }

    closeConfigModal() {
        document.getElementById('config-modal').classList.add('hidden');
    }

    async saveConfig(e) {
        e.preventDefault();
        
        try {
            console.log('💾 Saving retention configuration...');
            
            const formData = {
                standardRetention: parseInt(document.getElementById('standard-retention').value),
                extendedRetention: parseInt(document.getElementById('extended-retention').value),
                massMessageRetention: parseInt(document.getElementById('mass-retention').value),
                cleanupSchedule: {
                    ...this.currentConfig.cleanupSchedule,
                    frequency: document.getElementById('cleanup-frequency').value
                },
                autoArchiveEnabled: document.getElementById('auto-archive-enabled').checked
            };
            
            const response = await window.authHelper.authenticatedFetch(`/api/admin/retention/config/${this.currentConfig._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            if (response.ok) {
                const result = await response.json();
                this.currentConfig = result.config;
                this.updateConfigDisplay(result.config);
                this.closeConfigModal();
                this.showSuccess('Configuration saved successfully');
                console.log('✅ Configuration saved');
            } else if (response.status === 401 || response.status === 403) {
                // Authentication or authorization error - redirect to login
                console.error('❌ Authentication error in saveConfig:', response.status);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/pages/login.html';
                return;
            } else {
                throw new Error('Failed to save configuration');
            }
        } catch (error) {
            console.error('❌ Error saving config:', error);
            this.showError('Failed to save configuration');
        }
    }

    async runCleanup() {
        if (!confirm('Are you sure you want to run the cleanup process? This will archive and delete expired messages.')) {
            return;
        }
        
        try {
            console.log('🧹 Running manual cleanup...');
            
            const button = document.getElementById('run-cleanup');
            const originalText = button.innerHTML;
            button.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> <span>Running...</span>';
            button.disabled = true;
            
            const response = await window.authHelper.authenticatedFetch('/api/admin/retention/cleanup', {
                method: 'POST'
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showSuccess(`Cleanup completed: ${result.result.archivedCount} archived, ${result.result.deletedCount} deleted`);
                
                // Refresh stats
                await this.loadStats();
                await this.loadArchive();
                
                console.log('✅ Cleanup completed:', result);
            } else if (response.status === 401 || response.status === 403) {
                // Authentication or authorization error - redirect to login
                console.error('❌ Authentication error in runCleanup:', response.status);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/pages/login.html';
                return;
            } else {
                throw new Error('Cleanup failed');
            }
        } catch (error) {
            console.error('❌ Error running cleanup:', error);
            this.showError('Failed to run cleanup');
        } finally {
            // Reset button
            const button = document.getElementById('run-cleanup');
            button.innerHTML = '<i data-lucide="trash-2" class="w-4 h-4"></i> <span>Run Cleanup</span>';
            button.disabled = false;
            
            // Reinitialize icons
            if (window.lucide) {
                window.lucide.createIcons();
            }
        }
    }

    async loadArchive() {
        try {
            console.log('📦 Loading message archive...');
            
            const filter = document.getElementById('archive-filter').value;
            const params = new URLSearchParams({
                page: this.archivePage,
                limit: this.archiveLimit
            });
            
            if (filter) params.set('reason', filter);
            
            const response = await window.authHelper.authenticatedFetch(`/api/admin/retention/archive?${params}`);
            
            if (response.ok) {
                const data = await response.json();
                this.updateArchiveDisplay(data);
                console.log('✅ Archive loaded:', data.archives.length, 'items');
            } else if (response.status === 401 || response.status === 403) {
                // Authentication or authorization error - redirect to login
                console.error('❌ Authentication error in loadArchive:', response.status);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/pages/login.html';
                return;
            } else {
                throw new Error('Failed to load archive');
            }
        } catch (error) {
            console.error('❌ Error loading archive:', error);
            this.showError('Failed to load archive');
        }
    }

    updateArchiveDisplay(data) {
        const tableContainer = document.getElementById('archive-table');
        
        if (data.archives.length === 0) {
            tableContainer.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i data-lucide="package" class="w-12 h-12 mx-auto mb-4 text-gray-400"></i>
                    <p>No archived messages found</p>
                </div>
            `;
            return;
        }
        
        const rows = data.archives.map(archive => {
            const message = archive.messageData;
            const archivedDate = new Date(archive.archivedAt).toLocaleDateString();
            const originalDate = new Date(message.createdAt).toLocaleDateString();
            
            return `
                <tr class="border-b hover:bg-gray-50">
                    <td class="px-4 py-3">
                        <div class="max-w-xs truncate">
                            <div class="font-medium text-gray-800">${message.massMessageTitle || 'Direct Message'}</div>
                            <div class="text-sm text-gray-500">${message.content.substring(0, 100)}...</div>
                        </div>
                    </td>
                    <td class="px-4 py-3">
                        <span class="text-sm bg-gray-100 text-gray-800 px-2 py-1 rounded">
                            ${archive.archiveReason.replace('_', ' ')}
                        </span>
                    </td>
                    <td class="px-4 py-3">
                        <div class="text-sm">
                            <div>Created: ${originalDate}</div>
                            <div class="text-gray-500">Archived: ${archivedDate}</div>
                        </div>
                    </td>
                    <td class="px-4 py-3">
                        <span class="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            ${archive.accessLevel}
                        </span>
                    </td>
                    <td class="px-4 py-3">
                        <button onclick="retentionManager.restoreMessage('${archive._id}')" 
                                class="text-sm text-gold hover:text-gold/80 font-medium">
                            Restore
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
        tableContainer.innerHTML = `
            <table class="w-full">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">Message</th>
                        <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">Reason</th>
                        <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">Dates</th>
                        <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">Access Level</th>
                        <th class="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    ${rows}
                </tbody>
            </table>
            
            ${data.pagination.pages > 1 ? `
                <div class="flex items-center justify-between mt-4 pt-4 border-t">
                    <div class="text-sm text-gray-600">
                        Showing ${((data.pagination.page - 1) * data.pagination.limit) + 1} to ${Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of ${data.pagination.total} items
                    </div>
                    <div class="flex space-x-2">
                        ${data.pagination.page > 1 ? `
                            <button onclick="retentionManager.changeArchivePage(${data.pagination.page - 1})" 
                                    class="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
                                Previous
                            </button>
                        ` : ''}
                        ${data.pagination.page < data.pagination.pages ? `
                            <button onclick="retentionManager.changeArchivePage(${data.pagination.page + 1})" 
                                    class="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
                                Next
                            </button>
                        ` : ''}
                    </div>
                </div>
            ` : ''}
        `;
    }

    changeArchivePage(page) {
        this.archivePage = page;
        this.loadArchive();
    }

    async restoreMessage(archiveId) {
        if (!confirm('Are you sure you want to restore this message?')) {
            return;
        }
        
        try {
            console.log('🔄 Restoring message from archive...');
            
            const response = await window.authHelper.authenticatedFetch(`/api/admin/retention/restore/${archiveId}`, {
                method: 'POST'
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showSuccess('Message restored successfully');
                
                // Refresh archive and stats
                await this.loadArchive();
                await this.loadStats();
                
                console.log('✅ Message restored:', result);
            } else if (response.status === 401 || response.status === 403) {
                // Authentication or authorization error - redirect to login
                console.error('❌ Authentication error in restoreMessage:', response.status);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/pages/login.html';
                return;
            } else {
                throw new Error('Failed to restore message');
            }
        } catch (error) {
            console.error('❌ Error restoring message:', error);
            this.showError('Failed to restore message');
        }
    }

    showSuccess(message) {
        // Create success notification
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2';
        notification.innerHTML = `
            <i data-lucide="check-circle" class="w-5 h-5"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        // Reinitialize icons
        if (window.lucide) {
            window.lucide.createIcons();
        }
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    showError(message) {
        // Create error notification
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2';
        notification.innerHTML = `
            <i data-lucide="alert-circle" class="w-5 h-5"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        // Reinitialize icons
        if (window.lucide) {
            window.lucide.createIcons();
        }
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize// Admin Retention JavaScript
// API_BASE is provided by config.js

document.addEventListener('DOMContentLoaded', async () => {
    // Check admin access first
    const hasAccess = await checkAdminAccess();
    if (!hasAccess) {
        return;
    }
    
    window.retentionManager = new AdminRetentionManagement();
});
