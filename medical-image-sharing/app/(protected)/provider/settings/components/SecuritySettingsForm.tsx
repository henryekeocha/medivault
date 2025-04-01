import React, { useState, useEffect } from 'react';
import { 
  Paper, 
  Typography, 
  Grid, 
  FormControlLabel, 
  Switch, 
  TextField, 
  List, 
  ListItem, 
  ListItemText, 
  IconButton,
  Button,
  Box,
  Divider,
  Alert
} from '@mui/material';
import { Delete as DeleteIcon, Shield as ShieldIcon } from '@mui/icons-material';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { ClerkAuthService } from '@/lib/clerk/auth-service';

interface SecuritySettings {
  twoFactorAuth: boolean;
  requirePatientVerification: boolean;
  ipWhitelist: string[];
  autoLogoutMinutes: number;
}

interface SecuritySettingsFormProps {
  security: SecuritySettings;
  setSecurity: (settings: SecuritySettings) => void;
}

export function SecuritySettingsForm({ security, setSecurity }: SecuritySettingsFormProps) {
  const [newIp, setNewIp] = React.useState('');
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [hasMfa, setHasMfa] = useState(false);
  
  useEffect(() => {
    // Check if user has MFA enabled
    if (isLoaded && user) {
      const checkMfa = async () => {
        try {
          const mfaStatus = await ClerkAuthService.getMFAStatus();
          setHasMfa(mfaStatus.success && mfaStatus.enabled);
        } catch (error) {
          console.error('Error checking MFA status:', error);
        }
      };
      
      checkMfa();
    }
  }, [isLoaded, user]);

  const handleAddIp = () => {
    if (newIp && !security.ipWhitelist.includes(newIp)) {
      setSecurity({
        ...security,
        ipWhitelist: [...security.ipWhitelist, newIp]
      });
      setNewIp('');
    }
  };

  const handleRemoveIp = (ip: string) => {
    setSecurity({
      ...security,
      ipWhitelist: security.ipWhitelist.filter(i => i !== ip)
    });
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Security Settings
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <ShieldIcon sx={{ mr: 1 }} color="action" />
            <Typography variant="subtitle1">
              Two-Factor Authentication
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" paragraph>
            Add an extra layer of security to your account by requiring a verification code in addition to your password.
          </Typography>
          <Box sx={{ mt: 2 }}>
            {hasMfa ? (
              <Alert severity="success" sx={{ mb: 2 }}>
                Your account is protected with multi-factor authentication.
              </Alert>
            ) : (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Your account is not protected with multi-factor authentication.
              </Alert>
            )}
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => router.push('/profile/mfa')}
            >
              {hasMfa ? 'Manage MFA Settings' : 'Enable Two-Factor Authentication'}
            </Button>
          </Box>
          <Divider sx={{ my: 3 }} />
        </Grid>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={security.requirePatientVerification}
                onChange={(e) => setSecurity({ ...security, requirePatientVerification: e.target.checked })}
              />
            }
            label="Require Patient Verification"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Auto Logout (minutes)"
            type="number"
            value={security.autoLogoutMinutes}
            onChange={(e) => setSecurity({ ...security, autoLogoutMinutes: parseInt(e.target.value) || 30 })}
            inputProps={{ min: 5, max: 120 }}
          />
        </Grid>
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom>
            IP Whitelist
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs>
              <TextField
                fullWidth
                label="Add IP Address"
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
                placeholder="e.g., 192.168.1.1"
              />
            </Grid>
            <Grid item>
              <IconButton onClick={handleAddIp} color="primary">
                Add
              </IconButton>
            </Grid>
          </Grid>
          <List>
            {security.ipWhitelist.map((ip) => (
              <ListItem
                key={ip}
                secondaryAction={
                  <IconButton edge="end" onClick={() => handleRemoveIp(ip)}>
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemText primary={ip} />
              </ListItem>
            ))}
          </List>
        </Grid>
      </Grid>
    </Paper>
  );
} 