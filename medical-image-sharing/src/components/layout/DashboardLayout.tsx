'use client';

import React, { useEffect } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  useTheme,
  styled,
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
} from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { routes, RoutePath, UserRole, isRouteForRole, DEFAULT_ROUTES, getRoutesByRole } from '@/config/routes';
import { Route } from 'next';

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
  const { user, isAuthenticated } = useAuth();

  // Add effect to handle authentication and routing
  useEffect(() => {
    console.log('Current pathname:', pathname);
    console.log('Auth state:', { user, isAuthenticated });
    
    if (!isAuthenticated) {
      console.log('User not authenticated, redirecting to login');
      const cleanPath = pathname.replace('/(protected)', '');
      const redirectUrl = `/login${cleanPath !== '/' ? `?redirect=${cleanPath}` : ''}` as Route;
      router.replace(redirectUrl);
      return;
    }

    if (pathname === '/' && user?.role) {
      console.log('Redirecting to default route for role:', user.role);
      const userRole = user.role as keyof typeof DEFAULT_ROUTES;
      const defaultRoute = DEFAULT_ROUTES[userRole];
      router.replace(defaultRoute as Route);
    }
  }, [pathname, isAuthenticated, user, router]);

  const isHomePage = pathname === '/';
  const shouldShowSidebar = isAuthenticated && !isHomePage;

  const handleNavigation = (path: RoutePath) => {
    try {
      console.log('Attempting navigation to:', path);
      console.log('Current user role:', user?.role);
      
      // If path is a function (for dynamic routes), return early
      if (typeof path === 'function') {
        console.error('Dynamic routes should be called with an ID parameter');
        return;
      }

      // Clean up the path by removing any (protected) segments
      const cleanPath = path.replace('/(protected)', '') as Route;
      
      // Ensure the path exists in our routes configuration
      const isValidPath = Object.values(routes).some(routeGroup => 
        Object.values(routeGroup).some(route => 
          typeof route === 'string' && route === path
        )
      );

      if (!isValidPath) {
        console.error(`Invalid route path: ${cleanPath}`);
        return;
      }

      // Check if the user has access to this route
      if (user?.role && !isRouteForRole(cleanPath as Route, user.role as UserRole)) {
        console.error(`User does not have access to route: ${cleanPath}`);
        return;
      }

      console.log('Navigation checks passed, pushing to:', cleanPath);
      router.push(cleanPath as Route);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const getNavigationItems = (): NavigationItem[] => {
    if (!user?.role) return [];

    const userRole = user.role as UserRole;
    const roleRoutes = getRoutesByRole(userRole);
    
    const baseItems: NavigationItem[] = [
      {
        text: 'Dashboard',
        icon: <DashboardIcon />,
        path: roleRoutes.dashboard,
      },
    ];

    let roleSpecificItems: NavigationItem[] = [];

    switch (userRole) {
      case 'Admin':
        roleSpecificItems = [
          ...(roleRoutes.users ? [{
            text: 'Users',
            icon: <PersonIcon />,
            path: roleRoutes.users,
          }] : []),
          ...(roleRoutes.analytics ? [{
            text: 'Analytics',
            icon: <AnalyticsIcon />,
            path: roleRoutes.analytics,
          }] : []),
          ...(roleRoutes.settings ? [{
            text: 'Settings',
            icon: <SettingsIcon />,
            path: roleRoutes.settings,
          }] : []),
          ...(roleRoutes.logs ? [{
            text: 'Logs',
            icon: <AuditIcon />,
            path: roleRoutes.logs,
          }] : []),
        ];
        break;

      case 'Provider':
        roleSpecificItems = [
          ...(roleRoutes.images ? [{
            text: 'Images',
            icon: <ImageIcon />,
            path: roleRoutes.images,
          }] : []),
          ...(roleRoutes.patients ? [{
            text: 'Patients',
            icon: <PersonIcon />,
            path: roleRoutes.patients,
          }] : []),
          ...(roleRoutes.settings ? [{
            text: 'Settings',
            icon: <SettingsIcon />,
            path: roleRoutes.settings,
          }] : []),
          ...(roleRoutes.devices ? [{
            text: 'Devices',
            icon: <DevicesIcon />,
            path: roleRoutes.devices,
          }] : []),
        ];
        break;

      case 'Patient':
        roleSpecificItems = [
          ...(roleRoutes.images ? [{
            text: 'My Images',
            icon: <ImageIcon />,
            path: roleRoutes.images,
          }] : []),
          ...(roleRoutes.upload ? [{
            text: 'Upload',
            icon: <UploadIcon />,
            path: roleRoutes.upload,
          }] : []),
          ...(roleRoutes.shares ? [{
            text: 'Share',
            icon: <ShareIcon />,
            path: roleRoutes.shares,
          }] : []),
          ...(roleRoutes.appointments ? [{
            text: 'My Appointments',
            icon: <EventIcon />,
            path: roleRoutes.appointments,
          }] : []),
          ...(roleRoutes.providers ? [{
            text: 'My Providers',
            icon: <PersonIcon />,
            path: roleRoutes.providers,
          }] : []),
          ...(roleRoutes.settings ? [{
            text: 'Settings',
            icon: <SettingsIcon />,
            path: roleRoutes.settings,
          }] : []),
          ...(roleRoutes.devices ? [{
            text: 'Devices',
            icon: <DevicesIcon />,
            path: roleRoutes.devices,
          }] : []),
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