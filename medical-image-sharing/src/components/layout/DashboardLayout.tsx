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
import { useAuth } from '@/contexts/AuthContext';
import { routes, RoutePath, UserRole, isRouteForRole, DEFAULT_ROUTES, getRoutesByRole } from '@/config/routes';
import { Route } from 'next';
import { useSession } from 'next-auth/react';
import { Role } from '@prisma/client';

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

// Add utility function to safely match role strings
function getRoleEnum(roleString: string | Role): Role {
  // If it's already a Role enum value, return it
  if (typeof roleString !== 'string') {
    return roleString;
  }
  
  // Convert string representation to Role enum
  switch(roleString) {
    case 'Admin':
    case 'ADMIN':
      return Role.ADMIN;
    case 'Provider':
    case 'PROVIDER':
      return Role.PROVIDER;
    case 'Patient':
    case 'PATIENT':
      return Role.PATIENT;
    default:
      console.error(`Unknown role: ${roleString}`);
      // Default to PATIENT as fallback
      return Role.PATIENT;
  }
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(true);
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, checkAuth } = useAuth();
  const { data: session, status: sessionStatus } = useSession();
  const [isLocallyAuthenticated, setIsLocallyAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const authCheckTimeoutRef = React.useRef<NodeJS.Timeout>();

  // Enhanced authentication check
  useEffect(() => {
    const checkAuthentication = async () => {
      // Clear any existing timeout
      if (authCheckTimeoutRef.current) {
        clearTimeout(authCheckTimeoutRef.current);
      }

      // Set a timeout to prevent infinite checking
      authCheckTimeoutRef.current = setTimeout(() => {
        setIsCheckingAuth(false);
        setIsInitialLoad(false);
      }, 5000);

      try {
        // First check NextAuth session
        if (sessionStatus === 'authenticated' && session?.user) {
          setIsLocallyAuthenticated(true);
          
          // If custom auth context says we're not authenticated but NextAuth says we are,
          // update the custom auth context
          if (!isAuthenticated && session.user) {
            console.log('Found NextAuth session but custom auth is not updated, syncing state...');
            setIsCheckingAuth(true);
            await checkAuth();
          }
        } else {
          // Fallback to localStorage token check
          const token = localStorage.getItem('token');
          const hasToken = !!token;
          
          if (hasToken) {
            setIsLocallyAuthenticated(true);
            
            if (!isAuthenticated) {
              setIsCheckingAuth(true);
              await checkAuth();
            }
          } else {
            setIsLocallyAuthenticated(false);
          }
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
      } finally {
        setIsCheckingAuth(false);
        setIsInitialLoad(false);
        if (authCheckTimeoutRef.current) {
          clearTimeout(authCheckTimeoutRef.current);
        }
      }
    };

    checkAuthentication();

    // Cleanup
    return () => {
      if (authCheckTimeoutRef.current) {
        clearTimeout(authCheckTimeoutRef.current);
      }
    };
  }, [isAuthenticated, checkAuth, session, sessionStatus]);

  // Handle routing based on auth state
  useEffect(() => {
    // Skip if still loading or checking
    if (isInitialLoad || isCheckingAuth) {
      return;
    }

    const isUserAuthenticated = sessionStatus === 'authenticated' || isAuthenticated || isLocallyAuthenticated;
    
    if (!isUserAuthenticated) {
      console.log('User not authenticated, redirecting to login');
      const cleanPath = pathname ? pathname.replace('/(protected)', '') : '/';
      const redirectUrl = `/auth/login${cleanPath !== '/' ? `?redirect=${cleanPath}` : ''}` as Route;
      router.replace(redirectUrl);
      return;
    }

    // Handle role-specific routing
    const userRole = (session?.user?.role || user?.role) as keyof typeof DEFAULT_ROUTES;
    if (userRole) {
      if (pathname === '/') {
        const defaultRoute = DEFAULT_ROUTES[userRole] || '/dashboard';
        router.replace(defaultRoute as Route);
        return;
      }

      // Check for unauthorized role access
      const roleValue = String(userRole).toUpperCase();
      const isAdminPath = pathname?.startsWith('/admin');
      const isProviderPath = pathname?.startsWith('/provider');
      const isPatientPath = pathname?.startsWith('/patient');
      
      if (
        (isAdminPath && roleValue !== 'ADMIN') ||
        (isProviderPath && roleValue !== 'PROVIDER') ||
        (isPatientPath && roleValue !== 'PATIENT')
      ) {
        const correctPath = DEFAULT_ROUTES[userRole] || '/dashboard';
        router.replace(correctPath as Route);
      }
    }
  }, [pathname, isAuthenticated, isLocallyAuthenticated, user, router, isCheckingAuth, session, sessionStatus, isInitialLoad]);

  const isHomePage = pathname === '/';
  const shouldShowSidebar = (isAuthenticated || isLocallyAuthenticated || sessionStatus === 'authenticated') && !isHomePage;

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
    if (!user?.role) return [];

    // Convert Role to a consistent string format
    const roleValue = typeof user.role === 'string' 
      ? (user.role.toUpperCase() === 'ADMIN' 
        ? 'ADMIN' 
        : user.role.toUpperCase() === 'PROVIDER' 
          ? 'PROVIDER' 
          : 'PATIENT')
      : String(user.role);
    
    console.log('Getting navigation items for role:', roleValue);
    
    const baseItems: NavigationItem[] = [
      {
        text: 'Dashboard',
        icon: <DashboardIcon />,
        path: roleValue === 'ADMIN' 
          ? routes.admin.dashboard 
          : roleValue === 'PROVIDER'
            ? routes.provider.dashboard
            : routes.patient.dashboard,
      },
    ];

    let roleSpecificItems: NavigationItem[] = [];

    // Use the string value for switch case matching
    switch (roleValue) {
      case 'ADMIN':
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
            path: routes.dashboard.reports,
          },
          {
            text: 'Patients',
            icon: <PersonIcon />,
            path: routes.patients.list,
          },
          {
            text: 'Providers',
            icon: <PersonIcon />,
            path: routes.providers.list,
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
        
      case 'PROVIDER':
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
        
      case 'PATIENT':
      default:
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

    // Log the items for debugging
    console.log('Navigation items:', [...baseItems, ...roleSpecificItems]);
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