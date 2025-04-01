'use client';

import { Box } from '@mui/material';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useState, useEffect } from 'react';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh',
        width: '100%',
        bgcolor: 'background.default',
        color: 'text.primary',
        transition: 'background-color 0.3s, color 0.3s'
      }}
    >
      <Navbar onMenuClick={handleDrawerToggle} />
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1,
          bgcolor: 'background.default',
          color: 'text.primary',
          transition: 'background-color 0.3s, color 0.3s'
        }}
      >
        {children}
      </Box>
      <Footer />
    </Box>
  );
} 