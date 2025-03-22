import { WebSocketService } from './websocket.service.js';
import { PrismaClient } from '@prisma/client';
import type { UserActivity, Image } from '@prisma/client';
import { AppError } from '../utils/appError.js';
import { UserMetrics } from '../types/analytics.js';

interface SystemMetrics {
  totalStorage: number;
  usedStorage: number;
  activeUsers: number;
  totalFiles: number;
  filesByType: Record<string, number>;
}

interface ProviderStatistics {
  totalPatients: number;
  totalImages: number;
  totalShares: number;
  recentActivity: Array<{
    type: string;
    timestamp: Date;
    details: any;
  }>;
}

export class AnalyticsService {
  private wsService?: WebSocketService;
  private prisma: PrismaClient;
  private metrics: Map<string, any> = new Map();
  private updateInterval!: NodeJS.Timeout;

  constructor(prisma: PrismaClient, wsService?: WebSocketService) {
    this.prisma = prisma;
    this.wsService = wsService;
    this.startMetricsCollection();
  }

  private startMetricsCollection() {
    // Update metrics every minute
    this.updateInterval = setInterval(async () => {
      await this.updateSystemMetrics();
    }, 60000);
  }

  private async updateSystemMetrics() {
    try {
      const metrics = await this.collectSystemMetrics();
      this.metrics.set('system', metrics);
      
      // Broadcast updates to admin users if wsService is available
      if (this.wsService) {
        this.wsService.broadcastToRoom(
          'analytics:system',
          'analytics:update',
          metrics
        );
      }
    } catch (error) {
      console.error('Error updating system metrics:', error);
    }
  }

  private async collectSystemMetrics(): Promise<SystemMetrics> {
    try {
      // Query database for current metrics
      const [
        totalFiles,
        totalStorage,
        activeUsers,
        fileTypes
      ] = await Promise.all([
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
      const filesByType = fileTypes.reduce((acc: Record<string, number>, curr) => {
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
    } catch (error) {
      console.error('Error collecting system metrics:', error);
      throw new AppError('Failed to collect system metrics', 500);
    }
  }

  async getUserMetrics(userId: string): Promise<UserMetrics> {
    try {
      // Check database connection first
      try {
        await this.prisma.$queryRaw`SELECT 1`;
      } catch (dbError) {
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
        this.prisma.fileAccessLog.count({
          where: { 
            userId,
            accessType: 'DOWNLOAD'
          }
        }).catch(error => {
          console.error('Error fetching downloads:', error);
          return 0;
        }),
        // Get total storage used
        this.prisma.image.aggregate({
          where: { userId },
          _sum: { fileSize: true }
        }).catch(error => {
          console.error('Error fetching storage:', error);
          return { _sum: { fileSize: 0 } };
        }),
        // Get recent activity
        this.prisma.userActivity.findMany({
          where: { userId },
          orderBy: { timestamp: 'desc' },
          take: 10
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
          orderBy: { startTime: 'desc' }
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
        this.prisma.fileAccessLog.findMany({
          where: { 
            userId,
            accessType: 'VIEW'
          },
          orderBy: { accessTimestamp: 'desc' },
          take: 10
        }).catch(error => {
          console.error('Error fetching recent views:', error);
          return [];
        })
      ];

      const [
        uploads,
        downloads,
        storage,
        activity,
        appointments,
        messages,
        records,
        recentViews
      ] = await Promise.all(metricsPromises) as [
        number,
        number,
        { _sum: { fileSize: number } },
        Array<{ id: string; userId: string; timestamp: Date; type: string; details: any }>,
        Array<{ id: string; startTime: Date; endTime: Date; status: string }>,
        Array<{ id: string; readAt: Date | null }>,
        Array<{ id: string; updatedAt: Date }>,
        Array<{ id: string }>
      ];

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

      // Calculate derived metrics
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const upcomingAppointments = appointments.filter(apt => 
        apt.startTime > now && apt.status === 'SCHEDULED'
      ).length;

      const pastAppointments = appointments.filter(apt => 
        apt.endTime < now
      ).length;

      const unreadMessages = messages.filter(msg => !msg.readAt).length;

      const recentlyUpdatedRecords = records.filter(record => 
        record.updatedAt > thirtyDaysAgo
      ).length;

      const recentlyUploadedImages = uploads;

      const recentlyViewed = recentViews.length;

      // Format recent activity
      const formattedActivity = activity.map(act => ({
        id: act.id,
        user: act.userId,
        action: act.type,
        time: act.timestamp.toISOString(),
        avatar: '/avatars/system.jpg',
        details: act.details as Record<string, any>
      }));

      // Return the metrics in the format expected by the frontend
      const metrics = {
        appointments: {
          total: appointments.length,
          upcoming: upcomingAppointments,
          completed: pastAppointments,
          cancelled: appointments.filter(apt => apt.status === 'CANCELLED').length
        },
        images: {
          total: uploads,
          recentUploads: recentlyUploadedImages,
          storageUsed: `${(storage._sum.fileSize || 0) / (1024 * 1024)} MB`
        },
        messages: {
          total: messages.length,
          unread: unreadMessages
        },
        recentActivity: formattedActivity
      };

      console.log('Returning formatted metrics:', metrics);
      return metrics;
    } catch (error) {
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

  async trackFileAccess(fileId: string, userId: string, action: string) {
    try {
      await this.prisma.userActivity.create({
        data: {
          userId,
          type: action,
          details: { fileId },
          timestamp: new Date()
        }
      });

      // Update real-time metrics
      this.updateUserMetrics(userId);
    } catch (error) {
      console.error('Error tracking file access:', error);
      throw new AppError('Failed to track file access', 500);
    }
  }

  private async updateUserMetrics(userId: string) {
    try {
      const metrics = await this.getUserMetrics(userId);
      if (this.wsService) {
        this.wsService.sendUpdate('analytics', userId, metrics);
      }
    } catch (error) {
      console.error('Error updating user metrics:', error);
    }
  }

  async getFileAccessHistory(fileId: string) {
    try {
      return await this.prisma.userActivity.findMany({
        where: {
          type: 'FILE_ACCESS',
          details: {
            path: ['fileId'],
            equals: fileId
          }
        },
        select: {
          timestamp: true,
          type: true,
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
    } catch (error) {
      console.error('Error getting file access history:', error);
      throw new AppError('Failed to get file access history', 500);
    }
  }

  async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      return this.metrics.get('system') || await this.collectSystemMetrics();
    } catch (error) {
      console.error('Error getting system metrics:', error);
      throw new AppError('Failed to get system metrics', 500);
    }
  }

  async getProviderStatistics(providerId: string): Promise<ProviderStatistics> {
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
          type: true,
          timestamp: true,
          details: true
        }
      });

      return {
        totalPatients,
        totalImages,
        totalShares,
        recentActivity
      };
    } catch (error) {
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