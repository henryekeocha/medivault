'use client';

import React from 'react';
import { Box, Typography, Container, Paper, Breadcrumbs, Link } from '@mui/material';
import CreateTestUsers from '@/components/admin/CreateTestUsers';

const TestUsersPage = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ pt: 3, pb: 8 }}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link color="inherit" href="/admin">
            Admin
          </Link>
          <Typography color="text.primary">Test Users</Typography>
        </Breadcrumbs>

        <Typography variant="h4" component="h1" gutterBottom>
          Test Users Management
        </Typography>
        
        <Typography variant="body1" paragraph>
          Create test accounts for different user roles (Patient, Provider, Admin) to test your application features.
        </Typography>
        
        <Paper sx={{ p: 3, mt: 3 }}>
          <CreateTestUsers />
        </Paper>
      </Box>
    </Container>
  );
};

export default TestUsersPage; 