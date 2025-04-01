'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  IconButton,
  Divider,
} from '@mui/material';
import { Notifications as NotificationsIcon } from '@mui/icons-material';
import { sharedClient } from '@/lib/api';
import { NotificationResponse } from '@/lib/api/types';
import { useAuth } from '@clerk/nextjs';
import { useWebSocket } from './WebSocketContext';
import { useToast } from './ToastContext';

// Modified to match backend structure while maintaining backward compatibility
interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: Date;
}

interface ApiError {
  response?: {
    status: number;
  };
  message?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  deleteNotification: (id: string) => void;
  fetchNotifications: () => Promise<void>;
  NotificationBell: React.FC;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSignedIn } = useAuth();
  const { onNotificationEvent } = useWebSocket();
  const { showError } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    if (!isSignedIn) {
      setNotifications([]);
      return;
    }

    // Fetch notifications when user is signed in
    const fetchNotifications = async () => {
      try {
        const response = await sharedClient.getNotifications();
        if (response.status === 'success') {
          setNotifications(response.data.map(mapNotification));
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
        const apiError = error as ApiError;
        // Don't show error toast for 401 as it's expected when not authenticated
        if (apiError.response?.status !== 401) {
          showError('Failed to fetch notifications');
        }
      }
    };

    fetchNotifications();

    // Subscribe to real-time notifications
    const unsubscribe = onNotificationEvent((notification) => {
      setNotifications(prev => [mapNotification(notification), ...prev]);
    });

    return () => {
      unsubscribe();
    };
  }, [isSignedIn, onNotificationEvent, showError]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  // Map server notification to client notification format
  const mapNotification = (notification: NotificationResponse): Notification => ({
    id: notification.id,
    title: notification.title || 'Notification',
    message: notification.message || 'No message',
    type: mapNotificationType(notification.type),
    read: notification.read,
    createdAt: new Date(notification.createdAt),
  });

  // Map server notification type to client notification type
  const mapNotificationType = (type: string): 'info' | 'warning' | 'error' | 'success' => {
    if (type.includes('ERROR')) return 'error';
    if (type.includes('ALERT')) return 'warning';
    if (type.includes('SUCCESS')) return 'success';
    return 'info';
  };

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications');
      if (!response.ok) throw new Error('Failed to fetch notifications');
      const data = await response.json();
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, []);

  const markAsRead = async (id: string) => {
    if (!isSignedIn) return;
    
    try {
      await sharedClient.markNotificationAsRead(id);
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      const apiError = error as ApiError;
      if (apiError.response?.status !== 401) {
        showError('Failed to mark notification as read');
      }
    }
  };

  const markAllAsRead = async () => {
    if (!isSignedIn) return;
    
    try {
      await sharedClient.markAllNotificationsAsRead();
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, read: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      const apiError = error as ApiError;
      if (apiError.response?.status !== 401) {
        showError('Failed to mark all notifications as read');
      }
    }
  };

  const clearNotifications = async () => {
    if (!isSignedIn) return;
    
    try {
      setNotifications([]);
    } catch (error) {
      console.error('Error clearing notifications:', error);
      const apiError = error as ApiError;
      if (apiError.response?.status !== 401) {
        showError('Failed to clear notifications');
      }
    }
  };

  const deleteNotification = async (id: string) => {
    if (!isSignedIn) return;
    
    try {
      await sharedClient.deleteNotification(id);
      setNotifications(prev => prev.filter(notification => notification.id !== id));
    } catch (error) {
      console.error('Failed to delete notification:', error);
      const apiError = error as ApiError;
      if (apiError.response?.status !== 401) {
        showError('Failed to delete notification');
      }
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const NotificationBell: React.FC = () => {
    return (
      <Box>
        <IconButton
          color="inherit"
          onClick={handleClick}
          aria-label="show notifications"
        >
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          PaperProps={{
            sx: {
              maxHeight: 400,
              width: 360,
            },
          }}
        >
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Notifications</Typography>
            {unreadCount > 0 && (
              <Typography
                variant="body2"
                color="primary"
                sx={{ cursor: 'pointer' }}
                onClick={markAllAsRead}
              >
                Mark all as read
              </Typography>
            )}
          </Box>
          <Divider />
          {notifications.length === 0 ? (
            <MenuItem disabled>
              <Typography variant="body2" color="text.secondary">
                No notifications
              </Typography>
            </MenuItem>
          ) : (
            notifications.map((notification) => (
              <MenuItem
                key={notification.id}
                onClick={() => {
                  if (!notification.read) {
                    markAsRead(notification.id);
                  }
                  handleClose();
                }}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  py: 2,
                  px: 2,
                  backgroundColor: notification.read ? 'inherit' : 'action.hover',
                }}
              >
                <Typography variant="subtitle2" color="text.primary">
                  {notification.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {notification.message}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  {new Date(notification.createdAt).toLocaleString()}
                </Typography>
              </MenuItem>
            ))
          )}
          {notifications.length > 0 && (
            <>
              <Divider />
              <MenuItem onClick={clearNotifications}>
                <Typography variant="body2" color="error">
                  Clear all notifications
                </Typography>
              </MenuItem>
            </>
          )}
        </Menu>
      </Box>
    );
  };

  const value = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    deleteNotification,
    fetchNotifications,
    NotificationBell,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}; 