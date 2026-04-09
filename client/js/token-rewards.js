// Token Rewards System - Client-side Management
// API_BASE is provided by config.js

class TokenRewardsManager {
    constructor() {
        this.balance = 0;
        this.totalEarned = 0;
        this.totalSpent = 0;
        this.transactions = [];
        this.lastActivity = null;
        this.isLoaded = false;
    }

    // Initialize token rewards system
    async init() {
        try {
            await this.loadBalance();
            this.isLoaded = true;
            console.log('Token rewards system initialized');
        } catch (error) {
            console.error('Failed to initialize token rewards:', error);
        }
    }

    // Load user's token balance and recent transactions
    async loadBalance() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch(`${API_BASE}/tokens/balance`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load token balance');
            }

            const data = await response.json();
            this.balance = data.currentBalance;
            this.totalEarned = data.totalEarned;
            this.totalSpent = data.totalSpent;
            this.transactions = data.transactions || [];
            this.lastActivity = data.lastActivity;

            this.updateUI();
        } catch (error) {
            console.error('Error loading token balance:', error);
            throw error;
        }
    }

    // Earn tokens
    async earnTokens(amount, reason, referenceId = null, referenceType = 'general') {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch(`${API_BASE}/tokens/earn`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount,
                    reason,
                    referenceId,
                    referenceType
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to earn tokens');
            }

            const data = await response.json();
            this.balance = data.newBalance;
            
            // Add to transactions
            this.transactions.push({
                type: 'earned',
                amount,
                reason,
                referenceId,
                referenceType,
                createdAt: new Date(),
                _id: data.transactionId
            });

            this.updateUI();
            this.showNotification(`Earned ${amount} tokens!`, 'success');
            
            return data;
        } catch (error) {
            console.error('Error earning tokens:', error);
            this.showNotification(error.message, 'error');
            throw error;
        }
    }

    // Spend tokens
    async spendTokens(amount, reason, referenceId = null, referenceType = 'redemption') {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            if (this.balance < amount) {
                throw new Error('Insufficient token balance');
            }

            const response = await fetch(`${API_BASE}/tokens/spend`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount,
                    reason,
                    referenceId,
                    referenceType
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to spend tokens');
            }

            const data = await response.json();
            this.balance = data.newBalance;
            
            // Add to transactions
            this.transactions.push({
                type: 'spent',
                amount,
                reason,
                referenceId,
                referenceType,
                createdAt: new Date(),
                _id: data.transactionId
            });

            this.updateUI();
            this.showNotification(`Spent ${amount} tokens`, 'info');
            
            return data;
        } catch (error) {
            console.error('Error spending tokens:', error);
            this.showNotification(error.message, 'error');
            throw error;
        }
    }

    // Get transaction history with pagination
    async getTransactionHistory(page = 1, limit = 20, type = null) {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const params = new URLSearchParams({ page, limit });
            if (type) params.append('type', type);

            const response = await fetch(`${API_BASE}/tokens/history?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to get transaction history');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error getting transaction history:', error);
            throw error;
        }
    }

    // Update UI elements with current token balance
    updateUI() {
        // Update balance displays
        const balanceElements = document.querySelectorAll('.token-balance');
        balanceElements.forEach(element => {
            element.textContent = this.balance.toLocaleString();
        });

        // Update total earned displays
        const earnedElements = document.querySelectorAll('.total-earned');
        earnedElements.forEach(element => {
            element.textContent = this.totalEarned.toLocaleString();
        });

        // Update total spent displays
        const spentElements = document.querySelectorAll('.total-spent');
        spentElements.forEach(element => {
            element.textContent = this.totalSpent.toLocaleString();
        });

        // Show/hide token-related elements based on balance
        const hasTokens = this.balance > 0;
        const tokenActions = document.querySelectorAll('.token-action');
        tokenActions.forEach(element => {
            element.style.display = hasTokens ? 'block' : 'none';
        });

        // Update recent transactions if on token page
        this.updateTransactionsList();
    }

    // Update transactions list on UI
    updateTransactionsList() {
        const container = document.getElementById('recent-transactions');
        if (!container) return;

        const recentTransactions = this.transactions.slice(-5).reverse();
        
        if (recentTransactions.length === 0) {
            container.innerHTML = '<p class="text-gray-500">No recent transactions</p>';
            return;
        }

        container.innerHTML = recentTransactions.map(transaction => `
            <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                    <div class="font-medium ${transaction.type === 'earned' ? 'text-green-600' : 'text-red-600'}">
                        ${transaction.type === 'earned' ? '+' : '-'}${transaction.amount} tokens
                    </div>
                    <div class="text-sm text-gray-600">${transaction.reason}</div>
                    <div class="text-xs text-gray-400">${new Date(transaction.createdAt).toLocaleDateString()}</div>
                </div>
                <div class="${transaction.type === 'earned' ? 'text-green-500' : 'text-red-500'}">
                    ${transaction.type === 'earned' ? 'arrow_up' : 'arrow_down'}
                </div>
            </div>
        `).join('');
    }

    // Show notification
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 transform transition-all duration-300 ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // Check if user can afford something
    canAfford(amount) {
        return this.balance >= amount;
    }

    // Get formatted balance
    getFormattedBalance() {
        return this.balance.toLocaleString();
    }
}

// Create global instance
window.tokenRewards = new TokenRewardsManager();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.tokenRewards.init();
    });
} else {
    window.tokenRewards.init();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TokenRewardsManager;
}
