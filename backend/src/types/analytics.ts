export interface UserMetrics {
  appointments: {
    total: number;
    upcoming: number;
    completed: number;
    cancelled: number;
  };
  images: {
    total: number;
    recentUploads: number;
    storageUsed: string;
  };
  messages: {
    total: number;
    unread: number;
  };
  recentActivity: Array<{
    id: string;
    user: string;
    action: string;
    time: string;
    avatar: string;
    details: Record<string, any>;
  }>;
} 