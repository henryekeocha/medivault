'use client';

import React from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { routes } from '@/config/routes';
import { Box, Container, Typography, Paper, List, ListItem, ListItemText, ListItemIcon, Divider } from '@mui/material';
import { DevicesOther as DevicesIcon, Computer as ComputerIcon, PhoneAndroid as PhoneIcon, Tablet as TabletIcon } from '@mui/icons-material';

export default function DevicesPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  if (!user) {
    router.push(routes.root.login);
    return null;
  }

  // Mock data for devices - in a real app, this would come from your backend
  const devices = [
    {
      id: '1',
      name: 'MacBook Pro',
      type: 'computer',
      lastActive: '2024-03-20T10:30:00Z',
      location: 'New York, NY',
      icon: <ComputerIcon />,
    },
    {
      id: '2',
      name: 'iPhone 13',
      type: 'phone',
      lastActive: '2024-03-20T09:15:00Z',
      location: 'New York, NY',
      icon: <PhoneIcon />,
    },
    {
      id: '3',
      name: 'iPad Pro',
      type: 'tablet',
      lastActive: '2024-03-19T15:45:00Z',
      location: 'New York, NY',
      icon: <TabletIcon />,
    },
  ];

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Trusted Devices
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Manage the devices that have access to your account
      </Typography>

      <Paper sx={{ mt: 3 }}>
        <List>
          {devices.map((device, index) => (
            <React.Fragment key={device.id}>
              <ListItem>
                <ListItemIcon>
                  {device.icon}
                </ListItemIcon>
                <ListItemText
                  primary={device.name}
                  secondary={
                    <>
                      <Typography component="span" variant="body2" color="text.primary">
                        Last active: {new Date(device.lastActive).toLocaleString()}
                      </Typography>
                      <br />
                      <Typography component="span" variant="body2" color="text.secondary">
                        Location: {device.location}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
              {index < devices.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      </Paper>
    </Container>
  );
} 