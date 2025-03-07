import React from 'react';
import { 
  Paper, 
  Typography, 
  List, 
  ListItem, 
  ListItemAvatar, 
  ListItemText, 
  Avatar, 
  Divider,
  Skeleton,
  Box
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface Activity {
  id: string;
  user: string;
  action: string;
  time: string;
  avatar: string;
}

interface ActivityTimelineProps {
  title: string;
  activities: Activity[];
  loading?: boolean;
}

const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ 
  title, 
  activities, 
  loading = false 
}) => {
  const theme = useTheme();

  const renderSkeleton = () => (
    <List sx={{ width: '100%', bgcolor: 'background.paper', p: 0 }}>
      {[1, 2, 3, 4, 5].map((item) => (
        <React.Fragment key={item}>
          <ListItem alignItems="flex-start">
            <ListItemAvatar>
              <Skeleton variant="circular" width={40} height={40} />
            </ListItemAvatar>
            <ListItemText
              primary={<Skeleton variant="text" width="60%" />}
              secondary={
                <React.Fragment>
                  <Skeleton variant="text" width="80%" />
                  <Skeleton variant="text" width="40%" />
                </React.Fragment>
              }
            />
          </ListItem>
          {item < 5 && <Divider variant="inset" component="li" />}
        </React.Fragment>
      ))}
    </List>
  );

  return (
    <Paper
      sx={{
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderRadius: 2,
        boxShadow: theme.shadows[2],
      }}
    >
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {title}
      </Typography>

      {loading ? (
        renderSkeleton()
      ) : (
        <List sx={{ width: '100%', bgcolor: 'background.paper', p: 0 }}>
          {activities.map((activity, index) => (
            <React.Fragment key={activity.id}>
              <ListItem alignItems="flex-start">
                <ListItemAvatar>
                  <Avatar alt={activity.user} src={activity.avatar} />
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography
                      component="span"
                      variant="body1"
                      color="text.primary"
                      sx={{ fontWeight: 'medium' }}
                    >
                      {activity.user}
                    </Typography>
                  }
                  secondary={
                    <React.Fragment>
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.primary"
                      >
                        {activity.action}
                      </Typography>
                      <Typography
                        component="div"
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 0.5 }}
                      >
                        {activity.time}
                      </Typography>
                    </React.Fragment>
                  }
                />
              </ListItem>
              {index < activities.length - 1 && <Divider variant="inset" component="li" />}
            </React.Fragment>
          ))}
        </List>
      )}
    </Paper>
  );
};

export default ActivityTimeline; 