// Transaction Management JavaScript
class TransactionManager {
    constructor() {
        this.currentPage = 1;
        this.limit = 20;
        this.filters = {
            status: 'all',
            riskLevel: 'all',
            paymentMethod: 'all',
            search: ''
        };
        this.currentTransactionId = null;
        this.init();
    }

    async init() {
        // Check admin access first
        const hasAccess = await checkAdminAccess();
        if (!hasAccess) {
            return;
        }
        
        this.loadTransactions();
        this.loadStats();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.setupRealtimeUpdates();
    }

    setupEventListeners() {
        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.matches('.actions-btn')) {
                document.querySelectorAll('.actions-menu').forEach(menu => {
                    menu.classList.remove('show');
                });
            }
        });

        // Modal close on outside click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
    }

    async loadTransactions() {
        try {
            this.showLoading(true);
            
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.limit,
                ...this.filters
            });

            const response = await fetch(`/api/admin/transactions?${params}`);
            const data = await response.json();

            if (data.success) {
                this.renderTransactions(data.data);
                this.renderPagination(data.pagination);
            } else {
                this.showError('Failed to load transactions');
            }
        } catch (error) {
            console.error('Error loading transactions:', error);
            this.showError('Error loading transactions');
        } finally {
            this.showLoading(false);
        }
    }

    async loadStats() {
        try {
            const response = await fetch('/api/admin/transactions/stats');
            const data = await response.json();

            if (data.success) {
                this.updateStatsCards(data.data);
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    updateStatsCards(stats) {
        document.getElementById('totalTransactions').textContent = stats.total || 0;
        document.getElementById('completedTransactions').textContent = stats.completed || 0;
        document.getElementById('pendingTransactions').textContent = stats.pending || 0;
        document.getElementById('disputedTransactions').textContent = stats.disputed || 0;
        document.getElementById('totalAmount').textContent = this.formatCurrency(stats.totalAmount || 0);
        document.getElementById('highRiskTransactions').textContent = stats.highRisk || 0;
    }

    renderTransactions(transactions) {
        const container = document.getElementById('transactionsContent');
        
        if (!transactions || transactions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h3>No transactions found</h3>
                    <p>Try adjusting your filters or create a new transaction.</p>
                </div>
            `;
            return;
        }

        const tableHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Transaction ID</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Buyer</th>
                        <th>Seller</th>
                        <th>Status</th>
                        <th>Risk</th>
                        <th>Payment</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${transactions.map(transaction => this.renderTransactionRow(transaction)).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = tableHTML;
    }

    renderTransactionRow(transaction) {
        const riskClass = `risk-${transaction.protection?.riskLevel || 'medium'}`;
        const statusClass = `status-${transaction.status}`;
        
        return `
            <tr>
                <td>
                    <span class="transaction-id">${transaction.transactionId}</span>
                </td>
                <td>${this.formatDate(transaction.createdAt)}</td>
                <td>
                    <span class="amount">${this.formatCurrency(transaction.amount)} ${transaction.currency}</span>
                </td>
                <td>
                    <div class="user-info">
                        <div class="user-avatar">${this.getInitials(transaction.buyer?.fullName)}</div>
                        <div class="user-details">
                            <div class="user-name">${transaction.buyer?.fullName || 'N/A'}</div>
                            <div class="user-email">${transaction.buyer?.email || 'N/A'}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="user-info">
                        <div class="user-avatar">${this.getInitials(transaction.seller?.fullName)}</div>
                        <div class="user-details">
                            <div class="user-name">${transaction.seller?.fullName || 'N/A'}</div>
                            <div class="user-email">${transaction.seller?.email || 'N/A'}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="status-badge ${statusClass}">${transaction.status}</span>
                </td>
                <td>
                    <span class="risk-badge ${riskClass}">${transaction.protection?.riskLevel || 'medium'}</span>
                </td>
                <td>
                    <small>${this.formatPaymentMethod(transaction.paymentMethod)}</small>
                </td>
                <td>
                    <div class="actions-dropdown">
                        <button class="actions-btn" onclick="toggleActionsMenu('${transaction._id}')">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <div class="actions-menu" id="actions-${transaction._id}">
                            <a href="#" onclick="viewTransaction('${transaction._id}')">
                                <i class="fas fa-eye"></i> View Details
                            </a>
                            <a href="#" onclick="showStatusModal('${transaction._id}')">
                                <i class="fas fa-edit"></i> Update Status
                            </a>
                            ${transaction.status === 'pending' || transaction.status === 'processing' ? `
                                <a href="#" onclick="confirmTransaction('${transaction._id}', 'buyer')">
                                    <i class="fas fa-check"></i> Buyer Confirm
                                </a>
                                <a href="#" onclick="confirmTransaction('${transaction._id}', 'seller')">
                                    <i class="fas fa-check"></i> Seller Confirm
                                </a>
                            ` : ''}
                            ${transaction.escrow?.enabled && !transaction.escrow?.released ? `
                                <a href="#" onclick="releaseEscrow('${transaction._id}')">
                                    <i class="fas fa-unlock"></i> Release Escrow
                                </a>
                            ` : ''}
                            ${transaction.status !== 'refunded' ? `
                                <a href="#" onclick="showRefundModal('${transaction._id}')" class="text-danger">
                                    <i class="fas fa-undo"></i> Process Refund
                                </a>
                            ` : ''}
                            <a href="#" onclick="addRiskFlag('${transaction._id}')" class="text-warning">
                                <i class="fas fa-exclamation-triangle"></i> Add Risk Flag
                            </a>
                            <a href="#" onclick="addAdminNote('${transaction._id}')" class="text-info">
                                <i class="fas fa-sticky-note"></i> Add Note
                            </a>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }

    renderPagination(pagination) {
        const container = document.getElementById('pagination');
        
        if (pagination.pages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = `
            <button onclick="transactionManager.goToPage(${pagination.currentPage - 1})" 
                    ${pagination.currentPage <= 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
        `;

        for (let i = 1; i <= pagination.pages; i++) {
            if (i === 1 || i === pagination.pages || (i >= pagination.currentPage - 2 && i <= pagination.currentPage + 2)) {
                html += `
                    <button onclick="transactionManager.goToPage(${i})" 
                            class="${i === pagination.currentPage ? 'active' : ''}">
                        ${i}
                    </button>
                `;
            } else if (i === pagination.currentPage - 3 || i === pagination.currentPage + 3) {
                html += '<span>...</span>';
            }
        }

        html += `
            <button onclick="transactionManager.goToPage(${pagination.currentPage + 1})" 
                    ${pagination.currentPage >= pagination.pages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        `;

        container.innerHTML = html;
    }

    async viewTransaction(transactionId) {
        try {
            const response = await fetch(`/api/admin/transactions/${transactionId}`);
            const data = await response.json();

            if (data.success) {
                this.showTransactionDetails(data.data);
            } else {
                this.showError('Failed to load transaction details');
            }
        } catch (error) {
            console.error('Error loading transaction details:', error);
            this.showError('Error loading transaction details');
        }
    }

    showTransactionDetails(transaction) {
        const modalBody = document.getElementById('modalBody');
        const modalFooter = document.getElementById('modalFooter');
        
        modalBody.innerHTML = `
            <div class="transaction-details">
                <div class="detail-section">
                    <h3>Basic Information</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Transaction ID:</label>
                            <span>${transaction.transactionId}</span>
                        </div>
                        <div class="detail-item">
                            <label>Status:</label>
                            <span class="status-badge status-${transaction.status}">${transaction.status}</span>
                        </div>
                        <div class="detail-item">
                            <label>Amount:</label>
                            <span class="amount">${this.formatCurrency(transaction.amount)} ${transaction.currency}</span>
                        </div>
                        <div class="detail-item">
                            <label>Risk Level:</label>
                            <span class="risk-badge risk-${transaction.protection?.riskLevel}">${transaction.protection?.riskLevel}</span>
                        </div>
                        <div class="detail-item">
                            <label>Created:</label>
                            <span>${this.formatDate(transaction.createdAt)}</span>
                        </div>
                        <div class="detail-item">
                            <label>Payment Method:</label>
                            <span>${this.formatPaymentMethod(transaction.paymentMethod)}</span>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h3>Parties</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Buyer:</label>
                            <div>
                                <div>${transaction.buyer?.fullName}</div>
                                <small>${transaction.buyer?.email}</small>
                            </div>
                        </div>
                        <div class="detail-item">
                            <label>Seller:</label>
                            <div>
                                <div>${transaction.seller?.fullName}</div>
                                <small>${transaction.seller?.email}</small>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h3>Product</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Product:</label>
                            <span>${transaction.product?.title || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Order:</label>
                            <span>${transaction.order?.orderNumber || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                ${transaction.protection?.flags?.length > 0 ? `
                    <div class="detail-section">
                        <h3>Risk Flags</h3>
                        <div class="flags-list">
                            ${transaction.protection.flags.map(flag => `
                                <div class="flag-item flag-${flag.severity}">
                                    <i class="fas fa-flag"></i>
                                    <span>${flag.type}: ${flag.description || 'No description'}</span>
                                    <small>${this.formatDate(flag.detectedAt)}</small>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                ${transaction.timeline?.length > 0 ? `
                    <div class="detail-section">
                        <h3>Timeline</h3>
                        <div class="timeline">
                            ${transaction.timeline.slice(-10).reverse().map(entry => `
                                <div class="timeline-item">
                                    <div class="timeline-time">${this.formatDate(entry.timestamp)}</div>
                                    <div class="timeline-content">
                                        <strong>${entry.action}</strong> by ${entry.actorType}
                                        ${entry.description ? `<div>${entry.description}</div>` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                ${transaction.messages?.length > 0 ? `
                    <div class="detail-section">
                        <h3>Messages</h3>
                        <div class="messages-list">
                            ${transaction.messages.slice(-5).reverse().map(msg => `
                                <div class="message-item ${msg.senderType}">
                                    <div class="message-header">
                                        <strong>${msg.senderType}</strong>
                                        <small>${this.formatDate(msg.timestamp)}</small>
                                    </div>
                                    <div class="message-content">${msg.content}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        modalFooter.innerHTML = `
            <button class="btn btn-secondary" onclick="transactionManager.closeModal('transactionModal')">Close</button>
            <button class="btn btn-primary" onclick="transactionManager.showStatusModal('${transaction._id}')">Update Status</button>
        `;

        this.openModal('transactionModal');
    }

    async createTransaction() {
        try {
            const formData = new FormData(document.getElementById('createTransactionForm'));
            const data = Object.fromEntries(formData);

            const response = await fetch('/api/admin/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                this.closeModal('createTransactionModal');
                this.loadTransactions();
                this.loadStats();
                this.showSuccess('Transaction created successfully');
            } else {
                this.showError(result.message || 'Failed to create transaction');
            }
        } catch (error) {
            console.error('Error creating transaction:', error);
            this.showError('Error creating transaction');
        }
    }

    async updateTransactionStatus() {
        if (!this.currentTransactionId) return;

        try {
            const status = document.getElementById('newStatus').value;
            const reason = document.getElementById('statusReason').value;

            const response = await fetch(`/api/admin/transactions/${this.currentTransactionId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status, reason })
            });

            const result = await response.json();

            if (result.success) {
                this.closeModal('statusModal');
                this.loadTransactions();
                this.loadStats();
                this.showSuccess('Transaction status updated successfully');
            } else {
                this.showError(result.message || 'Failed to update status');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            this.showError('Error updating status');
        }
    }

    async confirmTransaction(transactionId, userType) {
        try {
            const response = await fetch(`/api/admin/transactions/${transactionId}/confirm`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userType })
            });

            const result = await response.json();

            if (result.success) {
                this.loadTransactions();
                this.showSuccess(`Transaction confirmed by ${userType}`);
            } else {
                this.showError(result.message || 'Failed to confirm transaction');
            }
        } catch (error) {
            console.error('Error confirming transaction:', error);
            this.showError('Error confirming transaction');
        }
    }

    async releaseEscrow(transactionId) {
        if (!confirm('Are you sure you want to release the escrow? This will complete the transaction.')) {
            return;
        }

        try {
            const reason = prompt('Reason for releasing escrow (optional):') || 'Escrow released by administrator';

            const response = await fetch(`/api/admin/transactions/${transactionId}/release-escrow`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason })
            });

            const result = await response.json();

            if (result.success) {
                this.loadTransactions();
                this.loadStats();
                this.showSuccess('Escrow released successfully');
            } else {
                this.showError(result.message || 'Failed to release escrow');
            }
        } catch (error) {
            console.error('Error releasing escrow:', error);
            this.showError('Error releasing escrow');
        }
    }

    async processRefund(transactionId) {
        const amount = prompt('Refund amount (leave empty for full refund):');
        const reason = prompt('Refund reason:');

        if (!reason) {
            this.showError('Refund reason is required');
            return;
        }

        try {
            const response = await fetch(`/api/admin/transactions/${transactionId}/refund`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    amount: amount ? parseFloat(amount) : null,
                    reason 
                })
            });

            const result = await response.json();

            if (result.success) {
                this.loadTransactions();
                this.loadStats();
                this.showSuccess('Refund processed successfully');
            } else {
                this.showError(result.message || 'Failed to process refund');
            }
        } catch (error) {
            console.error('Error processing refund:', error);
            this.showError('Error processing refund');
        }
    }

    async addRiskFlag(transactionId) {
        const type = prompt('Risk flag type (e.g., suspicious_activity, high_value_transaction):');
        const severity = prompt('Severity (low, medium, high):') || 'medium';
        const description = prompt('Description:');

        if (!type) {
            this.showError('Risk flag type is required');
            return;
        }

        try {
            const response = await fetch(`/api/admin/transactions/${transactionId}/risk-flag`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ type, severity, description })
            });

            const result = await response.json();

            if (result.success) {
                this.loadTransactions();
                this.showSuccess('Risk flag added successfully');
            } else {
                this.showError(result.message || 'Failed to add risk flag');
            }
        } catch (error) {
            console.error('Error adding risk flag:', error);
            this.showError('Error adding risk flag');
        }
    }

    async addAdminNote(transactionId) {
        const note = prompt('Admin note:');

        if (!note) {
            this.showError('Note content is required');
            return;
        }

        try {
            const response = await fetch(`/api/admin/transactions/${transactionId}/note`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ note })
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccess('Admin note added successfully');
            } else {
                this.showError(result.message || 'Failed to add admin note');
            }
        } catch (error) {
            console.error('Error adding admin note:', error);
            this.showError('Error adding admin note');
        }
    }

    // UI Helper Methods
    showLoading(show) {
        const loading = document.getElementById('loading');
        const content = document.getElementById('transactionsContent');
        
        if (show) {
            loading.classList.add('show');
            content.style.display = 'none';
        } else {
            loading.classList.remove('show');
            content.style.display = 'block';
        }
    }

    openModal(modalId) {
        document.getElementById(modalId).classList.add('show');
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('show');
    }

    showSuccess(message) {
        // Simple alert for now - could be replaced with a toast notification
        alert(`Success: ${message}`);
    }

    showError(message) {
        // Simple alert for now - could be replaced with a toast notification
        alert(`Error: ${message}`);
    }

    // Utility Methods
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    formatPaymentMethod(method) {
        return method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    getInitials(name) {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }

    // Navigation Methods
    goToPage(page) {
        this.currentPage = page;
        this.loadTransactions();
    }

    applyFilters() {
        this.filters = {
            status: document.getElementById('statusFilter').value,
            riskLevel: document.getElementById('riskFilter').value,
            paymentMethod: document.getElementById('paymentFilter').value,
            search: document.getElementById('searchFilter').value
        };
        this.currentPage = 1;
        this.loadTransactions();
    }

    resetFilters() {
        document.getElementById('statusFilter').value = 'all';
        document.getElementById('riskFilter').value = 'all';
        document.getElementById('paymentFilter').value = 'all';
        document.getElementById('searchFilter').value = '';
        this.filters = {
            status: 'all',
            riskLevel: 'all',
            paymentMethod: 'all',
            search: ''
        };
        this.currentPage = 1;
        this.loadTransactions();
    }

    // Advanced search functionality
    async performAdvancedSearch(searchCriteria) {
        try {
            this.showLoading(true);
            
            const response = await fetch('/api/admin/transactions/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(searchCriteria)
            });

            const data = await response.json();

            if (data.success) {
                this.renderTransactions(data.data);
                this.renderPagination(data.pagination);
            } else {
                this.showError('Search failed');
            }
        } catch (error) {
            console.error('Search error:', error);
            this.showError('Error performing search');
        } finally {
            this.showLoading(false);
        }
    }

    // Export transactions
    async exportTransactions(format = 'csv') {
        try {
            const params = new URLSearchParams({
                format,
                ...this.filters
            });

            const response = await fetch(`/api/admin/transactions/export?${params}`);
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `transactions.${format}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                this.showSuccess('Transactions exported successfully');
            } else {
                this.showError('Export failed');
            }
        } catch (error) {
            console.error('Export error:', error);
            this.showError('Error exporting transactions');
        }
    }

    // Bulk operations
    async bulkUpdateStatus(transactionIds, newStatus, reason) {
        try {
            const response = await fetch('/api/admin/transactions/bulk-status', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ transactionIds, newStatus, reason })
            });

            const data = await response.json();

            if (data.success) {
                this.loadTransactions();
                this.loadStats();
                this.showSuccess(`Updated ${data.updated} transactions`);
            } else {
                this.showError('Bulk update failed');
            }
        } catch (error) {
            console.error('Bulk update error:', error);
            this.showError('Error performing bulk update');
        }
    }

    // Real-time updates (would integrate with WebSocket)
    setupRealtimeUpdates() {
        // This would connect to WebSocket for real-time transaction updates
        // For now, we'll poll every 30 seconds
        setInterval(() => {
            if (document.visibilityState === 'visible') {
                this.loadStats();
                // Only reload transactions if filters haven't changed
                if (this.currentPage === 1 && Object.values(this.filters).every(v => v === 'all' || v === '')) {
                    this.loadTransactions();
                }
            }
        }, 30000);
    }

    // Keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K for search focus
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                document.getElementById('searchFilter').focus();
            }
            
            // Ctrl/Cmd + N for new transaction
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                showCreateTransactionModal();
            }
            
            // Escape to close modals
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal.show').forEach(modal => {
                    this.closeModal(modal.id);
                });
            }
        });
    }

    // Date range filtering
    async filterByDateRange(startDate, endDate) {
        try {
            this.showLoading(true);
            
            const response = await fetch('/api/admin/transactions/date-range', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ startDate, endDate })
            });

            const data = await response.json();

            if (data.success) {
                this.renderTransactions(data.data);
                this.renderPagination(data.pagination);
            } else {
                this.showError('Date range filter failed');
            }
        } catch (error) {
            console.error('Date range filter error:', error);
            this.showError('Error filtering by date range');
        } finally {
            this.showLoading(false);
        }
    }

    // Quick filters
    applyQuickFilter(filterType) {
        switch (filterType) {
            case 'today':
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                this.filterByDateRange(today.toISOString(), new Date().toISOString());
                break;
            case 'week':
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                this.filterByDateRange(weekAgo.toISOString(), new Date().toISOString());
                break;
            case 'month':
                const monthAgo = new Date();
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                this.filterByDateRange(monthAgo.toISOString(), new Date().toISOString());
                break;
            case 'high_risk':
                this.loadHighRiskTransactions();
                break;
            case 'pending':
                this.filters.status = 'pending';
                this.applyFilters();
                break;
            case 'disputed':
                this.filters.status = 'disputed';
                this.applyFilters();
                break;
        }
    }

    async loadHighRiskTransactions() {
        try {
            this.showLoading(true);
            
            const response = await fetch('/api/admin/transactions/high-risk');
            const data = await response.json();

            if (data.success) {
                this.renderTransactions(data.data);
                this.renderPagination(data.pagination);
            } else {
                this.showError('Failed to load high-risk transactions');
            }
        } catch (error) {
            console.error('Error loading high-risk transactions:', error);
            this.showError('Error loading high-risk transactions');
        } finally {
            this.showLoading(false);
        }
    }
}

// Global functions for onclick handlers
function toggleActionsMenu(transactionId) {
    const menu = document.getElementById(`actions-${transactionId}`);
    const allMenus = document.querySelectorAll('.actions-menu');
    
    allMenus.forEach(m => {
        if (m !== menu) {
            m.classList.remove('show');
        }
    });
    
    menu.classList.toggle('show');
}

function viewTransaction(transactionId) {
    transactionManager.viewTransaction(transactionId);
}

function showStatusModal(transactionId) {
    transactionManager.currentTransactionId = transactionId;
    transactionManager.openModal('statusModal');
}

function showCreateTransactionModal() {
    transactionManager.openModal('createTransactionModal');
}

function createTransaction() {
    transactionManager.createTransaction();
}

function updateTransactionStatus() {
    transactionManager.updateTransactionStatus();
}

function confirmTransaction(transactionId, userType) {
    transactionManager.confirmTransaction(transactionId, userType);
}

function releaseEscrow(transactionId) {
    transactionManager.releaseEscrow(transactionId);
}

function showRefundModal(transactionId) {
    transactionManager.processRefund(transactionId);
}

function addRiskFlag(transactionId) {
    transactionManager.addRiskFlag(transactionId);
}

function addAdminNote(transactionId) {
    transactionManager.addAdminNote(transactionId);
}

function closeModal(modalId) {
    transactionManager.closeModal(modalId);
}

function applyFilters() {
    transactionManager.applyFilters();
}

function resetFilters() {
    transactionManager.resetFilters();
}

function handleSearch(event) {
    if (event.key === 'Enter') {
        transactionManager.applyFilters();
    }
}

function loadHighRiskTransactions() {
    transactionManager.loadHighRiskTransactions();
}

// Initialize the transaction manager
const transactionManager = new TransactionManager();
