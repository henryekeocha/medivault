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
  Alert,
  IconButton,
  InputAdornment,
  Divider, 
  FormControlLabel,
  Switch,
  Chip,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  Security as SecurityIcon,
  Mail as MailIcon,
} from '@mui/icons-material';
import { Image, Share } from '@/lib/api/types';
import { SharePermission } from '@prisma/client';
import { sharedClient } from '@/lib/api';

interface SecureShareModalProps {
  open: boolean;
  onClose: () => void;
  image: Image;
}

interface ShareOptions {
  expiryHours: number;
  requireAuth: boolean;
  sendEmail: boolean;
  accessCount: number;
  recipientEmail: string;
  accessReason: string;
  notifyOnAccess: boolean;
}

type ExpiryOption = {
  value: number;
  label: string;
  hipaaCompliant: boolean;
};

const EXPIRY_OPTIONS: ExpiryOption[] = [
  { value: 1, label: '1 hour', hipaaCompliant: true },
  { value: 24, label: '24 hours', hipaaCompliant: true },
  { value: 72, label: '3 days', hipaaCompliant: true },
  { value: 168, label: '7 days', hipaaCompliant: true },
  { value: 720, label: '30 days', hipaaCompliant: false },
];

const DEFAULT_SHARE_OPTIONS: ShareOptions = {
  expiryHours: 24,
  requireAuth: true,
  sendEmail: false,
  accessCount: 1,
  recipientEmail: '',
  accessReason: '',
  notifyOnAccess: true,
};

export const SecureShareModal: React.FC<SecureShareModalProps> = ({
  open,
  onClose,
  image,
}) => {
  const [shareOptions, setShareOptions] = useState<ShareOptions>(DEFAULT_SHARE_OPTIONS);
  const [shareLink, setShareLink] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Parse metadata from string
  const metadata = image.metadata ? JSON.parse(image.metadata) : null;

  const handleGenerateLink = async () => {
    if (shareOptions.sendEmail && !shareOptions.recipientEmail) {
      setError('Recipient email is required when email sharing is enabled');
      return;
    }

    if (!shareOptions.accessReason.trim()) {
      setError('Please provide a reason for sharing the image');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await sharedClient.createShare({
        imageId: image.id,
        type: 'LINK',
        permissions: SharePermission.VIEW,
        expiresAt: new Date(Date.now() + shareOptions.expiryHours * 60 * 60 * 1000),
        recipientEmail: shareOptions.sendEmail ? shareOptions.recipientEmail : undefined,
        accessCount: shareOptions.accessCount,
        token: JSON.stringify({
          reason: shareOptions.accessReason,
          notifyOnAccess: shareOptions.notifyOnAccess
        })
      });
      if (response.data.shareUrl) {
        setShareLink(response.data.shareUrl);
      } else {
        throw new Error('Failed to generate share URL');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error generating share link');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy link to clipboard');
    }
  };

  const handleClose = () => {
    setShareLink('');
    setError('');
    setCopied(false);
    setShareOptions(DEFAULT_SHARE_OPTIONS);
    onClose();
  };

  const handleOptionChange = (field: keyof ShareOptions, value: any) => {
    setShareOptions((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <SecurityIcon color="primary" />
          <Typography>Secure HIPAA-Compliant Share</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Image Details
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Filename: {image.filename}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Patient ID: {metadata?.patientId || 'Unknown'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Type: {metadata?.scanType || 'Unknown'}
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        <FormControl fullWidth sx={{ mb: 2 }}>
          <TextField
            required
            label="Reason for Sharing"
            value={shareOptions.accessReason}
            onChange={(e) => handleOptionChange('accessReason', e.target.value)}
            multiline
            rows={2}
            placeholder="Please provide the clinical or administrative reason for sharing this image"
          />
        </FormControl>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Link Expiry</InputLabel>
          <Select
            value={shareOptions.expiryHours}
            label="Link Expiry"
            onChange={(e) => handleOptionChange('expiryHours', e.target.value)}
          >
            {EXPIRY_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
                {!option.hipaaCompliant && (
                  <Chip
                    size="small"
                    label="Not HIPAA Compliant"
                    color="warning"
                    sx={{ ml: 1 }}
                  />
                )}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={shareOptions.requireAuth}
                onChange={(e) => handleOptionChange('requireAuth', e.target.checked)}
              />
            }
            label="Require Authentication"
          />
          <Typography variant="caption" color="text.secondary" display="block">
            Recipients must verify their identity before accessing the image
          </Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={shareOptions.sendEmail}
                onChange={(e) => handleOptionChange('sendEmail', e.target.checked)}
              />
            }
            label="Send via Email"
          />
        </Box>

        {shareOptions.sendEmail && (
          <FormControl fullWidth sx={{ mb: 2 }}>
            <TextField
              required
              label="Recipient Email"
              type="email"
              value={shareOptions.recipientEmail}
              onChange={(e) => handleOptionChange('recipientEmail', e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MailIcon />
                  </InputAdornment>
                ),
              }}
            />
          </FormControl>
        )}

        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={shareOptions.notifyOnAccess}
                onChange={(e) => handleOptionChange('notifyOnAccess', e.target.checked)}
              />
            }
            label="Notify on Access"
          />
          <Typography variant="caption" color="text.secondary" display="block">
            Receive notifications when the image is accessed
          </Typography>
        </Box>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <TextField
            label="Maximum Access Count"
            type="number"
            value={shareOptions.accessCount}
            onChange={(e) => handleOptionChange('accessCount', parseInt(e.target.value))}
            inputProps={{ min: 1, max: 10 }}
            helperText="Limit the number of times this link can be accessed"
          />
        </FormControl>

        {shareLink && (
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Secure Share Link"
              value={shareLink}
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={handleCopyLink}
                      edge="end"
                      color={copied ? 'success' : 'default'}
                    >
                      {copied ? <CheckIcon /> : <CopyIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: 'block' }}>
              This link will expire in {shareOptions.expiryHours} hours and can be accessed {shareOptions.accessCount} time(s)
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleGenerateLink}
          variant="contained"
          disabled={loading}
          startIcon={<SecurityIcon />}
        >
          {loading ? 'Generating...' : 'Generate Secure Link'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
