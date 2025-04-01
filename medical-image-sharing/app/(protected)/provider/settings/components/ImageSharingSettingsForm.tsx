import React from 'react';
import { Paper, Typography, Grid, FormControlLabel, Switch, TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

interface ImageSharingSettings {
  defaultLinkExpiry: number;
  requirePatientConsent: boolean;
  watermarkImages: boolean;
  allowDownloads: boolean;
  compressionQuality: 'low' | 'medium' | 'high';
}

interface ImageSharingSettingsFormProps {
  imageSharing: ImageSharingSettings;
  setImageSharing: (settings: ImageSharingSettings) => void;
}

export function ImageSharingSettingsForm({ imageSharing, setImageSharing }: ImageSharingSettingsFormProps) {
  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Image Sharing Settings
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Default Link Expiry (days)"
            type="number"
            value={imageSharing.defaultLinkExpiry}
            onChange={(e) => setImageSharing({ ...imageSharing, defaultLinkExpiry: parseInt(e.target.value) || 7 })}
            inputProps={{ min: 1, max: 30 }}
          />
        </Grid>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={imageSharing.requirePatientConsent}
                onChange={(e) => setImageSharing({ ...imageSharing, requirePatientConsent: e.target.checked })}
              />
            }
            label="Require Patient Consent"
          />
        </Grid>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={imageSharing.watermarkImages}
                onChange={(e) => setImageSharing({ ...imageSharing, watermarkImages: e.target.checked })}
              />
            }
            label="Watermark Images"
          />
        </Grid>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={imageSharing.allowDownloads}
                onChange={(e) => setImageSharing({ ...imageSharing, allowDownloads: e.target.checked })}
              />
            }
            label="Allow Downloads"
          />
        </Grid>
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel>Compression Quality</InputLabel>
            <Select
              value={imageSharing.compressionQuality}
              onChange={(e) => setImageSharing({ ...imageSharing, compressionQuality: e.target.value as 'low' | 'medium' | 'high' })}
              label="Compression Quality"
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    </Paper>
  );
} 