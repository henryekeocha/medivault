'use client';

import { Inter } from 'next/font/google';
import { Box } from '@mui/material';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Providers } from '@/components/Providers';
import PageStatusCheck from '@/components/PageStatusCheck';
import '@/styles/home.css';
import { useState, useEffect } from 'react';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className={inter.className} style={{ margin: 0, padding: 0 }}>
        <Providers>
          <PageStatusCheck>
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
          </PageStatusCheck>
        </Providers>
      </body>
    </html>
  );
}
