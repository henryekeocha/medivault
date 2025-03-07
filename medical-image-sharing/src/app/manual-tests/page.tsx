'use client';

import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Divider, Button, List, ListItem, ListItemIcon, ListItemText, Chip } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';

export default function ManualTestsPage() {
  const [markdownContent, setMarkdownContent] = useState('');
  
  // Fetch the manual test instructions
  useEffect(() => {
    fetch('/tests/manual-auth-tests.md')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load test instructions');
        }
        return response.text();
      })
      .then(text => {
        setMarkdownContent(text);
      })
      .catch(error => {
        console.error('Error loading markdown:', error);
        setMarkdownContent('# Error Loading Test Instructions\n\nPlease try again later.');
      });
  }, []);

  return (
    <Box sx={{ p: 4, maxWidth: 1000, mx: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Manual Testing Instructions
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
        <Button 
          component={Link}
          href="/auth-test"
          variant="contained"
        >
          Go to Auth Test Page
        </Button>
        
        <Button 
          component={Link}
          href="/login"
          variant="outlined"
        >
          Login Page
        </Button>
        
        <Button 
          component={Link}
          href="/register"
          variant="outlined"
        >
          Register Page
        </Button>
      </Box>
      
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Test Overview
        </Typography>
        
        <Typography paragraph>
          This page contains instructions for manually testing the authentication flow and user management features.
          Follow the step-by-step guide to verify that all functionality works as expected.
        </Typography>
        
        <List>
          <ListItem>
            <ListItemIcon>
              <AssignmentIcon color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="Authentication Flow Tests" 
              secondary="Login, Registration, Logout, and Token Management" 
            />
            <Chip label="Critical" color="primary" size="small" />
          </ListItem>
          
          <ListItem>
            <ListItemIcon>
              <AssignmentIcon color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="User Management Tests" 
              secondary="User creation, editing, and role management" 
            />
            <Chip label="High Priority" color="secondary" size="small" />
          </ListItem>
          
          <ListItem>
            <ListItemIcon>
              <AssignmentIcon color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="Role-Based Access Control" 
              secondary="Verifying proper access restrictions" 
            />
            <Chip label="Security" color="error" size="small" />
          </ListItem>
        </List>
      </Paper>
      
      <Paper elevation={3} sx={{ p: { xs: 2, md: 4 } }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Test Instructions
          </Typography>
          <Divider sx={{ mb: 3 }} />
        </Box>
        
        <Box sx={{ 
          '& h1': { fontSize: '1.8rem', mt: 4, mb: 2 },
          '& h2': { fontSize: '1.5rem', mt: 3, mb: 2 },
          '& h3': { fontSize: '1.2rem', mt: 2, mb: 1 },
          '& p': { mb: 2 },
          '& ul, & ol': { pl: 4 },
          '& li': { mb: 1 },
          '& code': { 
            bgcolor: 'grey.100', 
            px: 1, 
            py: 0.5, 
            borderRadius: 1,
            fontFamily: 'monospace'
          },
          '& blockquote': {
            borderLeft: '4px solid',
            borderColor: 'primary.main',
            pl: 2,
            py: 1,
            bgcolor: 'grey.50',
            my: 2
          }
        }}>
          <ReactMarkdown>
            {markdownContent}
          </ReactMarkdown>
        </Box>
      </Paper>
    </Box>
  );
} 