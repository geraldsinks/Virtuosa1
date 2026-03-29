const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const crypto = require('crypto');

class TransactionSafetyService {
    // Risk assessment engine
    static assessTransactionRisk(transaction) {
        const riskFactors = [];
        let riskScore = 50; // Base score

        // Amount-based risk
        if (transaction.amount > 1000) {
            riskFactors.push({ type: 'high_value_transaction', score: 10, description: 'High value transaction' });
            riskScore += 10;
        }
        if (transaction.amount > 5000) {
            riskFactors.push({ type: 'very_high_value_transaction', score: 15, description: 'Very high value transaction' });
            riskScore += 15;
        }

        // Payment method risk
        const paymentMethodRisk = {
            'crypto': 20,
            'bank_transfer': 10,
            'mobile_money': 5,
            'cash_on_delivery': 15,
            'credit_card': 0,
            'debit_card': 0,
            'paypal': 0,
            'stripe': 0
        };

        const paymentRisk = paymentMethodRisk[transaction.paymentMethod] || 0;
        if (paymentRisk > 0) {
            riskFactors.push({ 
                type: 'risky_payment_method', 
                score: paymentRisk, 
                description: `Risk associated with ${transaction.paymentMethod}` 
            });
            riskScore += paymentRisk;
        }

        // Geographic risk (international transactions)
        if (transaction.delivery?.address?.country && transaction.delivery.address.country !== 'US') {
            riskFactors.push({ type: 'international_transaction', score: 15, description: 'International transaction' });
            riskScore += 15;
        }

        // New user risk (placeholder - would check user account age)
        riskFactors.push({ type: 'new_user_check', score: 5, description: 'New user risk assessment needed' });
        riskScore += 5;

        // Rapid purchase pattern (placeholder - would check user's recent transactions)
        riskFactors.push({ type: 'rapid_purchase_pattern', score: 5, description: 'Rapid purchase pattern detected' });
        riskScore += 5;

        // Multiple payment attempts (placeholder)
        riskFactors.push({ type: 'multiple_attempts', score: 8, description: 'Multiple payment attempts detected' });
        riskScore += 8;

        return {
            riskScore: Math.min(100, Math.max(0, riskScore)),
            riskLevel: this.getRiskLevel(riskScore),
            riskFactors
        };
    }

    static getRiskLevel(score) {
        if (score >= 80) return 'critical';
        if (score >= 60) return 'high';
        if (score >= 40) return 'medium';
        return 'low';
    }

    // Fraud detection patterns
    static detectFraudPatterns(transaction) {
        const patterns = [];

        // Check for suspicious email patterns
        if (transaction.buyer?.email) {
            const email = transaction.buyer.email.toLowerCase();
            if (email.includes('temp') || email.includes('throwaway') || email.includes('10minutemail')) {
                patterns.push({
                    type: 'suspicious_email',
                    severity: 'high',
                    description: 'Suspicious email domain detected'
                });
            }
        }

        // Check for VPN/proxy usage (placeholder)
        if (transaction.metadata?.ipAddress) {
            // This would integrate with IP intelligence services
            patterns.push({
                type: 'vpn_detected',
                severity: 'medium',
                description: 'VPN or proxy usage detected'
            });
        }

        // Check for mismatched information
        if (transaction.delivery?.address && transaction.metadata?.ipAddress) {
            // This would check if IP location matches delivery address
            patterns.push({
                type: 'mismatched_info',
                severity: 'medium',
                description: 'Geographic mismatch detected'
            });
        }

        // Check for chargeback risk
        if (transaction.amount > 1000 && transaction.paymentMethod === 'credit_card') {
            patterns.push({
                type: 'chargeback_risk',
                severity: 'high',
                description: 'High chargeback risk for large credit card transaction'
            });
        }

        return patterns;
    }

    // Safety checks before transaction completion
    static async performSafetyChecks(transactionId) {
        try {
            const transaction = await Transaction.findById(transactionId)
                .populate('buyer', 'email createdAt')
                .populate('seller', 'email createdAt');

            if (!transaction) {
                throw new Error('Transaction not found');
            }

            const safetyReport = {
                transactionId: transaction._id,
                checks: [],
                overallStatus: 'safe',
                recommendations: []
            };

            // 1. Risk assessment
            const riskAssessment = this.assessTransactionRisk(transaction);
            safetyReport.checks.push({
                type: 'risk_assessment',
                status: riskAssessment.riskLevel === 'critical' ? 'failed' : 'passed',
                details: riskAssessment
            });

            // 2. Fraud detection
            const fraudPatterns = this.detectFraudPatterns(transaction);
            const hasHighRiskFraud = fraudPatterns.some(p => p.severity === 'high');
            safetyReport.checks.push({
                type: 'fraud_detection',
                status: hasHighRiskFraud ? 'failed' : 'passed',
                details: { patterns: fraudPatterns }
            });

            // 3. Escrow verification
            const escrowCheck = {
                type: 'escrow_verification',
                status: transaction.escrow?.enabled ? 'passed' : 'warning',
                details: {
                    enabled: transaction.escrow?.enabled || false,
                    released: transaction.escrow?.released || false,
                    autoReleaseAt: transaction.escrow?.autoReleaseAt
                }
            };
            safetyReport.checks.push(escrowCheck);

            // 4. Confirmation status
            const confirmationCheck = {
                type: 'confirmation_status',
                status: (transaction.confirmations?.buyer?.confirmed && transaction.confirmations?.seller?.confirmed) ? 'passed' : 'warning',
                details: {
                    buyerConfirmed: transaction.confirmations?.buyer?.confirmed || false,
                    sellerConfirmed: transaction.confirmations?.seller?.confirmed || false
                }
            };
            safetyReport.checks.push(confirmationCheck);

            // 5. Dispute check
            const disputeCheck = {
                type: 'dispute_check',
                status: transaction.dispute?.filed ? 'failed' : 'passed',
                details: {
                    disputeFiled: transaction.dispute?.filed || false,
                    disputeId: transaction.dispute?.disputeId
                }
            };
            safetyReport.checks.push(disputeCheck);

            // 6. Payment verification
            const paymentCheck = {
                type: 'payment_verification',
                status: transaction.status === 'payment_verified' ? 'passed' : 'warning',
                details: {
                    status: transaction.status,
                    paymentMethod: transaction.paymentMethod,
                    paymentGateway: transaction.paymentGateway
                }
            };
            safetyReport.checks.push(paymentCheck);

            // Determine overall status
            const failedChecks = safetyReport.checks.filter(check => check.status === 'failed');
            const warningChecks = safetyReport.checks.filter(check => check.status === 'warning');

            if (failedChecks.length > 0) {
                safetyReport.overallStatus = 'unsafe';
                safetyReport.recommendations.push('Manual review required before transaction completion');
            } else if (warningChecks.length > 2) {
                safetyReport.overallStatus = 'caution';
                safetyReport.recommendations.push('Proceed with caution - additional verification recommended');
            } else {
                safetyReport.overallStatus = 'safe';
                safetyReport.recommendations.push('Transaction appears safe to complete');
            }

            // Add risk-based recommendations
            if (riskAssessment.riskLevel === 'critical') {
                safetyReport.recommendations.push('CRITICAL: Immediate admin intervention required');
                safetyReport.recommendations.push('Consider freezing transaction');
            } else if (riskAssessment.riskLevel === 'high') {
                safetyReport.recommendations.push('HIGH RISK: Enhanced monitoring required');
                safetyReport.recommendations.push('Consider additional verification steps');
            }

            return safetyReport;
        } catch (error) {
            console.error('Safety check error:', error);
            throw error;
        }
    }

    // Apply safety measures
    static async applySafetyMeasures(transactionId, safetyReport) {
        try {
            const transaction = await Transaction.findById(transactionId);
            if (!transaction) {
                throw new Error('Transaction not found');
            }

            const appliedMeasures = [];

            // Add risk flags based on assessment
            if (safetyReport.checks) {
                const riskCheck = safetyReport.checks.find(check => check.type === 'risk_assessment');
                if (riskCheck && riskCheck.details.riskFactors) {
                    for (const factor of riskCheck.details.riskFactors) {
                        await transaction.addRiskFlag(factor.type, 'medium', factor.description);
                        appliedMeasures.push(`Added risk flag: ${factor.type}`);
                    }
                }

                // Add fraud pattern flags
                const fraudCheck = safetyReport.checks.find(check => check.type === 'fraud_detection');
                if (fraudCheck && fraudCheck.details.patterns) {
                    for (const pattern of fraudCheck.details.patterns) {
                        await transaction.addRiskFlag(pattern.type, pattern.severity, pattern.description);
                        appliedMeasures.push(`Added fraud flag: ${pattern.type}`);
                    }
                }
            }

            // Freeze high-risk transactions
            if (safetyReport.overallStatus === 'unsafe') {
                transaction.status = 'frozen';
                await transaction.addTimelineEntry(
                    'transaction_frozen',
                    'system',
                    'system',
                    'Transaction frozen due to safety concerns',
                    { safetyReport }
                );
                appliedMeasures.push('Transaction frozen due to safety concerns');

                // Send admin notification
                await Notification.create({
                    recipient: null, // Would be set to admin user ID
                    type: 'system',
                    title: 'High-Risk Transaction Frozen',
                    message: `Transaction ${transaction.transactionId} has been frozen due to safety concerns.`,
                    data: {
                        transactionId: transaction._id,
                        actionUrl: `/admin/transactions/${transaction._id}`,
                        actionText: 'Review Transaction'
                    },
                    priority: 'critical'
                });
            }

            // Enable enhanced monitoring for caution status
            if (safetyReport.overallStatus === 'caution') {
                transaction.autoProcessing.enabled = false;
                appliedMeasures.push('Enhanced monitoring enabled - auto-processing disabled');

                await transaction.addTimelineEntry(
                    'enhanced_monitoring',
                    'system',
                    'system',
                    'Enhanced monitoring enabled due to risk factors',
                    { safetyReport }
                );
            }

            // Update protection settings based on risk level
            if (transaction.protection.riskLevel === 'critical' || transaction.protection.riskLevel === 'high') {
                // Extend buyer protection period
                if (transaction.protection.buyerProtection) {
                    const extendedDate = new Date();
                    extendedDate.setDate(extendedDate.getDate() + 30); // Extend by 30 days
                    transaction.protection.buyerProtection.validUntil = extendedDate;
                    appliedMeasures.push('Buyer protection period extended');
                }

                // Enable fraud detection
                if (transaction.protection.sellerProtection) {
                    transaction.protection.sellerProtection.fraudDetection = true;
                    appliedMeasures.push('Seller fraud detection enabled');
                }
            }

            await transaction.save();
            return appliedMeasures;
        } catch (error) {
            console.error('Error applying safety measures:', error);
            throw error;
        }
    }

    // Generate safety report for admin
    static async generateSafetyReport(transactionId) {
        try {
            const safetyReport = await this.performSafetyChecks(transactionId);
            const transaction = await Transaction.findById(transactionId);

            const report = {
                transaction: {
                    id: transaction._id,
                    transactionId: transaction.transactionId,
                    amount: transaction.amount,
                    currency: transaction.currency,
                    status: transaction.status,
                    createdAt: transaction.createdAt
                },
                safetyAssessment: safetyReport,
                recommendations: this.generateRecommendations(safetyReport),
                actionItems: this.generateActionItems(safetyReport),
                generatedAt: new Date()
            };

            return report;
        } catch (error) {
            console.error('Error generating safety report:', error);
            throw error;
        }
    }

    static generateRecommendations(safetyReport) {
        const recommendations = [];

        if (safetyReport.overallStatus === 'unsafe') {
            recommendations.push({
                priority: 'critical',
                action: 'IMMEDIATE REVIEW REQUIRED',
                description: 'Transaction has failed safety checks and requires immediate admin intervention'
            });
            recommendations.push({
                priority: 'high',
                action: 'CONTACT PARTIES',
                description: 'Reach out to buyer and seller for additional verification'
            });
            recommendations.push({
                priority: 'high',
                action: 'REQUEST ADDITIONAL DOCUMENTATION',
                description: 'Request ID verification and proof of address from both parties'
            });
        } else if (safetyReport.overallStatus === 'caution') {
            recommendations.push({
                priority: 'medium',
                action: 'ENHANCED MONITORING',
                description: 'Monitor transaction closely for any suspicious activity'
            });
            recommendations.push({
                priority: 'medium',
                action: 'DELAY ESCROW RELEASE',
                description: 'Consider extending escrow hold period for additional verification'
            });
        } else {
            recommendations.push({
                priority: 'low',
                action: 'STANDARD PROCESSING',
                description: 'Transaction passes safety checks and can proceed normally'
            });
        }

        // Risk-based recommendations
        const riskCheck = safetyReport.checks.find(check => check.type === 'risk_assessment');
        if (riskCheck && riskCheck.details.riskLevel === 'critical') {
            recommendations.push({
                priority: 'critical',
                action: 'CRITICAL RISK DETECTED',
                description: 'Transaction has critical risk factors - consider cancellation'
            });
        }

        return recommendations;
    }

    static generateActionItems(safetyReport) {
        const actionItems = [];

        safetyReport.checks.forEach(check => {
            switch (check.type) {
                case 'risk_assessment':
                    if (check.status === 'failed') {
                        actionItems.push({
                            type: 'review',
                            description: 'Review risk factors and determine appropriate action',
                            priority: 'high'
                        });
                    }
                    break;
                case 'fraud_detection':
                    if (check.status === 'failed') {
                        actionItems.push({
                            type: 'investigate',
                            description: 'Investigate potential fraud patterns',
                            priority: 'critical'
                        });
                    }
                    break;
                case 'escrow_verification':
                    if (check.status === 'warning') {
                        actionItems.push({
                            type: 'verify',
                            description: 'Verify escrow settings and release conditions',
                            priority: 'medium'
                        });
                    }
                    break;
                case 'confirmation_status':
                    if (check.status === 'warning') {
                        actionItems.push({
                            type: 'follow_up',
                            description: 'Follow up with parties for missing confirmations',
                            priority: 'medium'
                        });
                    }
                    break;
                case 'dispute_check':
                    if (check.status === 'failed') {
                        actionItems.push({
                            type: 'resolve',
                            description: 'Resolve existing disputes before proceeding',
                            priority: 'high'
                        });
                    }
                    break;
                case 'payment_verification':
                    if (check.status === 'warning') {
                        actionItems.push({
                            type: 'verify',
                            description: 'Verify payment status and method',
                            priority: 'medium'
                        });
                    }
                    break;
            }
        });

        return actionItems.sort((a, b) => {
            const priorityOrder = { critical: 3, high: 2, medium: 1, low: 0 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
    }

    // Automated safety monitoring
    static async monitorTransactionSafety() {
        try {
            // Find transactions that need safety monitoring
            const transactions = await Transaction.find({
                $or: [
                    { 'protection.riskLevel': { $in: ['high', 'critical'] } },
                    { status: 'pending' },
                    { status: 'processing' },
                    { 'autoProcessing.enabled': true }
                ]
            }).populate('buyer seller');

            console.log(`Monitoring safety for ${transactions.length} transactions`);

            for (const transaction of transactions) {
                try {
                    const safetyReport = await this.performSafetyChecks(transaction._id);
                    
                    // Apply safety measures if needed
                    if (safetyReport.overallStatus !== 'safe') {
                        await this.applySafetyMeasures(transaction._id, safetyReport);
                        console.log(`Applied safety measures for transaction ${transaction.transactionId}`);
                    }
                } catch (error) {
                    console.error(`Error monitoring transaction ${transaction.transactionId}:`, error);
                }
            }

            return { monitored: transactions.length };
        } catch (error) {
            console.error('Error in safety monitoring:', error);
            throw error;
        }
    }
}

module.exports = TransactionSafetyService;
