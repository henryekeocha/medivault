'use client';

import React, { useEffect, useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Box,
  Stack,
  Button,
  Divider,
  Tooltip,
  Badge,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useThemeContext } from '@/contexts/ThemeContext';
import { useRouter, usePathname } from 'next/navigation';
import type { Route } from 'next';
import { routes, getRoutesByRole, UserRole } from '@/config/routes';
import { AccessibilityButton } from '@/components/accessibility/AccessibilityButton';
import { useNotifications } from '@/contexts/NotificationContext';
import { Role } from '@prisma/client';
import { useUser, useClerk } from '@clerk/nextjs';
import { useToast } from '@/contexts/ToastContext';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LoginIcon from '@mui/icons-material/Login';
import type { ReactNode } from 'react';

interface NavbarProps {
  onMenuClick: () => void;
}

// Convert Prisma Role to route UserRole
const convertRole = (role: Role): UserRole => {
  switch (role) {
    case Role.ADMIN:
      return 'Admin';
    case Role.PROVIDER:
      return 'Provider';
    case Role.PATIENT:
      return 'Patient';
    default:
      return 'Patient'; // Default fallback
  }
};

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useThemeContext();
  const [mounted, setMounted] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { unreadCount } = useNotifications();
  const toast = useToast();
  const isHomePage = pathname === '/';

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleProfile = () => {
    handleClose();
    const userRole = user?.publicMetadata?.role as Role;
    if (userRole) {
      const roleRoutes = getRoutesByRole(convertRole(userRole));
      if ('profile' in roleRoutes && roleRoutes.profile) {
        // Convert to string or use directly if it's a string already
        const profilePath = typeof roleRoutes.profile === 'string' 
          ? roleRoutes.profile 
          : '/profile';
        router.push(profilePath as Route);
      }
    }
  };

  const handleSettings = () => {
    handleClose();
    const userRole = user?.publicMetadata?.role as Role;
    if (userRole) {
      const roleRoutes = getRoutesByRole(convertRole(userRole));
      if ('settings' in roleRoutes && roleRoutes.settings) {
        // Convert to string or use directly if it's a string already
        const settingsPath = typeof roleRoutes.settings === 'string' 
          ? roleRoutes.settings 
          : '/settings';
        router.push(settingsPath as Route);
      }
    }
  };

  const handleDashboard = () => {
    const userRole = user?.publicMetadata?.role as Role;
    if (userRole) {
      const roleRoutes = getRoutesByRole(convertRole(userRole));
      if ('dashboard' in roleRoutes) {
        // Convert to string or use directly if it's a string already
        const dashboardPath = typeof roleRoutes.dashboard === 'string' 
          ? roleRoutes.dashboard 
          : '/dashboard';
        router.push(dashboardPath as Route);
      }
    }
  };

  const handleNotifications = () => {
    router.push(routes.settings.notifications);
  };

  const navigateHome = () => {
    router.push(routes.root.home as Route);
  };

  const renderNavbarContent = (): ReactNode => {
    return (
      <>
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          {!isHomePage && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              onClick={onMenuClick}
              edge="start"
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography
            variant="h6"
            component="div"
            sx={{ 
              flexGrow: 1, 
              cursor: 'pointer',
              '&:hover': {
                opacity: 0.8
              }
            }}
            onClick={navigateHome}
          >
            MediVault
          </Typography>

          {/* Right-aligned buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
            {/* Public buttons */}
            <AccessibilityButton />
            <IconButton
              onClick={toggleTheme}
              color="inherit"
              aria-label="Toggle theme"
              sx={{ 
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              {theme === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>

            {user ? (
              <>
                {/* Authenticated buttons */}
                <Tooltip title="Go to Dashboard">
                  <IconButton
                    onClick={handleDashboard}
                    color="inherit"
                    size="small"
                  >
                    <DashboardIcon />
                  </IconButton>
                </Tooltip>

                <IconButton
                  onClick={handleNotifications}
                  color="inherit"
                  size="small"
                >
                  <Badge badgeContent={unreadCount || 0} color="error">
                    <NotificationsIcon />
                  </Badge>
                </IconButton>

                {/* User menu */}
                <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                  <Typography variant="body2" sx={{ mr: 1, color: 'inherit' }}>
                    {user.primaryEmailAddress?.emailAddress || 'User'}
                  </Typography>
                  <IconButton
                    onClick={handleMenu}
                    size="small"
                    sx={{ ml: 1 }}
                  >
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                      {(user.primaryEmailAddress?.emailAddress?.[0] || 'U').toUpperCase()}
                    </Avatar>
                  </IconButton>
                </Box>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                  onClick={handleClose}
                >
                  <MenuItem onClick={handleProfile}>
                    <PersonIcon sx={{ mr: 1 }} fontSize="small" />
                    Profile
                  </MenuItem>
                  <MenuItem onClick={handleSettings}>
                    <SettingsIcon sx={{ mr: 1 }} fontSize="small" />
                    Settings
                  </MenuItem>
                  <Divider />
                  <MenuItem onClick={handleSignOut}>
                    <LogoutIcon sx={{ mr: 1 }} fontSize="small" />
                    Sign Out
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Button
                variant="contained"
                color="primary"
                onClick={() => router.push(routes.auth.login)}
                startIcon={<LoginIcon />}
              >
                Sign In
              </Button>
            )}
          </Box>
        </Box>
      </>
    );
  };

  if (!mounted) {
    return null;
  }

  return (
    <AppBar position="fixed" color="default" elevation={1}>
      <Toolbar>
        {renderNavbarContent()}
      </Toolbar>
    </AppBar>
  );
};
