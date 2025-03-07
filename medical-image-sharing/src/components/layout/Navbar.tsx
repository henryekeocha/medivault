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
import { useAuth } from '@/contexts/AuthContext';
import { routes, getRoutesByRole, UserRole } from '@/config/routes';
import { AccessibilityButton } from '@/components/accessibility/AccessibilityButton';
import { useNotifications } from '@/contexts/NotificationContext';
import { Role } from '@prisma/client';

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
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useThemeContext();
  const [mounted, setMounted] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { NotificationBell } = useNotifications();
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

  const handleLogout = () => {
    handleClose();
    logout();
    router.push(routes.root.login as Route);
  };

  const handleProfile = () => {
    handleClose();
    if (user?.role) {
      const userRole = convertRole(user.role as Role);
      const roleRoutes = getRoutesByRole(userRole);
      if ('profile' in roleRoutes) {
        router.push(roleRoutes.profile as Route);
      }
    }
  };

  const handleSettings = () => {
    handleClose();
    if (user?.role) {
      const userRole = convertRole(user.role as Role);
      const roleRoutes = getRoutesByRole(userRole);
      if ('settings' in roleRoutes) {
        router.push(roleRoutes.settings as Route);
      }
    }
  };

  const handleDashboard = () => {
    if (user?.role) {
      const userRole = convertRole(user.role as Role);
      const roleRoutes = getRoutesByRole(userRole);
      if ('dashboard' in roleRoutes) {
        router.push(roleRoutes.dashboard as Route);
      }
    }
  };

  const navigateHome = () => {
    router.push(routes.root.home as Route);
  };

  if (!mounted) {
    return null;
  }

  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
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

        <Stack direction="row" spacing={1} alignItems="center">
          {user && (
            <Tooltip title="Go to Dashboard">
              <IconButton
                color="inherit"
                onClick={handleDashboard}
                sx={{
                  mr: 1,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                <DashboardIcon />
              </IconButton>
            </Tooltip>
          )}

          <AccessibilityButton />

          <IconButton
            onClick={toggleTheme}
            color="inherit"
            aria-label="Toggle theme"
            sx={{ 
              ml: 1,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            {theme === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>

          {user ? (
            <>
              <Box 
                sx={{ 
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  zIndex: (theme) => theme.zIndex.modal
                }}
              >
                <NotificationBell />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                <Typography variant="body2" sx={{ mr: 1, color: 'inherit' }}>
                  {user.email}
                </Typography>
                <IconButton
                  onClick={handleMenu}
                  size="small"
                  sx={{ ml: 1 }}
                  aria-controls="menu-appbar"
                  aria-haspopup="true"
                >
                  <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                    {user.email?.[0].toUpperCase()}
                  </Avatar>
                </IconButton>
              </Box>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
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
                <MenuItem onClick={handleLogout}>
                  <LogoutIcon sx={{ mr: 1 }} fontSize="small" />
                  Sign Out
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Stack direction="row" spacing={1}>
              <Button 
                color="inherit" 
                onClick={() => router.push(routes.root.login as Route)}
              >
                Sign In
              </Button>
              <Button 
                color="inherit"
                variant="outlined"
                onClick={() => router.push(routes.root.register as Route)}
                sx={{ 
                  borderColor: 'rgba(255, 255, 255, 0.5)', 
                  '&:hover': { 
                    borderColor: 'white',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  } 
                }}
              >
                Register
              </Button>
            </Stack>
          )}
        </Stack>
      </Toolbar>
    </AppBar>
  );
};
