import React from 'react';
import { Paper, Typography, Grid, FormControlLabel, Switch, TextField, Box } from '@mui/material';

interface WorkingHours {
  [key: string]: {
    start: string;
    end: string;
    available: boolean;
  };
}

interface AvailabilitySettings {
  workingHours: WorkingHours;
  appointmentDuration: number;
  bufferTime: number;
}

interface AvailabilitySettingsFormProps {
  availability: AvailabilitySettings;
  setAvailability: (settings: AvailabilitySettings) => void;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export function AvailabilitySettingsForm({ availability, setAvailability }: AvailabilitySettingsFormProps) {
  const handleDayToggle = (day: string) => {
    setAvailability({
      ...availability,
      workingHours: {
        ...availability.workingHours,
        [day]: {
          ...availability.workingHours[day],
          available: !availability.workingHours[day].available
        }
      }
    });
  };

  const handleTimeChange = (day: string, field: 'start' | 'end', value: string) => {
    setAvailability({
      ...availability,
      workingHours: {
        ...availability.workingHours,
        [day]: {
          ...availability.workingHours[day],
          [field]: value
        }
      }
    });
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Availability Settings
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Appointment Duration (minutes)"
            type="number"
            value={availability.appointmentDuration}
            onChange={(e) => setAvailability({ ...availability, appointmentDuration: parseInt(e.target.value) || 30 })}
            inputProps={{ min: 15, max: 120, step: 15 }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Buffer Time (minutes)"
            type="number"
            value={availability.bufferTime}
            onChange={(e) => setAvailability({ ...availability, bufferTime: parseInt(e.target.value) || 15 })}
            inputProps={{ min: 0, max: 30, step: 5 }}
          />
        </Grid>
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom>
            Working Hours
          </Typography>
          {DAYS.map((day) => (
            <Box key={day} sx={{ mb: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={3}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={availability.workingHours[day].available}
                        onChange={() => handleDayToggle(day)}
                      />
                    }
                    label={day.charAt(0).toUpperCase() + day.slice(1)}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Start Time"
                    type="time"
                    value={availability.workingHours[day].start}
                    onChange={(e) => handleTimeChange(day, 'start', e.target.value)}
                    disabled={!availability.workingHours[day].available}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="End Time"
                    type="time"
                    value={availability.workingHours[day].end}
                    onChange={(e) => handleTimeChange(day, 'end', e.target.value)}
                    disabled={!availability.workingHours[day].available}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
            </Box>
          ))}
        </Grid>
      </Grid>
    </Paper>
  );
} 