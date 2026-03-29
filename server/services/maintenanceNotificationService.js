const Maintenance = require('../models/Maintenance');
const User = require('../models/User');
const Notification = require('../models/Notification');
const nodemailer = require('nodemailer');

class MaintenanceNotificationService {
    constructor() {
        this.transporter = nodemailer.createTransporter({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    }

    // Schedule maintenance notifications
    async scheduleMaintenanceNotifications(maintenanceId) {
        try {
            const maintenance = await Maintenance.findById(maintenanceId)
                .populate('createdBy', 'fullName email');

            if (!maintenance) {
                throw new Error('Maintenance record not found');
            }

            const { notificationSettings, scheduledStartTime, targetAudience, targetUsers } = maintenance;
            
            if (!notificationSettings) {
                return { message: 'No notification settings configured' };
            }

            // Schedule pre-maintenance notifications
            if (notificationSettings.notifyHoursBefore > 0) {
                const notificationTime = new Date(scheduledStartTime);
                notificationTime.setHours(notificationTime.getHours() - notificationSettings.notifyHoursBefore);

                if (notificationTime > new Date()) {
                    setTimeout(() => {
                        this.sendPreMaintenanceNotifications(maintenance);
                    }, notificationTime - new Date());
                }
            }

            // Schedule start notifications
            if (scheduledStartTime > new Date()) {
                setTimeout(() => {
                    this.sendMaintenanceStartNotifications(maintenance);
                }, scheduledStartTime - new Date());
            }

            // Schedule completion notifications
            const endTime = new Date(maintenance.scheduledEndTime);
            if (endTime > new Date()) {
                setTimeout(() => {
                    this.sendMaintenanceCompletionNotifications(maintenance);
                }, endTime - new Date());
            }

            return { message: 'Notifications scheduled successfully' };
        } catch (error) {
            console.error('Schedule maintenance notifications error:', error);
            throw error;
        }
    }

    // Send pre-maintenance notifications
    async sendPreMaintenanceNotifications(maintenance) {
        try {
            const targetUsers = await this.getTargetUsers(maintenance);
            const message = `Scheduled maintenance will begin at ${new Date(maintenance.scheduledStartTime).toLocaleString()}. ${maintenance.messageContent?.body || maintenance.description}`;

            await this.sendNotifications(maintenance, targetUsers, {
                type: 'system',
                title: maintenance.messageContent?.headline || 'Upcoming Maintenance',
                message: message,
                priority: maintenance.priority === 'critical' ? 'critical' : 'high',
                data: {
                    maintenanceId: maintenance._id,
                    actionUrl: maintenance.messageContent?.actionUrl,
                    scheduledStartTime: maintenance.scheduledStartTime,
                    scheduledEndTime: maintenance.scheduledEndTime,
                    type: 'pre_maintenance'
                }
            });

            // Add report
            await maintenance.addReport({
                type: 'status_update',
                message: `Pre-maintenance notifications sent to ${targetUsers.length} users`,
                severity: 'info'
            });

            console.log(`📅 Pre-maintenance notifications sent for: ${maintenance.title}`);
        } catch (error) {
            console.error('Send pre-maintenance notifications error:', error);
        }
    }

    // Send maintenance start notifications
    async sendMaintenanceStartNotifications(maintenance) {
        try {
            const targetUsers = await this.getTargetUsers(maintenance);
            const message = `Maintenance has now begun. ${maintenance.messageContent?.body || maintenance.description}. We expect to complete this by ${new Date(maintenance.scheduledEndTime).toLocaleString()}.`;

            await this.sendNotifications(maintenance, targetUsers, {
                type: 'system',
                title: maintenance.messageContent?.headline || 'Maintenance Started',
                message: message,
                priority: 'critical',
                data: {
                    maintenanceId: maintenance._id,
                    actionUrl: maintenance.messageContent?.actionUrl,
                    scheduledStartTime: maintenance.scheduledStartTime,
                    scheduledEndTime: maintenance.scheduledEndTime,
                    type: 'maintenance_start'
                }
            });

            // Add report
            await maintenance.addReport({
                type: 'status_update',
                message: `Maintenance start notifications sent to ${targetUsers.length} users`,
                severity: 'info'
            });

            console.log(`🔧 Maintenance start notifications sent for: ${maintenance.title}`);
        } catch (error) {
            console.error('Send maintenance start notifications error:', error);
        }
    }

    // Send maintenance completion notifications
    async sendMaintenanceCompletionNotifications(maintenance) {
        try {
            const targetUsers = await this.getTargetUsers(maintenance);
            const message = `Maintenance has been completed successfully. All services should now be operating normally.`;

            await this.sendNotifications(maintenance, targetUsers, {
                type: 'system',
                title: 'Maintenance Complete',
                message: message,
                priority: 'normal',
                data: {
                    maintenanceId: maintenance._id,
                    type: 'maintenance_complete'
                }
            });

            // Add report
            await maintenance.addReport({
                type: 'completion',
                message: `Maintenance completion notifications sent to ${targetUsers.length} users`,
                severity: 'info'
            });

            console.log(`✅ Maintenance completion notifications sent for: ${maintenance.title}`);
        } catch (error) {
            console.error('Send maintenance completion notifications error:', error);
        }
    }

    // Send emergency maintenance notifications
    async sendEmergencyMaintenanceNotifications(maintenance) {
        try {
            const targetUsers = await this.getTargetUsers(maintenance);
            const message = `EMERGENCY: ${maintenance.messageContent?.body || maintenance.description}. Services may be temporarily unavailable.`;

            await this.sendNotifications(maintenance, targetUsers, {
                type: 'system',
                title: maintenance.messageContent?.headline || 'Emergency Maintenance',
                message: message,
                priority: 'critical',
                data: {
                    maintenanceId: maintenance._id,
                    actionUrl: maintenance.messageContent?.actionUrl,
                    scheduledStartTime: maintenance.scheduledStartTime,
                    scheduledEndTime: maintenance.scheduledEndTime,
                    type: 'emergency_maintenance'
                }
            });

            // Add report
            await maintenance.addReport({
                type: 'incident',
                message: `Emergency maintenance notifications sent to ${targetUsers.length} users`,
                severity: 'critical'
            });

            console.log(`🚨 Emergency maintenance notifications sent for: ${maintenance.title}`);
        } catch (error) {
            console.error('Send emergency maintenance notifications error:', error);
        }
    }

    // Send notifications through multiple channels
    async sendNotifications(maintenance, users, notificationData) {
        const { notificationSettings } = maintenance;
        let notificationsSent = 0;

        for (const user of users) {
            try {
                // In-app notifications
                if (notificationSettings?.sendInApp !== false) {
                    await Notification.create({
                        ...notificationData,
                        recipient: user._id,
                        channels: {
                            websocket: true,
                            push: notificationSettings?.sendPush === true,
                            email: notificationSettings?.sendEmail === true,
                            sms: notificationSettings?.sendSMS === true
                        }
                    });
                    notificationsSent++;
                }

                // Email notifications
                if (notificationSettings?.sendEmail === true && user.email) {
                    await this.sendEmailNotification(user, notificationData);
                }

                // Push notifications
                if (notificationSettings?.sendPush === true && user.pushSubscription) {
                    await this.sendPushNotification(user, notificationData);
                }

                // SMS notifications
                if (notificationSettings?.sendSMS === true && user.phoneNumber) {
                    await this.sendSMSNotification(user, notificationData);
                }
            } catch (error) {
                console.error(`Failed to send notification to user ${user._id}:`, error);
            }
        }

        // Update metrics
        maintenance.metrics.usersNotified += users.length;
        maintenance.metrics.messagesSent += notificationsSent;
        await maintenance.save();

        return { usersNotified: users.length, messagesSent: notificationsSent };
    }

    // Get target users based on maintenance settings
    async getTargetUsers(maintenance) {
        const { targetAudience, targetUsers } = maintenance;

        switch (targetAudience) {
            case 'all_users':
                return await User.find({ isActive: true });
            case 'buyers_only':
                return await User.find({ isActive: true, role: 'buyer' });
            case 'sellers_only':
                return await User.find({ isActive: true, role: 'seller' });
            case 'verified_users':
                return await User.find({ isActive: true, isStudentVerified: true });
            case 'specific_users':
                return await User.find({ _id: { $in: targetUsers }, isActive: true });
            default:
                return await User.find({ isActive: true });
        }
    }

    // Send email notification
    async sendEmailNotification(user, notificationData) {
        try {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: notificationData.title,
                html: this.generateEmailTemplate(notificationData)
            };

            await this.transporter.sendMail(mailOptions);
        } catch (error) {
            console.error(`Email notification failed for ${user.email}:`, error);
        }
    }

    // Generate email template
    generateEmailTemplate(notificationData) {
        const { title, message, data } = notificationData;
        
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${title}</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #0A1128; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; background: #f9f9f9; }
                    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
                    .btn { display: inline-block; padding: 10px 20px; background: #FFD700; color: #0A1128; text-decoration: none; border-radius: 5px; margin-top: 10px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Virtuosa</h1>
                        <p>Campus Marketplace</p>
                    </div>
                    <div class="content">
                        <h2>${title}</h2>
                        <p>${message}</p>
                        ${data?.actionUrl ? `<a href="${data.actionUrl}" class="btn">Learn More</a>` : ''}
                    </div>
                    <div class="footer">
                        <p>&copy; 2024 Virtuosa. All rights reserved.</p>
                        <p>If you no longer wish to receive these emails, please update your notification preferences.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    // Send push notification
    async sendPushNotification(user, notificationData) {
        try {
            const payload = JSON.stringify({
                title: notificationData.title,
                message: notificationData.message,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: 'maintenance',
                data: notificationData.data
            });

            // TODO: Implement actual push notification sending
            console.log(`Push notification would be sent to ${user._id}:`, payload);
        } catch (error) {
            console.error(`Push notification failed for user ${user._id}:`, error);
        }
    }

    // Send SMS notification
    async sendSMSNotification(user, notificationData) {
        try {
            // TODO: Implement SMS service integration (Twilio, etc.)
            console.log(`SMS notification would be sent to ${user.phoneNumber}: ${notificationData.title} - ${notificationData.message}`);
        } catch (error) {
            console.error(`SMS notification failed for user ${user._id}:`, error);
        }
    }

    // Subscribe user to maintenance notifications
    async subscribeToMaintenanceNotifications(email, maintenanceId) {
        try {
            const user = await User.findOne({ email, isActive: true });
            if (!user) {
                throw new Error('User not found');
            }

            // Create a subscription record
            const notification = await Notification.create({
                recipient: user._id,
                type: 'system',
                title: 'Maintenance Notification Subscription',
                message: 'You will be notified when maintenance is complete.',
                priority: 'normal',
                data: {
                    maintenanceId: maintenanceId,
                    type: 'maintenance_subscription'
                }
            });

            return { message: 'Successfully subscribed to maintenance notifications', notificationId: notification._id };
        } catch (error) {
            console.error('Subscribe to maintenance notifications error:', error);
            throw error;
        }
    }

    // Get maintenance notification statistics
    async getMaintenanceNotificationStats(maintenanceId) {
        try {
            const maintenance = await Maintenance.findById(maintenanceId);
            if (!maintenance) {
                throw new Error('Maintenance record not found');
            }

            return {
                usersNotified: maintenance.metrics.usersNotified,
                messagesSent: maintenance.metrics.messagesSent,
                usersAffected: maintenance.metrics.usersAffected,
                complaintsReceived: maintenance.metrics.complaintsReceived
            };
        } catch (error) {
            console.error('Get maintenance notification stats error:', error);
            throw error;
        }
    }
}

module.exports = new MaintenanceNotificationService();
