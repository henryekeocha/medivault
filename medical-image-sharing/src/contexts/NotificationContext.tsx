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
import { ApiClient } from '@/lib/api/client';
import { NotificationResponse } from '@/lib/api/types';
import { useAuth } from './AuthContext';

// Modified to match backend structure while maintaining backward compatibility
interface Notification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
  read: boolean;
  title?: string;
  data?: any;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  clearNotifications: () => void;
  deleteNotification: (id: string) => void;
  fetchNotifications: () => Promise<void>;
  NotificationBell: React.FC;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  addNotification: () => {},
  markAsRead: () => {},
  clearNotifications: () => {},
  deleteNotification: () => {},
  fetchNotifications: async () => {},
  NotificationBell: () => null,
});

export const useNotifications = () => useContext(NotificationContext);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const auth = useAuth();
  const apiClient = ApiClient.getInstance();
  
  // Safely access isAuthenticated property
  const isAuthenticated = auth?.isAuthenticated || false;

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  // Map server notification to client notification format
  const mapNotification = (notification: NotificationResponse): Notification => ({
    id: notification.id,
    message: notification.message,
    title: notification.title,
    type: mapNotificationType(notification.type),
    timestamp: new Date(notification.createdAt),
    read: notification.read,
    data: notification.data
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
      if (!isAuthenticated) {
        return;
      }

      const response = await apiClient.getNotifications();
      if (response && response.data) {
        const mappedNotifications = response.data.map(mapNotification);
        setNotifications(mappedNotifications);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, [isAuthenticated]);

  // Fetch notifications when the component mounts and when auth state changes
  useEffect(() => {
    fetchNotifications();

    // Set up polling for new notifications every 30 seconds
    const interval = setInterval(() => {
      if (isAuthenticated) {
        fetchNotifications();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchNotifications, isAuthenticated]);

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false,
    };
    setNotifications((prev) => [newNotification, ...prev]);
  };

  const markAsRead = async (id: string) => {
    try {
      await apiClient.markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id ? { ...notification, read: true } : notification
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await apiClient.deleteNotification(id);
      setNotifications((prev) => prev.filter((notification) => notification.id !== id));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const NotificationBell: React.FC = () => {
    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
      <Box 
        sx={{ 
          position: 'relative', 
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <IconButton 
          color="inherit" 
          onClick={handleClick}
          aria-label="Show notifications"
          aria-controls={Boolean(anchorEl) ? 'notification-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={Boolean(anchorEl)}
          sx={{ 
            width: { xs: '36px', sm: '44px' }, 
            height: { xs: '36px', sm: '44px' },
            position: 'relative'
          }}
        >
          <Badge 
            badgeContent={unreadCount} 
            color="error"
            sx={{
              '& .MuiBadge-badge': {
                right: -3,
                top: 3,
              }
            }}
          >
            <NotificationsIcon />
          </Badge>
        </IconButton>
        <Menu
          id="notification-menu"
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          onClick={handleClose}
          PaperProps={{
            elevation: 8,
            sx: {
              width: { xs: 280, sm: 360 },
              maxHeight: 400,
              mt: 1.5,
              overflow: 'visible',
              filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
              '&:before': {
                content: '""',
                display: 'block',
                position: 'absolute',
                top: 0,
                right: 14,
                width: 10,
                height: 10,
                bgcolor: 'background.paper',
                transform: 'translateY(-50%) rotate(45deg)',
                zIndex: 0,
              },
            },
          }}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          keepMounted
          sx={{
            '& .MuiMenu-paper': {
              width: { xs: 280, sm: 360 },
            },
            zIndex: (theme) => theme.zIndex.modal + 1
          }}
          slotProps={{
            paper: {
              sx: {
                overflow: 'visible'
              }
            }
          }}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="h6">Notifications</Typography>
          </Box>
          <Divider />
          {notifications.length === 0 ? (
            <MenuItem>
              <Typography variant="body2" color="text.secondary">
                No notifications
              </Typography>
            </MenuItem>
          ) : (
            notifications.map((notification) => (
              <MenuItem
                key={notification.id}
                onClick={() => markAsRead(notification.id)}
                sx={{
                  backgroundColor: notification.read ? 'transparent' : 'action.hover',
                  display: 'block',
                  padding: 2,
                  position: 'relative',
                }}
              >
                <Box>
                  <Typography variant="subtitle2" fontWeight={notification.read ? 'normal' : 'bold'}>
                    {notification.title || 'Notification'}
                  </Typography>
                  <Typography variant="body2">{notification.message}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(notification.timestamp).toLocaleString()}
                  </Typography>
                  <IconButton 
                    size="small" 
                    sx={{ 
                      position: 'absolute', 
                      top: 8, 
                      right: 8,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                    aria-label="Delete notification"
                  >
                    <Box sx={{ fontSize: '1rem' }}>×</Box>
                  </IconButton>
                </Box>
              </MenuItem>
            ))
          )}
        </Menu>
      </Box>
    );
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        markAsRead,
        clearNotifications,
        deleteNotification,
        fetchNotifications,
        NotificationBell,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
} 