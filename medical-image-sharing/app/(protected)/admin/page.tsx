'use client';

import React from 'react';
import Link, { LinkProps as NextLinkProps } from 'next/link';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
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
  href: NextLinkProps<{}>['href'];
}

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  // Redirect if not admin
  React.useEffect(() => {
    if (isLoaded && (!user || user.publicMetadata.role !== 'ADMIN')) {
      router.push('/auth/login');
    }
  }, [user, isLoaded, router]);

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

  if (!isLoaded) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  if (!user || user.publicMetadata.role !== 'ADMIN') {
    return null;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>
      <Grid container spacing={3}>
        {adminSections.map((section) => (
          <Grid item xs={12} sm={6} md={3} key={section.title}>
            <Link href={section.href} passHref style={{ textDecoration: 'none' }}>
              <Card>
                <CardActionArea>
                  <CardContent>
                    <section.icon style={{ width: 40, height: 40, marginBottom: 8 }} />
                    <Typography variant="h6" gutterBottom>
                      {section.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {section.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Link>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
} 