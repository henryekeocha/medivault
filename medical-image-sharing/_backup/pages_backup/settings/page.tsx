'use client';

import React from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Grid, 
  Card, 
  CardContent, 
  CardActionArea,
  CardMedia,
  Button 
} from '@mui/material';
import { 
  Person as PersonIcon, 
  Security as SecurityIcon, 
  Notifications as NotificationsIcon, 
  Settings as PreferencesIcon,
  Devices as DevicesIcon
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import type { Route } from '@/types/routes';
import { useSession } from 'next-auth/react';
import { routes } from '@/config/routes';

interface SettingCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
}

const SettingCard: React.FC<SettingCardProps> = ({ title, description, icon, path }) => {
  const router = useRouter();
  
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardActionArea onClick={() => router.push(path as any)} sx={{ flexGrow: 1 }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
          {icon}
        </Box>
        <CardContent>
          <Typography gutterBottom variant="h6" component="div" align="center">
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center">
            {description}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (!session) {
    router.push(routes.root.login as Route);
    return null;
  }

  const settingsCards: SettingCardProps[] = [
    {
      title: 'Profile',
      description: 'Update your personal information and profile settings',
      icon: <PersonIcon sx={{ fontSize: 60, color: 'primary.main' }} />,
      path: routes.settings.profile,
    },
    {
      title: 'Security',
      description: 'Manage your password and security settings',
      icon: <SecurityIcon sx={{ fontSize: 60, color: 'primary.main' }} />,
      path: routes.settings.security,
    },
    {
      title: 'Notifications',
      description: 'Configure your notification preferences',
      icon: <NotificationsIcon sx={{ fontSize: 60, color: 'primary.main' }} />,
      path: routes.settings.notifications,
    },
    {
      title: 'Preferences',
      description: 'Customize your application experience',
      icon: <PreferencesIcon sx={{ fontSize: 60, color: 'primary.main' }} />,
      path: routes.settings.preferences,
    },
    {
      title: 'Devices',
      description: 'Manage your trusted devices and login history',
      icon: <DevicesIcon sx={{ fontSize: 60, color: 'primary.main' }} />,
      path: routes.settings.devices,
    },
  ];

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Settings
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Manage your account settings and preferences
        </Typography>
        
        <Paper sx={{ p: 3, mt: 3 }}>
          <Grid container spacing={3}>
            {settingsCards.map((card, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <SettingCard {...card} />
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Box>
    </Container>
  );
} 