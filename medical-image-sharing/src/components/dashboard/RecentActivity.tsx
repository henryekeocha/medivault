import React from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Divider, 
  useTheme,
  Skeleton,
  Avatar 
} from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import EventIcon from '@mui/icons-material/Event';
import MailIcon from '@mui/icons-material/Mail';
import MedicationIcon from '@mui/icons-material/Medication';
import FavoriteIcon from '@mui/icons-material/Favorite';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ScheduleIcon from '@mui/icons-material/Schedule';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

// Define the activity interface
export interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  userId?: string;
  userName?: string;
  relatedId?: string;
  metadata?: Record<string, any>;
}

// Activity type icons mapping with colors
const activityTypeConfig: Record<string, { icon: React.ReactNode, color: string }> = {
  UPLOAD: { icon: <ImageIcon />, color: '#4caf50' },
  APPOINTMENT: { icon: <EventIcon />, color: '#ff9800' },
  MESSAGE: { icon: <MailIcon />, color: '#2196f3' },
  PRESCRIPTION: { icon: <MedicationIcon />, color: '#9c27b0' },
  HEALTH_METRIC: { icon: <FavoriteIcon />, color: '#f44336' },
  REPORT: { icon: <AssignmentIcon />, color: '#3f51b5' },
  SCHEDULE: { icon: <ScheduleIcon />, color: '#009688' },
  OTHER: { icon: <AccessTimeIcon />, color: '#607d8b' }
};

interface RecentActivityProps {
  title: string;
  activities: Activity[];
  loading?: boolean;
  maxItems?: number;
  emptyMessage?: string;
}

const RecentActivity: React.FC<RecentActivityProps> = ({
  title,
  activities,
  loading = false,
  maxItems = 10,
  emptyMessage = "No recent activities to display."
}) => {
  const theme = useTheme();

  // Function to format timestamp to relative time
  const formatRelativeTime = (timestamp: string): string => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInMs = now.getTime() - activityTime.getTime();
    const diffInSec = Math.floor(diffInMs / 1000);
    const diffInMin = Math.floor(diffInSec / 60);
    const diffInHour = Math.floor(diffInMin / 60);
    const diffInDay = Math.floor(diffInHour / 24);

    if (diffInSec < 60) {
      return 'just now';
    } else if (diffInMin < 60) {
      return `${diffInMin} ${diffInMin === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffInHour < 24) {
      return `${diffInHour} ${diffInHour === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffInDay < 7) {
      return `${diffInDay} ${diffInDay === 1 ? 'day' : 'days'} ago`;
    } else {
      // For older activities, show the actual date
      return activityTime.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric',
        year: now.getFullYear() !== activityTime.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <Paper sx={{ p: 3, borderRadius: 2, boxShadow: theme.shadows[2] }}>
        <Typography variant="h6" gutterBottom color="text.secondary">
          {title}
        </Typography>
        <Divider sx={{ mb: 2 }} />
        {Array.from(new Array(5)).map((_, index) => (
          <Box 
            key={index} 
            sx={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: 2, 
              py: 1.5,
              borderBottom: index < 4 ? '1px solid' : 'none',
              borderColor: 'divider'
            }}
          >
            <Skeleton variant="circular" width={40} height={40} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="80%" />
              <Skeleton variant="text" width="40%" />
            </Box>
          </Box>
        ))}
      </Paper>
    );
  }

  return (
    <Paper 
      sx={{ 
        p: 3, 
        borderRadius: 2,
        boxShadow: theme.shadows[2],
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Typography variant="h6" gutterBottom color="text.secondary">
        {title}
      </Typography>
      <Divider sx={{ mb: 2 }} />
      
      {activities.length > 0 ? (
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {activities.slice(0, maxItems).map((activity, index) => {
            const { icon, color } = activityTypeConfig[activity.type] || activityTypeConfig.OTHER;
            
            return (
              <Box
                key={activity.id}
                sx={{
                  py: 1.5,
                  px: 1,
                  mb: 1,
                  borderBottom: index < activities.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider',
                  '&:hover': { bgcolor: 'action.hover' },
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 2,
                }}
              >
                <Avatar
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: `${color}20`,
                    color: color,
                  }}
                >
                  {icon}
                </Avatar>
                
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1">{activity.description}</Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                    <Typography variant="caption" color="textSecondary">
                      {formatRelativeTime(activity.timestamp)}
                    </Typography>
                    {activity.userName && (
                      <Typography variant="caption" color="primary">
                        {activity.userName}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      ) : (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 2 }}>
            {emptyMessage}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default RecentActivity; 