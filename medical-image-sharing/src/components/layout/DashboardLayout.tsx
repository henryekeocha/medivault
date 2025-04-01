'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  useTheme,
  styled,
  CircularProgress,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Person as PersonIcon, 
  Settings as SettingsIcon,
  Image as ImageIcon,
  BarChart as AnalyticsIcon,
  Upload as UploadIcon,
  Share as ShareIcon,
  Event as EventIcon,
  Devices as DevicesIcon,
  Gavel as AuditIcon,
  Message as MessageIcon,
} from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';
import { routes, RoutePath, UserRole, isRouteForRole, DEFAULT_ROUTES, getRoutesByRole } from '@/config/routes';
import type { Route } from 'next';
import { useUser, useAuth } from '@clerk/nextjs';
import { Role } from '@prisma/client';
import { getCurrentUserRole } from '@/lib/clerk/actions';

const DRAWER_WIDTH = 240;
const COLLAPSED_DRAWER_WIDTH = 65;

interface NavigationItem {
  text: string;
  icon: JSX.Element;
  path: RoutePath;
}

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
}));

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(true);
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoaded: isClerkLoaded } = useUser();
  const { isSignedIn: isClerkSignedIn } = useAuth();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [userRole, setUserRole] = useState<Role | null>(null);

  // Load user role
  useEffect(() => {
    const loadUserRole = async () => {
      if (isClerkLoaded && isClerkSignedIn && user) {
        try {
          console.log('Loading user role from Clerk metadata first');
          
          // First try to get role directly from Clerk metadata
          const roleFromMetadata = user.publicMetadata?.role || user.unsafeMetadata?.role;
          
          if (roleFromMetadata) {
            console.log('Using role from Clerk metadata:', roleFromMetadata);
            setUserRole(roleFromMetadata as Role);
          } else {
            // If no role in Clerk metadata, try the server-side function
            console.log('No role in Clerk metadata, checking database');
            const role = await getCurrentUserRole();
            
            if (role) {
              console.log('User role found in database:', role);
              setUserRole(role);
            } else {
              console.error('No role found in Clerk metadata or database');
              // Do not default to PATIENT role, redirect to login instead
              setUserRole(null);
              router.replace('/auth/login?error=no_role_found');
            }
          }
        } catch (error) {
          console.error('Error loading user role:', error);
          
          // Try to use Clerk metadata as fallback
          const roleFromMetadata = user.publicMetadata?.role || user.unsafeMetadata?.role;
          if (roleFromMetadata) {
            console.log('Using role from Clerk metadata as fallback:', roleFromMetadata);
            setUserRole(roleFromMetadata as Role);
          } else {
            // Do not default to PATIENT role in case of error
            setUserRole(null);
            router.replace('/auth/login?error=role_error');
          }
        }
      }
    };
    
    loadUserRole();
  }, [isClerkLoaded, isClerkSignedIn, user, router]);

  // Handle routing based on auth state
  useEffect(() => {
    // Skip if still loading
    if (!isClerkLoaded) {
      return;
    }

    setIsInitialLoad(false);

    // Check if user is authenticated
    if (!isClerkSignedIn) {
      console.log('User not authenticated, redirecting to login');
      const cleanPath = pathname ? pathname.replace('/(protected)', '') : '/';
      const redirectUrl = `/auth/login${cleanPath !== '/' ? `?redirect=${cleanPath}` : ''}` as Route;
      router.replace(redirectUrl);
      return;
    }

    // Handle role-specific routing
    if (userRole) {
      const currentPath = pathname || '/';
      const isAllowedRoute = isRouteForRole(currentPath as RoutePath, userRole);
      
      if (!isAllowedRoute) {
        console.log('User not authorized for this route, redirecting to default route');
        const defaultRoute = DEFAULT_ROUTES[userRole];
        router.replace(defaultRoute);
      }
    }
  }, [isClerkLoaded, isClerkSignedIn, userRole, pathname, router]);

  // Show loading state
  if (isInitialLoad) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <CircularProgress />
      </Box>
    );
  }

  const isHomePage = pathname === '/';
  const shouldShowSidebar = isClerkSignedIn && !isHomePage;

  const handleNavigation = (path: RoutePath) => {
    try {
      console.log('Attempting navigation to:', path);
      
      // If path is a function (for dynamic routes), return early
      if (typeof path === 'function') {
        console.error('Dynamic routes should be called with an ID parameter');
        return;
      }
      
      // Remove any route group prefixes that might confuse Next.js
      let cleanPath = path;
      if (cleanPath.includes('(protected)')) {
        cleanPath = cleanPath.replace('/(protected)', '').replace('(protected)/', '') as Route;
      }
      
      console.log('Navigation to path:', cleanPath);
      router.push(cleanPath as Route);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const getNavigationItems = (): NavigationItem[] => {
    if (!userRole) return [];

    const baseItems: NavigationItem[] = [
      {
        text: 'Dashboard',
        icon: <DashboardIcon />,
        path: userRole === Role.ADMIN 
          ? routes.admin.dashboard 
          : userRole === Role.PROVIDER
            ? routes.provider.dashboard
            : routes.patient.dashboard,
      },
    ];

    let roleSpecificItems: NavigationItem[] = [];

    switch (userRole) {
      case Role.ADMIN:
        roleSpecificItems = [
          {
            text: 'Users',
            icon: <PersonIcon />,
            path: routes.admin.users,
          },
          {
            text: 'Statistics',
            icon: <AnalyticsIcon />,
            path: routes.admin.stats,
          },
          {
            text: 'Analytics',
            icon: <AnalyticsIcon />,
            path: routes.admin.analytics,
          },
          {
            text: 'Audit',
            icon: <AuditIcon />,
            path: routes.admin.audit,
          },
          {
            text: 'Storage',
            icon: <DevicesIcon />,
            path: routes.admin.storage,
          },
          {
            text: 'Settings',
            icon: <SettingsIcon />,
            path: routes.admin.settings,
          },
          {
            text: 'Images',
            icon: <ImageIcon />,
            path: routes.admin.images,
          },
          {
            text: 'Reports',
            icon: <AnalyticsIcon />,
            path: routes.admin.reports,
          },
          {
            text: 'Patients',
            icon: <PersonIcon />,
            path: routes.admin.patients,
          },
          {
            text: 'Providers',
            icon: <PersonIcon />,
            path: routes.admin.providers,
          },
          {
            text: 'Appointments',
            icon: <EventIcon />,
            path: routes.admin.appointments,
          },
          {
            text: 'Messages',
            icon: <MessageIcon />,
            path: routes.admin.messages,
          },
          {
            text: 'Profile',
            icon: <PersonIcon />,
            path: routes.profile.view,
          },
        ];
        break;
      case Role.PROVIDER:
        roleSpecificItems = [
          {
            text: 'Patients',
            icon: <PersonIcon />,
            path: routes.provider.patients,
          },
          {
            text: 'Images',
            icon: <ImageIcon />,
            path: routes.provider.images,
          },
          {
            text: 'Upload',
            icon: <UploadIcon />,
            path: routes.provider.upload,
          },
          {
            text: 'Share',
            icon: <ShareIcon />,
            path: routes.provider.share,
          },
          {
            text: 'Analytics',
            icon: <AnalyticsIcon />,
            path: routes.provider.analytics,
          },
          {
            text: 'Appointments',
            icon: <EventIcon />,
            path: routes.provider.appointments,
          },
          {
            text: 'Messages',
            icon: <MessageIcon />,
            path: routes.provider.messages,
          },
          {
            text: 'Analysis',
            icon: <AnalyticsIcon />,
            path: routes.provider.analysis,
          },
          {
            text: 'Profile',
            icon: <PersonIcon />,
            path: routes.provider.profile,
          },
          {
            text: 'Settings',
            icon: <SettingsIcon />,
            path: routes.provider.settings,
          },
        ];
        break;
      case Role.PATIENT:
        roleSpecificItems = [
          {
            text: 'My Images',
            icon: <ImageIcon />,
            path: routes.patient.images,
          },
          {
            text: 'Shared Files',
            icon: <ShareIcon />,
            path: routes.patient.share,
          },
          {
            text: 'My Appointments',
            icon: <EventIcon />,
            path: routes.patient.appointments,
          },
          {
            text: 'Messages',
            icon: <MessageIcon />,
            path: routes.patient.messages,
          },
          {
            text: 'Records',
            icon: <AnalyticsIcon />,
            path: routes.patient.records,
          },
          {
            text: 'My Providers',
            icon: <PersonIcon />,
            path: routes.patient.providers,
          },
          {
            text: 'Chatbot',
            icon: <MessageIcon />,
            path: routes.patient.chatbot,
          },
          {
            text: 'Profile',
            icon: <PersonIcon />,
            path: routes.profile.view,
          },
          {
            text: 'Settings',
            icon: <SettingsIcon />,
            path: routes.patient.settings,
          },
          {
            text: 'Account',
            icon: <PersonIcon />,
            path: routes.account.settings,
          },
        ];
        break;
    }

    return [...baseItems, ...roleSpecificItems];
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%', overflow: 'hidden' }}>
      {shouldShowSidebar && (
        <Drawer
          variant="permanent"
          sx={{
            width: isDrawerOpen ? DRAWER_WIDTH : COLLAPSED_DRAWER_WIDTH,
            flexShrink: 0,
            position: 'relative',
            '& .MuiDrawer-paper': {
              width: isDrawerOpen ? DRAWER_WIDTH : COLLAPSED_DRAWER_WIDTH,
              boxSizing: 'border-box',
              border: 'none',
              position: 'relative',
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
              backgroundColor: theme.palette.background.default,
              borderRight: `1px solid ${theme.palette.divider}`,
              height: '100%',
              overflowX: 'hidden',
            },
          }}
        >
          <Box sx={{ ...theme.mixins.toolbar }} />
          <List sx={{ p: 0 }}>
            {getNavigationItems().map((item) => (
              <ListItemButton
                key={item.text}
                onClick={() => handleNavigation(item.path)}
                selected={pathname === item.path}
                sx={{
                  minHeight: 48,
                  px: 2.5,
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                {isDrawerOpen && <ListItemText primary={item.text} />}
              </ListItemButton>
            ))}
          </List>
        </Drawer>
      )}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: `calc(100% - ${shouldShowSidebar ? (isDrawerOpen ? DRAWER_WIDTH : COLLAPSED_DRAWER_WIDTH) : 0}px)`,
          p: 0,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          overflowX: 'hidden',
          '& > *': {
            p: 0,
            '& .MuiGrid-container': {
              m: 0,
              width: '100%'
            }
          }
        }}
      >
        <Box sx={{ ...theme.mixins.toolbar }} />
        {children}
      </Box>
    </Box>
  );
} 