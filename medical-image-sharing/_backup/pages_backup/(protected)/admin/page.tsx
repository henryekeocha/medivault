'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
} from '@mui/material';
import {
  UserIcon as UsersIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline';

// Define a type for admin sections
interface AdminSection {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
}

export default function AdminPage() {
  const auth = useAuth();

  // Redirect if not admin
  React.useEffect(() => {
    if (!auth.isAuthenticated || auth.user?.role !== ('admin' as UserRole)) {
      window.location.href = '/auth/login';
    }
  }, [auth]);

  const adminSections: AdminSection[] = [
    {
      title: 'User Management',
      description: 'Manage users, roles, and permissions',
      icon: UsersIcon,
      href: '/admin/users',
    },
    {
      title: 'System Settings',
      description: 'Configure system-wide settings and preferences',
      icon: Cog6ToothIcon,
      href: '/admin/settings',
    },
    {
      title: 'Dashboard',
      description: 'View system analytics and statistics',
      icon: ChartBarIcon,
      href: '/admin/dashboard',
    },
    {
      title: 'Test Users',
      description: 'Create test accounts for different user roles',
      icon: BeakerIcon,
      href: '/admin/test-users',
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Admin Dashboard
      </Typography>
      <Grid container spacing={3}>
        {adminSections.map((section) => (
          <Grid item xs={12} sm={6} md={4} key={section.title}>
            <Card>
              <Link href={section.href as any} passHref style={{ textDecoration: 'none' }}>
                <CardActionArea>
                  <CardContent>
                    <section.icon className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-4" />
                    <Typography variant="h6" component="h2">
                      {section.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {section.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Link>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
} 