'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  IconButton,
  Alert,
  FormControlLabel,
  Switch, 
  InputAdornment,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Close as CloseIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { ShareType, SharePermission } from '@prisma/client';
import { providerClient } from '@/lib/api';

interface ShareDialogProps {
  imageId: string;
  onClose: () => void;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({ imageId, onClose }) => {
  const [shareType, setShareType] = useState<ShareType>(ShareType.LINK);
  const [permissions, setPermissions] = useState<SharePermission>(SharePermission.VIEW);
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailList, setEmailList] = useState<string[]>([]);
  const [enableExpiration, setEnableExpiration] = useState(false);

  const handleCreateShare = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      if (shareType === ShareType.EMAIL && emailList.length === 0) {
        setError('Please add at least one recipient email');
        setLoading(false);
        return;
      }

      // For email sharing, we need to share with each recipient
      if (shareType === ShareType.EMAIL) {
        const sharePromises = emailList.map(email => 
          providerClient.shareImage(imageId, email)
        );

        const results = await Promise.all(sharePromises);
        const hasErrors = results.some(result => result.status === 'error');
        
        if (hasErrors) {
          throw new Error('Failed to share with some recipients');
        }

        setSuccess('Share invitations sent successfully!');
      } else {
        // For link sharing, we create a single share
        const response = await providerClient.shareImage(imageId, 'public');

        if (response.status === 'success') {
          setSuccess('Share link created successfully');
          setShareUrl(`${window.location.origin}/share/${response.data?.link}`);
        } else {
          throw new Error(response.error?.message || 'Failed to create share');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create share');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmail = () => {
    if (recipientEmail && !emailList.includes(recipientEmail)) {
      setEmailList([...emailList, recipientEmail]);
      setRecipientEmail('');
    }
  };

  const handleRemoveEmail = (email: string) => {
    setEmailList(emailList.filter((e) => e !== email));
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setSuccess('Link copied to clipboard!');
    } catch (error) {
      setError('Failed to copy link. Please try again.');
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Share Image
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Share Type</InputLabel>
            <Select
              value={shareType}
              label="Share Type"
              onChange={(e) => setShareType(e.target.value as ShareType)}
            >
              <MenuItem value={ShareType.LINK}>Share via Link</MenuItem>
              <MenuItem value={ShareType.EMAIL}>Share via Email</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Permissions</InputLabel>
            <Select
              value={permissions}
              label="Permissions"
              onChange={(e) => setPermissions(e.target.value as SharePermission)}
            >
              <MenuItem value={SharePermission.VIEW}>View Only</MenuItem>
              <MenuItem value={SharePermission.EDIT}>Can Edit</MenuItem>
              <MenuItem value={SharePermission.FULL}>Full Access</MenuItem>
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={enableExpiration}
                onChange={(e) => setEnableExpiration(e.target.checked)}
              />
            }
            label="Set Expiration"
          />

          {enableExpiration && (
            <TextField
              fullWidth
              label="Expires At"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ mt: 2 }}
            />
          )}

          {shareType === ShareType.EMAIL && (
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Recipient Email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddEmail();
                  }
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleAddEmail} edge="end">
                        <AddIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {emailList.map((email) => (
                  <Chip
                    key={email}
                    label={email}
                    onDelete={() => handleRemoveEmail(email)}
                  />
                ))}
              </Box>
            </Box>
          )}

          {shareType === ShareType.LINK && shareUrl && (
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Share Link"
                value={shareUrl}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleCopyLink} edge="end">
                        <CopyIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleCreateShare}
          disabled={loading || (shareType === ShareType.EMAIL && emailList.length === 0)}
        >
          {loading ? 'Creating...' : 'Create Share'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 