'use client';

import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  IconButton,
  Link as MuiLink,
  Divider,
  useTheme,
  Alert,
  Button,
  Stack,
  useMediaQuery,
} from '@mui/material';
import {
  Facebook as FacebookIcon,
  Twitter as TwitterIcon,
  LinkedIn as LinkedInIcon,
  Instagram as InstagramIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  HealthAndSafety as HealthIcon,
  CloudQueue as CloudIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import Image from 'next/image';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { usePathname } from 'next/navigation';

// Define proper types for our links
type FooterLink = {
  name: string;
  href: string;
  icon?: React.ReactNode;
};

type FooterColumn = {
  title: string;
  links: FooterLink[];
};

// Define route types for Next.js
type Route = '/privacy' | '/terms' | '/cookies' | '/sitemap';

export function Footer() {
  const theme = useTheme();
  const pathname = usePathname();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Add error handling with useErrorHandler hook
  const { error, clearError } = useErrorHandler();
  
  // Only show footer on homepage
  if (pathname !== '/') {
    return null;
  }
  
  const footerLinks: FooterColumn[] = [
    {
      title: 'Platform',
      links: [
        { name: 'Features', href: '/#features', icon: <CloudIcon fontSize="small" /> },
        { name: 'Security', href: '/security', icon: <SecurityIcon fontSize="small" /> },
        { name: 'HIPAA Compliance', href: '/hipaa', icon: <HealthIcon fontSize="small" /> },
      ],
    },
    {
      title: 'Resources',
      links: [
        { name: 'Blog', href: '/blog' },
        { name: 'Help Center', href: '/help' },
        { name: 'Developer API', href: '/api-docs' },
        { name: 'Community', href: '/community' },
      ],
    },
    {
      title: 'Company',
      links: [
        { name: 'About Us', href: '/about' },
        { name: 'Careers', href: '/careers' },
        { name: 'Press', href: '/press' },
        { name: 'Contact Us', href: '/contact' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { name: 'Privacy Policy', href: '/privacy' },
        { name: 'Terms of Service', href: '/terms' },
        { name: 'Cookie Policy', href: '/cookies' },
        { name: 'Acceptable Use', href: '/acceptable-use' },
      ],
    },
  ];

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
        color: theme.palette.text.primary,
        pt: 6,
        pb: 4,
        mt: 'auto',
        borderTop: `1px solid ${theme.palette.divider}`,
      }}
    >
      {/* Display error if it exists */}
      {error && (
        <Container maxWidth="lg" sx={{ mb: 4 }}>
          <Alert 
            severity="error"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => clearError()}
              >
                Dismiss
              </Button>
            }
          >
            {error}
          </Alert>
        </Container>
      )}
      
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* Company Info and Contact Column */}
          <Grid item xs={12} sm={6} md={4} lg={3}>
            <Stack spacing={3}>
              {/* Logo and company name */}
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ position: 'relative', width: 40, height: 40, mr: 1 }}>
                  <img 
                    src="/logo.svg" 
                    alt="MediVault Logo" 
                    style={{ 
                      width: 40, 
                      height: 40, 
                      objectFit: 'contain' 
                    }} 
                  />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  MediVault
                </Typography>
              </Box>
              
              {/* Company description */}
              <Typography variant="body2" color="text.secondary">
                Secure, reliable, and intuitive medical image sharing platform for healthcare providers and patients. Our HIPAA-compliant solution enables seamless collaboration and improves patient care.
              </Typography>
              
              {/* Contact Information */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Contact Us
                </Typography>
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <EmailIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                    <MuiLink
                      href="mailto:support@medivault.com"
                      underline="hover"
                      color="text.secondary"
                    >
                      support@medivault.com
                    </MuiLink>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PhoneIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                    <MuiLink
                      href="tel:+1-800-123-4567"
                      underline="hover"
                      color="text.secondary"
                    >
                      +1-800-123-4567
                    </MuiLink>
                  </Box>
                </Stack>
              </Box>
            </Stack>
          </Grid>

          {/* Links Section - Using more horizontal space */}
          <Grid item xs={12} sm={6} md={8} lg={9}>
            <Grid container spacing={3}>
              {footerLinks.map((column) => (
                <Grid item xs={6} sm={6} md={3} key={column.title}>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 'bold', mb: 2 }}
                  >
                    {column.title}
                  </Typography>
                  <Stack spacing={1.5}>
                    {column.links.map((link, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center' }}>
                        {link.icon && (
                          <Box sx={{ mr: 1, color: 'primary.main', display: 'flex', alignItems: 'center' }}>
                            {link.icon}
                          </Box>
                        )}
                        <Link href={link.href as any} passHref legacyBehavior>
                          <MuiLink
                            underline="hover"
                            color="text.secondary"
                            sx={{ 
                              '&:hover': { 
                                color: 'primary.main',
                                fontWeight: 'medium'
                              }
                            }}
                          >
                            {link.name}
                          </MuiLink>
                        </Link>
                      </Box>
                    ))}
                  </Stack>
                </Grid>
              ))}
            </Grid>

            {/* Social Media */}
            <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                Follow Us
              </Typography>
              <Box sx={{ display: 'flex' }}>
                <IconButton
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener"
                  aria-label="Facebook"
                  size="small"
                  sx={{ 
                    color: '#3b5998', 
                    mr: 1.5,
                    '&:hover': { bgcolor: 'rgba(59, 89, 152, 0.1)' }
                  }}
                >
                  <FacebookIcon />
                </IconButton>
                <IconButton
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener"
                  aria-label="Twitter"
                  size="small"
                  sx={{ 
                    color: '#1da1f2', 
                    mr: 1.5,
                    '&:hover': { bgcolor: 'rgba(29, 161, 242, 0.1)' }
                  }}
                >
                  <TwitterIcon />
                </IconButton>
                <IconButton
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener"
                  aria-label="LinkedIn"
                  size="small"
                  sx={{ 
                    color: '#0077b5', 
                    mr: 1.5,
                    '&:hover': { bgcolor: 'rgba(0, 119, 181, 0.1)' }
                  }}
                >
                  <LinkedInIcon />
                </IconButton>
                <IconButton
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener"
                  aria-label="Instagram"
                  size="small"
                  sx={{ 
                    color: '#e1306c',
                    '&:hover': { bgcolor: 'rgba(225, 48, 108, 0.1)' }
                  }}
                >
                  <InstagramIcon />
                </IconButton>
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Bottom section with copyright and other info */}
        <Box sx={{ mt: 6, pt: 3, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                © {new Date().getFullYear()} MediVault. All rights reserved.
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Stack 
                direction={isMobile ? "column" : "row"} 
                spacing={isMobile ? 1 : 3}
                alignItems={isMobile ? "flex-start" : "center"}
                justifyContent={isMobile ? "flex-start" : "flex-end"}
              >
                <MuiLink 
                  href="/sitemap" 
                  underline="hover" 
                  color="text.secondary"
                  sx={{ fontSize: '0.875rem' }}
                >
                  Sitemap
                </MuiLink>
                <MuiLink 
                  href="/accessibility" 
                  underline="hover" 
                  color="text.secondary"
                  sx={{ fontSize: '0.875rem' }}
                >
                  Accessibility
                </MuiLink>
                <Typography variant="body2" color="text.secondary">
                  
                </Typography>
              </Stack>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </Box>
  );
}
