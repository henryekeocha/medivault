import { AppError } from '../utils/appError.js';
export class AnalyticsService {
    wsService;
    prisma;
    metrics = new Map();
    updateInterval;
    constructor(prisma, wsService) {
        this.prisma = prisma;
        this.wsService = wsService;
        this.startMetricsCollection();
    }
    startMetricsCollection() {
        // Update metrics every minute
        this.updateInterval = setInterval(async () => {
            await this.updateSystemMetrics();
        }, 60000);
    }
    async updateSystemMetrics() {
        try {
            const metrics = await this.collectSystemMetrics();
            this.metrics.set('system', metrics);
            // Broadcast updates to admin users if wsService is available
            if (this.wsService) {
                this.wsService.broadcastToRoom('analytics:system', 'analytics:update', metrics);
            }
        }
        catch (error) {
            console.error('Error updating system metrics:', error);
        }
    }
    async collectSystemMetrics() {
        try {
            // Query database for current metrics
            const [totalFiles, totalStorage, activeUsers, fileTypes] = await Promise.all([
                this.prisma.image.count(),
                this.prisma.image.aggregate({
                    _sum: {
                        fileSize: true
                    }
                }),
                this.prisma.userActivity.findMany({
                    where: {
                        timestamp: {
                            gt: new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
                        }
                    },
                    distinct: ['userId']
                }),
                this.prisma.image.findMany({
                    select: {
                        fileType: true
                    }
                })
            ]);
            // Count unique active users
            const uniqueActiveUsers = new Set(activeUsers.map(activity => activity.userId)).size;
            // Count files by type
            const filesByType = fileTypes.reduce((acc, curr) => {
                const type = curr.fileType || 'unknown';
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {});
            return {
                totalStorage: totalStorage._sum.fileSize || 0,
                usedStorage: totalStorage._sum.fileSize || 0,
                activeUsers: uniqueActiveUsers,
                totalFiles,
                filesByType
            };
        }
        catch (error) {
            console.error('Error collecting system metrics:', error);
            throw new AppError('Failed to collect system metrics', 500);
        }
    }
    async getUserMetrics(userId) {
        try {
            // Check database connection first
            try {
                await this.prisma.$queryRaw `SELECT 1`;
            }
            catch (dbError) {
                console.error('Database connection error:', dbError);
                throw new AppError('Database connection failed', 500);
            }
            // First check if user exists
            const user = await this.prisma.user.findUnique({
                where: { id: userId }
            });
            if (!user) {
                console.error(`User not found with ID: ${userId}`);
                throw new AppError('User not found', 404);
            }
            console.log(`Fetching metrics for user: ${userId}`);
            // Get all metrics in parallel with individual error handling
            const metricsPromises = [
                // Get total uploads
                this.prisma.image.count({
                    where: { userId }
                }).catch(error => {
                    console.error('Error fetching uploads:', error);
                    return 0;
                }),
                // Get total downloads
                this.prisma.userActivity.count({
                    where: {
                        userId,
                        action: 'DOWNLOAD'
                    }
                }).catch(error => {
                    console.error('Error fetching downloads:', error);
                    return 0;
                }),
                // Get storage used
                this.prisma.image.aggregate({
                    where: { userId },
                    _sum: {
                        fileSize: true
                    }
                }).catch(error => {
                    console.error('Error fetching storage:', error);
                    return { _sum: { fileSize: 0 } };
                }),
                // Get recent activity
                this.prisma.userActivity.findMany({
                    where: { userId },
                    orderBy: { timestamp: 'desc' },
                    take: 10,
                    include: {
                        user: {
                            select: {
                                name: true,
                                image: true
                            }
                        }
                    }
                }).catch(error => {
                    console.error('Error fetching activity:', error);
                    return [];
                }),
                // Get appointments
                this.prisma.appointment.findMany({
                    where: {
                        OR: [
                            { patientId: userId },
                            { doctorId: userId }
                        ]
                    },
                    orderBy: { datetime: 'desc' }
                }).catch(error => {
                    console.error('Error fetching appointments:', error);
                    return [];
                }),
                // Get messages
                this.prisma.message.findMany({
                    where: {
                        OR: [
                            { senderId: userId },
                            { recipientId: userId }
                        ]
                    },
                    orderBy: { createdAt: 'desc' }
                }).catch(error => {
                    console.error('Error fetching messages:', error);
                    return [];
                }),
                // Get medical records
                this.prisma.medicalRecord.findMany({
                    where: {
                        OR: [
                            { patientId: userId },
                            { providerId: userId }
                        ]
                    },
                    orderBy: { updatedAt: 'desc' }
                }).catch(error => {
                    console.error('Error fetching records:', error);
                    return [];
                }),
                // Get recent views
                this.prisma.userActivity.findMany({
                    where: {
                        userId,
                        action: 'VIEW'
                    },
                    orderBy: { timestamp: 'desc' },
                    take: 10
                }).catch(error => {
                    console.error('Error fetching recent views:', error);
                    return [];
                })
            ];
            const [uploads, downloads, storage, activity, appointments, messages, records, recentViews] = await Promise.all(metricsPromises);
            console.log('Successfully fetched all metrics:', {
                uploads,
                downloads,
                storage,
                activityCount: activity.length,
                appointmentsCount: appointments.length,
                messagesCount: messages.length,
                recordsCount: records.length,
                recentViewsCount: recentViews.length
            });
            // Format recent activity
            const formattedActivity = activity.map(act => ({
                id: act.id,
                user: act.user.name,
                action: act.action,
                time: act.timestamp.toISOString(),
                avatar: act.user.image || '',
                details: act.metadata || {}
            }));
            // Calculate appointment metrics
            const now = new Date();
            const appointmentMetrics = {
                total: appointments.length,
                upcoming: appointments.filter(apt => apt.datetime > now && apt.status !== 'CANCELLED').length,
                completed: appointments.filter(apt => apt.status === 'COMPLETED').length,
                cancelled: appointments.filter(apt => apt.status === 'CANCELLED').length
            };
            // Calculate message metrics
            const messageMetrics = {
                total: messages.length,
                unread: messages.filter(msg => !msg.readAt).length
            };
            // Calculate recent uploads (last 7 days)
            const recentUploads = await this.prisma.image.count({
                where: {
                    userId,
                    uploadDate: {
                        gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                    }
                }
            });
            const metrics = {
                appointments: appointmentMetrics,
                images: {
                    total: uploads,
                    recentUploads,
                    storageUsed: `${(storage._sum.fileSize || 0) / (1024 * 1024)} MB`
                },
                messages: messageMetrics,
                recentActivity: formattedActivity
            };
            console.log('Returning formatted metrics:', metrics);
            return metrics;
        }
        catch (error) {
            console.error('Error in getUserMetrics:', error);
            if (error instanceof Error) {
                console.error('Error details:', {
                    message: error.message,
                    stack: error.stack,
                    name: error.name
                });
            }
            throw new AppError('Failed to get user metrics', 500);
        }
    }
    async trackFileAccess(fileId, userId, action) {
        try {
            await this.prisma.userActivity.create({
                data: {
                    userId,
                    action,
                    resourceType: 'file',
                    resourceId: fileId,
                    metadata: { fileId },
                    timestamp: new Date()
                }
            });
            // Update real-time metrics
            this.updateUserMetrics(userId);
        }
        catch (error) {
            console.error('Error tracking file access:', error);
            throw new AppError('Failed to track file access', 500);
        }
    }
    async updateUserMetrics(userId) {
        try {
            const metrics = await this.getUserMetrics(userId);
            if (this.wsService) {
                this.wsService.sendUpdate('analytics', userId, metrics);
            }
        }
        catch (error) {
            console.error('Error updating user metrics:', error);
        }
    }
    async getFileAccessHistory(fileId) {
        try {
            return await this.prisma.userActivity.findMany({
                where: {
                    action: 'FILE_ACCESS',
                    resourceType: 'file',
                    resourceId: fileId
                },
                select: {
                    timestamp: true,
                    action: true,
                    metadata: true,
                    user: {
                        select: {
                            name: true,
                            id: true
                        }
                    }
                },
                orderBy: {
                    timestamp: 'desc'
                },
                take: 50
            });
        }
        catch (error) {
            console.error('Error getting file access history:', error);
            throw new AppError('Failed to get file access history', 500);
        }
    }
    async getSystemMetrics() {
        try {
            return this.metrics.get('system') || await this.collectSystemMetrics();
        }
        catch (error) {
            console.error('Error getting system metrics:', error);
            throw new AppError('Failed to get system metrics', 500);
        }
    }
    async getProviderStatistics(providerId) {
        try {
            // Get total number of patients
            const totalPatients = await this.prisma.user.count({
                where: {
                    providers: {
                        some: {
                            doctorId: providerId
                        }
                    }
                }
            });
            // Get total number of images
            const totalImages = await this.prisma.image.count({
                where: {
                    userId: providerId
                }
            });
            // Get total number of shares
            const totalShares = await this.prisma.share.count({
                where: {
                    sharedByUserId: providerId
                }
            });
            // Get recent activity
            const recentActivity = await this.prisma.userActivity.findMany({
                where: {
                    userId: providerId
                },
                orderBy: {
                    timestamp: 'desc'
                },
                take: 10,
                select: {
                    id: true,
                    action: true,
                    resourceType: true,
                    resourceId: true,
                    timestamp: true,
                    metadata: true
                }
            });
            return {
                totalPatients,
                totalImages,
                totalShares,
                recentActivity
            };
        }
        catch (error) {
            console.error('Error getting provider statistics:', error);
            throw new AppError('Failed to get provider statistics', 500);
        }
    }
    stopMetricsCollection() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}
//# sourceMappingURL=analytics.service.js.map