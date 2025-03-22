'use client';

import React from 'react';
import { Container, Typography, Paper, Box } from '@mui/material';
import { ImageUpload } from '@/components/images/ImageUpload';

export default function UploadPage() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Upload Medical Image
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Upload medical images securely with relevant metadata. Supported formats
          include JPEG, PNG, and PDF.
        </Typography>

        <Paper sx={{ p: 3, mt: 3 }}>
          <ImageUpload />
        </Paper>
      </Box>
    </Container>
  );
} 