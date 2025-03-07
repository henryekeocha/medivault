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
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';

interface ShareDialogProps {
  imageId: string;
  onClose: () => void;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({ imageId, onClose }) => {
  const { user } = useAuth();
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

      // Validate the date before conversion
      let formattedExpiresAt = undefined;
      if (enableExpiration && expiresAt) {
        const expiresAtDate = new Date(expiresAt);
        if (!isNaN(expiresAtDate.getTime())) {
          formattedExpiresAt = expiresAtDate;
        } else {
          setError('Invalid expiration date');
          setLoading(false);
          return;
        }
      }

      const shareData = {
        imageId,
        type: shareType,
        permissions,
        expiresAt: formattedExpiresAt,
        recipientEmails: shareType === ShareType.EMAIL ? emailList : undefined,
      };

      const response = await apiClient.createShare(shareData);
      
      if (shareType === ShareType.LINK) {
        setShareUrl(`${window.location.origin}/share/${response.data.shareUrl}`);
      } else {
        setSuccess('Share invitations sent successfully!');
      }
    } catch (error) {
      console.error('Failed to create share:', error);
      setError('Failed to create share. Please try again.');
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