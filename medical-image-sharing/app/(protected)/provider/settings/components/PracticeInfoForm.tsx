import React from 'react';
import { Paper, Typography, Grid, TextField } from '@mui/material';

interface PracticeInfo {
  practiceName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  licenseNumber: string;
}

interface PracticeInfoFormProps {
  practiceInfo: PracticeInfo;
  setPracticeInfo: (info: PracticeInfo) => void;
}

export function PracticeInfoForm({ practiceInfo, setPracticeInfo }: PracticeInfoFormProps) {
  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Practice Information
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Practice Name"
            value={practiceInfo.practiceName}
            onChange={(e) => setPracticeInfo({ ...practiceInfo, practiceName: e.target.value })}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Address"
            value={practiceInfo.address}
            onChange={(e) => setPracticeInfo({ ...practiceInfo, address: e.target.value })}
            multiline
            rows={2}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Phone"
            value={practiceInfo.phone}
            onChange={(e) => setPracticeInfo({ ...practiceInfo, phone: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Email"
            value={practiceInfo.email}
            onChange={(e) => setPracticeInfo({ ...practiceInfo, email: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Website"
            value={practiceInfo.website}
            onChange={(e) => setPracticeInfo({ ...practiceInfo, website: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="License Number"
            value={practiceInfo.licenseNumber}
            onChange={(e) => setPracticeInfo({ ...practiceInfo, licenseNumber: e.target.value })}
          />
        </Grid>
      </Grid>
    </Paper>
  );
} 