'use client';

import React from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Box,
} from '@mui/material';
import {
  BarChart as ChartIcon,
  Image as ImageIcon,
  CalendarMonth as CalendarIcon,
  Person as PersonIcon, 
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { withProtectedRoute } from '@/components/ProtectedRoute';
import { useRouter } from 'next/navigation';
import { Route } from 'next';

interface ReportCard {
  title: string;
  description: string;
  icon: React.ElementType;
  path: string;
}

function ReportsPage() {
  const router = useRouter();

  const reportCards: ReportCard[] = [
    {
      title: 'Image Analytics',
      description: 'View statistics about image uploads, sharing, and processing',
      icon: ImageIcon,
      path: '/reports/images',
    },
    {
      title: 'Appointment Analytics',
      description: 'Track appointment trends, cancellations, and scheduling patterns',
      icon: CalendarIcon,
      path: '/reports/appointments',
    },
    {
      title: 'User Activity',
      description: 'Monitor user engagement and platform usage',
      icon: PersonIcon,
      path: '/reports/users',
    },
    {
      title: 'System Performance',
      description: 'View system metrics and performance indicators',
      icon: TimelineIcon,
      path: '/reports/performance',
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Analytics & Reports
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Access detailed analytics and reports about platform usage and performance
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {reportCards.map((card) => (
          <Grid item xs={12} sm={6} md={4} key={card.title}>
            <Card>
              <CardActionArea
                onClick={() => router.push(card.path as Route)}
                sx={{ height: '100%' }}
              >
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      mb: 2,
                    }}
                  >
                    <card.icon
                      sx={{
                        fontSize: 40,
                        color: 'primary.main',
                        mr: 2,
                      }}
                    />
                    <Typography variant="h6" component="h2">
                      {card.title}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {card.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <ChartIcon sx={{ fontSize: 24, color: 'primary.main', mr: 1 }} />
              <Typography variant="h6">Quick Stats</Typography>
            </Box>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Images
                </Typography>
                <Typography variant="h4">1,234</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="text.secondary">
                  Active Users
                </Typography>
                <Typography variant="h4">567</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="text.secondary">
                  Appointments Today
                </Typography>
                <Typography variant="h4">89</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="text.secondary">
                  Storage Used
                </Typography>
                <Typography variant="h4">2.1 TB</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}

export default withProtectedRoute(ReportsPage, {
  allowedRoles: ['ADMIN', 'PROVIDER'],
  requireAuth: true,
}); 