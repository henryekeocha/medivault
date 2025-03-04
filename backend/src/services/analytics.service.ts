import { WebSocketService } from './websocket.service.js';
import { PrismaClient } from '@prisma/client';
import type { UserActivity, Image } from '@prisma/client';

interface SystemMetrics {
  totalStorage: number;
  usedStorage: number;
  activeUsers: number;
  totalFiles: number;
  filesByType: Record<string, number>;
}

interface UserMetrics {
  totalUploads: number;
  totalDownloads: number;
  storageUsed: number;
  recentActivity: Array<{
    action: string;
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
      this.prisma.userActivity.groupBy({
        by: ['userId'],
        where: {
          timestamp: {
            gt: new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
          }
        },
        _count: true
      }),
      this.prisma.image.groupBy({
        by: ['fileType'],
        _count: true
      })
    ]);

    const filesByType = fileTypes.reduce((acc: Record<string, number>, curr) => {
      acc[curr.fileType] = curr._count;
      return acc;
    }, {});

    return {
      totalStorage: totalStorage._sum.fileSize || 0,
      usedStorage: totalStorage._sum.fileSize || 0,
      activeUsers: activeUsers.length,
      totalFiles,
      filesByType
    };
  }

  async getUserMetrics(userId: string): Promise<UserMetrics> {
    const [
      uploads,
      downloads,
      storage,
      activity
    ] = await Promise.all([
      this.prisma.image.count({
        where: {
          userId
        }
      }),
      this.prisma.userActivity.count({
        where: {
          userId,
          type: 'DOWNLOAD'
        }
      }),
      this.prisma.image.aggregate({
        where: {
          userId
        },
        _sum: {
          fileSize: true
        }
      }),
      this.prisma.userActivity.findMany({
        where: {
          userId
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: 10
      })
    ]);

    return {
      totalUploads: uploads,
      totalDownloads: downloads,
      storageUsed: storage._sum.fileSize || 0,
      recentActivity: activity.map(a => ({
        action: a.type,
        timestamp: a.timestamp,
        details: a.details
      }))
    };
  }

  async trackFileAccess(fileId: string, userId: string, action: string) {
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
  }

  private async updateUserMetrics(userId: string) {
    const metrics = await this.getUserMetrics(userId);
    if (this.wsService) {
      this.wsService.sendUpdate('analytics', userId, metrics);
    }
  }

  async getFileAccessHistory(fileId: string) {
    return this.prisma.userActivity.findMany({
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
  }

  async getSystemMetrics(): Promise<SystemMetrics> {
    return this.metrics.get('system') || await this.collectSystemMetrics();
  }

  stopMetricsCollection() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
} 