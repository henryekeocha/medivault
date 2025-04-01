import React from 'react';
import { Paper, Typography, Grid, FormControlLabel, Switch } from '@mui/material';

interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  appointmentReminders: boolean;
  imageUploadAlerts: boolean;
  systemUpdates: boolean;
  newPatientAlerts: boolean;
}

interface NotificationSettingsFormProps {
  notifications: NotificationSettings;
  setNotifications: (settings: NotificationSettings) => void;
}

export function NotificationSettingsForm({ notifications, setNotifications }: NotificationSettingsFormProps) {
  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Notification Settings
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={notifications.emailNotifications}
                onChange={(e) => setNotifications({ ...notifications, emailNotifications: e.target.checked })}
              />
            }
            label="Email Notifications"
          />
        </Grid>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={notifications.smsNotifications}
                onChange={(e) => setNotifications({ ...notifications, smsNotifications: e.target.checked })}
              />
            }
            label="SMS Notifications"
          />
        </Grid>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={notifications.appointmentReminders}
                onChange={(e) => setNotifications({ ...notifications, appointmentReminders: e.target.checked })}
              />
            }
            label="Appointment Reminders"
          />
        </Grid>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={notifications.imageUploadAlerts}
                onChange={(e) => setNotifications({ ...notifications, imageUploadAlerts: e.target.checked })}
              />
            }
            label="Image Upload Alerts"
          />
        </Grid>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={notifications.systemUpdates}
                onChange={(e) => setNotifications({ ...notifications, systemUpdates: e.target.checked })}
              />
            }
            label="System Updates"
          />
        </Grid>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={notifications.newPatientAlerts}
                onChange={(e) => setNotifications({ ...notifications, newPatientAlerts: e.target.checked })}
              />
            }
            label="New Patient Alerts"
          />
        </Grid>
      </Grid>
    </Paper>
  );
} 