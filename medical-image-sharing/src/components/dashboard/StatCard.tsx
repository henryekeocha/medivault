import React from 'react';
import { Paper, Typography, Box, LinearProgress, Skeleton } from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  progress?: number;
  loading?: boolean;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  progress, 
  loading = false,
  color
}) => {
  const theme = useTheme();
  
  return (
    <Paper
      sx={{
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 2,
        boxShadow: theme.shadows[2],
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          p: 1.5,
          borderRadius: '0 0 0 16px',
          backgroundColor: color || theme.palette.background.default,
          color: color ? theme.palette.getContrastText(color) : 'inherit',
        }}
      >
        {icon}
      </Box>
      
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {title}
      </Typography>
      
      {loading ? (
        <>
          <Skeleton variant="text" width="60%" height={40} />
          <Skeleton variant="text" width="40%" />
          {progress !== undefined && <Skeleton variant="rectangular" height={10} sx={{ mt: 1 }} />}
        </>
      ) : (
        <>
          <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            {value}
          </Typography>
          
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
          
          {progress !== undefined && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <Box sx={{ width: '100%', mr: 1 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={progress} 
                  sx={{ 
                    height: 8, 
                    borderRadius: 5,
                    backgroundColor: theme.palette.grey[200],
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 5,
                      backgroundColor: progress > 90 
                        ? theme.palette.error.main 
                        : progress > 70 
                          ? theme.palette.warning.main 
                          : color || theme.palette.primary.main,
                    }
                  }}
                />
              </Box>
              <Box sx={{ minWidth: 35 }}>
                <Typography variant="body2" color="text.secondary">{`${Math.round(progress)}%`}</Typography>
              </Box>
            </Box>
          )}
        </>
      )}
    </Paper>
  );
};

export default StatCard; 