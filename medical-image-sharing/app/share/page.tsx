'use client';

import React, { useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  Box,
  Snackbar,
  Alert,
  List,
  ListItem, 
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
} from '@mui/material';
import { ContentCopy as CopyIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { withProtectedRoute } from '@/components/ProtectedRoute';

function SharePage() {
  const { data: session } = useSession();
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [expiryDays, setExpiryDays] = useState<number>(7);
  const [generatedLinks, setGeneratedLinks] = useState<Array<{ id: string; url: string; expiry: Date }>>([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const generateShareLink = async () => {
    try {
      // TODO: Implement actual link generation with backend
      const newLink = {
        id: Math.random().toString(36).substr(2, 9),
        url: `https://your-domain.com/shared/${Math.random().toString(36).substr(2, 9)}`,
        expiry: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000),
      };
      setGeneratedLinks([...generatedLinks, newLink]);
      setSnackbar({ open: true, message: 'Share link generated successfully!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to generate share link', severity: 'error' });
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    setSnackbar({ open: true, message: 'Link copied to clipboard!', severity: 'success' });
  };

  const deleteLink = (id: string) => {
    setGeneratedLinks(generatedLinks.filter(link => link.id !== id));
    setSnackbar({ open: true, message: 'Share link deleted', severity: 'success' });
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Share Medical Images
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Generate New Share Link
        </Typography>
        
        <Box component="form" sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Select Image"
            variant="outlined"
            value={selectedImage}
            onChange={(e) => setSelectedImage(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <TextField
            type="number"
            label="Link Expiry (Days)"
            variant="outlined"
            value={expiryDays}
            onChange={(e) => setExpiryDays(Number(e.target.value))}
            sx={{ mb: 2 }}
          />
          
          <Button
            variant="contained"
            onClick={generateShareLink}
            disabled={!selectedImage}
          >
            Generate Share Link
          </Button>
        </Box>
      </Paper>

      {generatedLinks.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Active Share Links
          </Typography>
          
          <List>
            {generatedLinks.map((link) => (
              <ListItem
                key={link.id}
                secondaryAction={
                  <Box>
                    <IconButton onClick={() => copyToClipboard(link.url)}>
                      <CopyIcon />
                    </IconButton>
                    <IconButton onClick={() => deleteLink(link.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                }
              >
                <ListItemText
                  primary={link.url}
                  secondary={`Expires: ${link.expiry.toLocaleDateString()}`}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default withProtectedRoute(SharePage, {
  allowedRoles: ['PROVIDER', 'PATIENT'],
  requireAuth: true,
}); 