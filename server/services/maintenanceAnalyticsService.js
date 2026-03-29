const Maintenance = require('../models/Maintenance');
const User = require('../models/User');

class MaintenanceAnalyticsService {
    // Get comprehensive maintenance analytics
    async getMaintenanceAnalytics(period = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - period);

            const [allMaintenance, stats, activeMaintenance, upcomingMaintenance] = await Promise.all([
                Maintenance.find({ createdAt: { $gte: startDate } })
                    .populate('createdBy', 'fullName email')
                    .sort({ createdAt: -1 }),
                Maintenance.getStats(period),
                Maintenance.getActive(),
                Maintenance.getUpcoming(7)
            ]);

            return {
                period,
                summary: {
                    totalEvents: allMaintenance.length,
                    activeEvents: activeMaintenance ? 1 : 0,
                    upcomingEvents: upcomingMaintenance.length,
                    completedEvents: allMaintenance.filter(m => m.status === 'completed').length,
                    cancelledEvents: allMaintenance.filter(m => m.status === 'cancelled').length
                },
                statistics: stats,
                activeMaintenance: activeMaintenance ? activeMaintenance.toSummary() : null,
                upcomingMaintenance: upcomingMaintenance.map(m => m.toSummary()),
                recentEvents: allMaintenance.slice(0, 10).map(m => m.toSummary()),
                metrics: this.calculateMetrics(allMaintenance),
                trends: this.analyzeTrends(allMaintenance),
                recommendations: this.generateRecommendations(allMaintenance, activeMaintenance)
            };
        } catch (error) {
            console.error('Get maintenance analytics error:', error);
            throw error;
        }
    }

    // Calculate key metrics
    calculateMetrics(maintenance) {
        const totalEvents = maintenance.length;
        if (totalEvents === 0) return {};

        const completedEvents = maintenance.filter(m => m.status === 'completed');
        const emergencyEvents = maintenance.filter(m => m.type === 'emergency');
        const criticalEvents = maintenance.filter(m => m.priority === 'critical');

        // Calculate average duration
        const durations = completedEvents
            .filter(m => m.actualStartTime && m.actualEndTime)
            .map(m => (new Date(m.actualEndTime) - new Date(m.actualStartTime)) / (1000 * 60)); // minutes

        const avgDuration = durations.length > 0 
            ? durations.reduce((a, b) => a + b, 0) / durations.length 
            : 0;

        // Calculate on-time completion rate
        const onTimeCompletions = completedEvents.filter(m => 
            m.actualEndTime && new Date(m.actualEndTime) <= new Date(m.scheduledEndTime)
        ).length;

        const onTimeRate = completedEvents.length > 0 
            ? (onTimeCompletions / completedEvents.length) * 100 
            : 0;

        // Calculate notification effectiveness
        const totalNotifications = maintenance.reduce((sum, m) => sum + (m.metrics?.messagesSent || 0), 0);
        const totalUsersNotified = maintenance.reduce((sum, m) => sum + (m.metrics?.usersNotified || 0), 0);

        return {
            averageDurationMinutes: Math.round(avgDuration),
            onTimeCompletionRate: Math.round(onTimeRate),
            emergencyRate: Math.round((emergencyEvents.length / totalEvents) * 100),
            criticalRate: Math.round((criticalEvents.length / totalEvents) * 100),
            totalNotificationsSent: totalNotifications,
            totalUsersNotified: totalUsersNotified,
            averageNotificationsPerEvent: totalEvents > 0 ? Math.round(totalNotifications / totalEvents) : 0,
            userComplaintRate: this.calculateComplaintRate(maintenance)
        };
    }

    // Calculate user complaint rate
    calculateComplaintRate(maintenance) {
        const totalComplaints = maintenance.reduce((sum, m) => sum + (m.metrics?.complaintsReceived || 0), 0);
        const totalUsersAffected = maintenance.reduce((sum, m) => sum + (m.metrics?.usersAffected || 0), 0);
        
        return totalUsersAffected > 0 
            ? Math.round((totalComplaints / totalUsersAffected) * 100 * 100) / 100 
            : 0;
    }

    // Analyze trends
    analyzeTrends(maintenance) {
        const trends = {
            frequency: this.analyzeFrequencyTrend(maintenance),
            duration: this.analyzeDurationTrend(maintenance),
            types: this.analyzeTypeDistribution(maintenance),
            priorities: this.analyzePriorityDistribution(maintenance),
            services: this.analyzeAffectedServices(maintenance)
        };

        return trends;
    }

    // Analyze frequency trends
    analyzeFrequencyTrend(maintenance) {
        const weeklyData = {};
        
        maintenance.forEach(event => {
            const week = this.getWeekKey(new Date(event.createdAt));
            weeklyData[week] = (weeklyData[week] || 0) + 1;
        });

        const weeks = Object.keys(weeklyData).sort();
        const counts = weeks.map(week => weeklyData[week]);

        return {
            weekly: weeks.map((week, index) => ({
                week,
                count: counts[index]
            })),
            trend: this.calculateTrend(counts)
        };
    }

    // Analyze duration trends
    analyzeDurationTrend(maintenance) {
        const completedEvents = maintenance.filter(m => 
            m.status === 'completed' && 
            m.actualStartTime && 
            m.actualEndTime
        );

        const durations = completedEvents.map(event => ({
            date: new Date(event.createdAt),
            duration: (new Date(event.actualEndTime) - new Date(event.actualStartTime)) / (1000 * 60)
        })).sort((a, b) => a.date - b.date);

        const durationValues = durations.map(d => d.duration);
        
        return {
            average: durationValues.length > 0 
                ? Math.round(durationValues.reduce((a, b) => a + b, 0) / durationValues.length) 
                : 0,
            median: durationValues.length > 0 
                ? Math.round(this.calculateMedian(durationValues)) 
                : 0,
            trend: this.calculateTrend(durationValues),
            outliers: this.findOutliers(durationValues)
        };
    }

    // Analyze type distribution
    analyzeTypeDistribution(maintenance) {
        const typeCounts = {};
        
        maintenance.forEach(event => {
            typeCounts[event.type] = (typeCounts[event.type] || 0) + 1;
        });

        const total = maintenance.length;
        const distribution = Object.entries(typeCounts).map(([type, count]) => ({
            type,
            count,
            percentage: Math.round((count / total) * 100)
        })).sort((a, b) => b.count - a.count);

        return distribution;
    }

    // Analyze priority distribution
    analyzePriorityDistribution(maintenance) {
        const priorityCounts = {};
        
        maintenance.forEach(event => {
            priorityCounts[event.priority] = (priorityCounts[event.priority] || 0) + 1;
        });

        const total = maintenance.length;
        const distribution = Object.entries(priorityCounts).map(([priority, count]) => ({
            priority,
            count,
            percentage: Math.round((count / total) * 100)
        })).sort((a, b) => {
            const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });

        return distribution;
    }

    // Analyze affected services
    analyzeAffectedServices(maintenance) {
        const serviceCounts = {};
        
        maintenance.forEach(event => {
            if (event.affectedServices && event.affectedServices.length > 0) {
                event.affectedServices.forEach(service => {
                    serviceCounts[service] = (serviceCounts[service] || 0) + 1;
                });
            } else {
                serviceCounts['all_services'] = (serviceCounts['all_services'] || 0) + 1;
            }
        });

        const total = maintenance.length;
        const distribution = Object.entries(serviceCounts).map(([service, count]) => ({
            service: service.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            count,
            percentage: Math.round((count / total) * 100)
        })).sort((a, b) => b.count - a.count);

        return distribution;
    }

    // Generate maintenance recommendations
    generateRecommendations(maintenance, activeMaintenance) {
        const recommendations = [];
        const metrics = this.calculateMetrics(maintenance);

        // Duration recommendations
        if (metrics.averageDurationMinutes > 120) {
            recommendations.push({
                type: 'duration',
                priority: 'high',
                title: 'Reduce Maintenance Duration',
                description: 'Average maintenance time exceeds 2 hours. Consider breaking down large maintenance tasks into smaller, more frequent updates.',
                action: 'Plan shorter maintenance windows and improve preparation processes.'
            });
        }

        // On-time completion recommendations
        if (metrics.onTimeCompletionRate < 80) {
            recommendations.push({
                type: 'planning',
                priority: 'medium',
                title: 'Improve Time Estimation',
                description: `Only ${metrics.onTimeCompletionRate}% of maintenance events complete on time. Better time estimation is needed.`,
                action: 'Add buffer time to estimates and track actual vs planned duration more carefully.'
            });
        }

        // Emergency rate recommendations
        if (metrics.emergencyRate > 20) {
            recommendations.push({
                type: 'prevention',
                priority: 'high',
                title: 'Reduce Emergency Maintenance',
                description: `${metrics.emergencyRate}% of maintenance events are emergencies. This indicates insufficient preventive maintenance.`,
                action: 'Implement regular health checks and preventive maintenance schedules.'
            });
        }

        // User complaint recommendations
        if (metrics.userComplaintRate > 5) {
            recommendations.push({
                type: 'communication',
                priority: 'medium',
                title: 'Improve User Communication',
                description: `User complaint rate is ${metrics.userComplaintRate}%. Better communication may reduce complaints.`,
                action: 'Provide more detailed maintenance information and advance notice.'
            });
        }

        // Notification effectiveness
        if (metrics.averageNotificationsPerEvent < 100 && maintenance.length > 0) {
            recommendations.push({
                type: 'notification',
                priority: 'low',
                title: 'Increase Notification Coverage',
                description: 'Low notification coverage may leave users uninformed about maintenance.',
                action: 'Encourage users to enable notifications and improve notification channels.'
            });
        }

        // Active maintenance specific recommendations
        if (activeMaintenance) {
            const duration = activeMaintenance.getDuration ? activeMaintenance.getDuration() : 0;
            if (duration > 180) {
                recommendations.push({
                    type: 'active',
                    priority: 'urgent',
                    title: 'Long Active Maintenance',
                    description: 'Current maintenance has been running for over 3 hours.',
                    action: 'Consider escalating resources or providing interim updates to users.'
                });
            }
        }

        return recommendations.sort((a, b) => {
            const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
    }

    // Get detailed maintenance report
    async getMaintenanceReport(maintenanceId) {
        try {
            const maintenance = await Maintenance.findById(maintenanceId)
                .populate('createdBy', 'fullName email')
                .populate('lastUpdatedBy', 'fullName email')
                .populate('reports.reportedBy', 'fullName email');

            if (!maintenance) {
                throw new Error('Maintenance record not found');
            }

            const report = {
                ...maintenance.toObject(),
                analytics: this.getSingleMaintenanceAnalytics(maintenance),
                recommendations: this.getSingleMaintenanceRecommendations(maintenance),
                impact: await this.calculateMaintenanceImpact(maintenance)
            };

            return report;
        } catch (error) {
            console.error('Get maintenance report error:', error);
            throw error;
        }
    }

    // Get analytics for a single maintenance event
    getSingleMaintenanceAnalytics(maintenance) {
        const duration = maintenance.getDuration ? maintenance.getDuration() : 0;
        const plannedDuration = maintenance.scheduledStartTime && maintenance.scheduledEndTime
            ? (new Date(maintenance.scheduledEndTime) - new Date(maintenance.scheduledStartTime)) / (1000 * 60)
            : 0;

        return {
            durationMinutes: duration,
            plannedDurationMinutes: plannedDuration,
            durationVariance: plannedDuration > 0 ? Math.round(((duration - plannedDuration) / plannedDuration) * 100) : 0,
            isOverdue: maintenance.isOverdue ? maintenance.isOverdue() : false,
            notificationEffectiveness: this.calculateNotificationEffectiveness(maintenance),
            userImpact: this.calculateUserImpact(maintenance)
        };
    }

    // Calculate notification effectiveness
    calculateNotificationEffectiveness(maintenance) {
        const { usersNotified = 0, messagesSent = 0, usersAffected = 0 } = maintenance.metrics || {};
        
        return {
            coverageRate: usersAffected > 0 ? Math.round((usersNotified / usersAffected) * 100) : 0,
            messagesPerUser: usersNotified > 0 ? Math.round(messagesSent / usersNotified) : 0,
            complaintRate: usersAffected > 0 ? Math.round((maintenance.metrics?.complaintsReceived || 0) / usersAffected * 100 * 100) / 100 : 0
        };
    }

    // Calculate user impact
    calculateUserImpact(maintenance) {
        const { usersAffected = 0, complaintsReceived = 0 } = maintenance.metrics || {};
        const severity = maintenance.priority === 'critical' ? 4 : maintenance.priority === 'high' ? 3 : maintenance.priority === 'medium' ? 2 : 1;
        const servicesAffected = maintenance.affectedServices ? maintenance.affectedServices.length : 0;
        
        // Calculate impact score (0-100)
        const impactScore = Math.min(100, (
            (usersAffected / 1000) * 40 +  // User impact (max 40 points)
            (complaintsReceived / 100) * 30 +  // Complaint impact (max 30 points)
            (severity / 4) * 20 +  // Priority impact (max 20 points)
            (servicesAffected / 10) * 10  // Service impact (max 10 points)
        ));

        return {
            score: Math.round(impactScore),
            level: impactScore >= 80 ? 'high' : impactScore >= 50 ? 'medium' : 'low',
            usersAffected,
            complaintsReceived,
            servicesAffected
        };
    }

    // Calculate maintenance impact
    async calculateMaintenanceImpact(maintenance) {
        try {
            // This would typically involve checking system metrics during maintenance
            // For now, return estimated impact based on affected services
            const affectedServices = maintenance.affectedServices || [];
            const criticalServices = ['user_login', 'product_purchasing', 'checkout'];
            const criticalAffected = affectedServices.filter(service => criticalServices.includes(service));
            
            return {
                estimatedAffectedUsers: maintenance.metrics?.usersAffected || 0,
                criticalServicesAffected: criticalAffected.length,
                totalServicesAffected: affectedServices.length,
                businessImpact: criticalAffected.length > 0 ? 'high' : affectedServices.length > 3 ? 'medium' : 'low',
                revenueImpact: criticalAffected.includes('product_purchasing') || criticalAffected.includes('checkout') ? 'high' : 'low'
            };
        } catch (error) {
            console.error('Calculate maintenance impact error:', error);
            return {
                estimatedAffectedUsers: 0,
                criticalServicesAffected: 0,
                totalServicesAffected: 0,
                businessImpact: 'unknown',
                revenueImpact: 'unknown'
            };
        }
    }

    // Get recommendations for a single maintenance event
    getSingleMaintenanceRecommendations(maintenance) {
        const recommendations = [];
        const analytics = this.getSingleMaintenanceAnalytics(maintenance);

        if (analytics.durationVariance > 50) {
            recommendations.push({
                type: 'planning',
                priority: 'high',
                title: 'Improve Time Estimation',
                description: `Actual duration was ${analytics.durationVariance}% different from planned.`,
                action: 'Review estimation process and add contingency time.'
            });
        }

        if (analytics.notificationEffectiveness.coverageRate < 70) {
            recommendations.push({
                type: 'communication',
                priority: 'medium',
                title: 'Improve Notification Coverage',
                description: `Only ${analytics.notificationEffectiveness.coverageRate}% of affected users were notified.`,
                action: 'Expand notification channels and encourage user opt-ins.'
            });
        }

        if (analytics.userImpact.level === 'high') {
            recommendations.push({
                type: 'impact',
                priority: 'high',
                title: 'High User Impact Detected',
                description: 'This maintenance event had high impact on users.',
                action: 'Consider scheduling during low-traffic periods and providing advance notice.'
            });
        }

        return recommendations;
    }

    // Helper methods
    getWeekKey(date) {
        const year = date.getFullYear();
        const week = Math.floor((date - new Date(year, 0, 1)) / (7 * 24 * 60 * 60 * 1000));
        return `${year}-W${week}`;
    }

    calculateTrend(values) {
        if (values.length < 2) return 'stable';
        
        const firstHalf = values.slice(0, Math.floor(values.length / 2));
        const secondHalf = values.slice(Math.floor(values.length / 2));
        
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        
        const change = ((secondAvg - firstAvg) / firstAvg) * 100;
        
        if (change > 10) return 'increasing';
        if (change < -10) return 'decreasing';
        return 'stable';
    }

    calculateMedian(values) {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 
            ? (sorted[mid - 1] + sorted[mid]) / 2 
            : sorted[mid];
    }

    findOutliers(values) {
        if (values.length < 4) return [];
        
        const sorted = [...values].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        const iqr = q3 - q1;
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;
        
        return sorted.filter(value => value < lowerBound || value > upperBound);
    }
}

module.exports = new MaintenanceAnalyticsService();
