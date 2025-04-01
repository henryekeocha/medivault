'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Card,
  CardContent,
  CardActions,
  Divider,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, addDays, isAfter, isSameDay, parse, setHours, setMinutes } from 'date-fns';
import { providerClient } from '@/lib/api/providerClient';
import { useUser } from '@clerk/nextjs';
import { useToast } from '@/contexts/ToastContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';

// Interface for availability timeblock
interface TimeBlock {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  date?: string | null;
}

// Interface for blocked date/time
interface BlockedTime {
  id: string;
  reason: string;
  startDate: string;
  endDate: string;
}

// Default working hours (used as a fallback if API fails)
const defaultWorkingHours = [
  { day: 'Monday', startTime: '09:00', endTime: '17:00', isActive: true },
  { day: 'Tuesday', startTime: '09:00', endTime: '17:00', isActive: true },
  { day: 'Wednesday', startTime: '09:00', endTime: '17:00', isActive: true },
  { day: 'Thursday', startTime: '09:00', endTime: '17:00', isActive: true },
  { day: 'Friday', startTime: '09:00', endTime: '17:00', isActive: true },
  { day: 'Saturday', startTime: '10:00', endTime: '14:00', isActive: false },
  { day: 'Sunday', startTime: '00:00', endTime: '00:00', isActive: false },
];

export default function ProviderAvailabilityPage() {
  const { user, isLoaded } = useUser();
  const { showSuccess, showError } = useToast();
  const [tab, setTab] = useState(0);
  
  // Working hours state
  const [regularHours, setRegularHours] = useState(defaultWorkingHours);
  
  // Custom availability blocks
  const [availabilityBlocks, setAvailabilityBlocks] = useState<TimeBlock[]>([]);
  
  // Blocked time periods
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  
  // New block form state
  const [newBlock, setNewBlock] = useState<TimeBlock>({
    id: '',
    day: 'Monday',
    startTime: '09:00',
    endTime: '17:00',
    isRecurring: true,
    date: null,
  });
  
  // New blocked time state
  const [newBlockedTime, setNewBlockedTime] = useState<BlockedTime>({
    id: '',
    reason: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
  });
  
  // UI state
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openBlockDialog, setOpenBlockDialog] = useState(false);
  const [openBlockedTimeDialog, setOpenBlockedTimeDialog] = useState(false);
  const { handleError, withErrorHandling } = useErrorHandler({
    context: 'Provider Availability',
    showToastByDefault: true
  });
  
  // Load data on component mount
  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      return;
    }

    // Check if user has provider role in metadata
    const userRole = user.publicMetadata.role;
    if (userRole !== 'PROVIDER') {
      return;
    }
    
    fetchAvailabilityData();
  }, [isLoaded, user]);
  
  // Fetch all availability data from the API
  const fetchAvailabilityData = async () => {
    setInitialLoading(true);
    setError(null);
    
    try {
      // Fetch regular hours
      const hoursResponse = await providerClient.getWorkingHours();
      if (hoursResponse.status === 'success' && hoursResponse.data) {
        setRegularHours(hoursResponse.data);
      } else {
        setRegularHours(defaultWorkingHours);
      }
      
      // Fetch custom availability blocks
      const blocksResponse = await providerClient.getAvailabilityBlocks();
      if (blocksResponse.status === 'success' && blocksResponse.data) {
        setAvailabilityBlocks(blocksResponse.data);
      } else {
        setAvailabilityBlocks([]);
      }
      
      // Fetch blocked time periods
      const blockedResponse = await providerClient.getBlockedTimes();
      if (blockedResponse.status === 'success' && blockedResponse.data) {
        setBlockedTimes(blockedResponse.data);
      } else {
        setBlockedTimes([]);
      }
    } catch (err) {
      handleError(err);
    } finally {
      setInitialLoading(false);
    }
  };
  
  // Save working hours to API
  const handleSaveWorkingHours = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await providerClient.saveWorkingHours(regularHours);
      
      if (response.status === 'success') {
        setSuccess(true);
        showSuccess('Working hours saved successfully');
        fetchAvailabilityData();
      } else {
        throw new Error(response.error?.message || 'Failed to save working hours');
      }
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle working hours change
  const handleWorkingHourChange = (index: number, field: string, value: any) => {
    const updatedHours = [...regularHours];
    updatedHours[index] = {
      ...updatedHours[index],
      [field]: value,
    };
    setRegularHours(updatedHours);
  };
  
  // Add new custom availability block
  const handleAddBlock = async () => {
    if (!isValidTimeBlock()) return;

    try {
      setLoading(true);
      
      const timeBlockId = `block-${Date.now()}`;
      const newTimeBlock = {
        ...newBlock,
        id: timeBlockId,
      };
      
      const response = await providerClient.addAvailabilityBlock(newTimeBlock);
      
      if (response.status === 'success') {
        const data = response.data;
        
        // Use the ID from the API response if available
        const blockWithServerId = data && data.id ? { ...newTimeBlock, id: data.id } : newTimeBlock;
        
        setAvailabilityBlocks([
          ...availabilityBlocks,
          blockWithServerId,
        ]);
        
        // Reset form
        setNewBlock({
          id: '',
          day: 'Monday',
          startTime: '09:00',
          endTime: '17:00',
          isRecurring: true,
          date: null,
        });
        
        showSuccess('Availability block added successfully');
      } else {
        throw new Error(response.error?.message || 'Failed to add availability block');
      }
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Remove custom availability block
  const handleRemoveBlock = async (id: string) => {
    try {
      setLoading(true);
      
      const response = await providerClient.removeAvailabilityBlock(id);
      
      if (response.status === 'success') {
        setAvailabilityBlocks(availabilityBlocks.filter(block => block.id !== id));
        showSuccess('Availability block removed successfully');
      } else {
        throw new Error(response.error?.message || 'Failed to remove availability block');
      }
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Add new blocked time
  const handleAddBlockedTime = async () => {
    if (!isValidBlockedTime()) return;

    try {
      setLoading(true);
      
      const blockedTimeId = `blocked-${Date.now()}`;
      const newBlockedPeriod = {
        ...newBlockedTime,
        id: blockedTimeId,
      };
      
      const response = await providerClient.addBlockedTime(newBlockedPeriod);
      
      if (response.status === 'success') {
        const data = response.data;
        
        // Use the ID from the API response if available
        const blockedTimeWithServerId = data && data.id ? { ...newBlockedPeriod, id: data.id } : newBlockedPeriod;
        
        setBlockedTimes([
          ...blockedTimes,
          blockedTimeWithServerId,
        ]);
        
        // Reset form
        setNewBlockedTime({
          id: '',
          reason: '',
          startDate: format(new Date(), 'yyyy-MM-dd'),
          endDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
        });
        
        showSuccess('Blocked time period added successfully');
      } else {
        throw new Error(response.error?.message || 'Failed to add blocked time period');
      }
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Remove blocked time
  const handleRemoveBlockedTime = async (id: string) => {
    try {
      setLoading(true);
      
      const response = await providerClient.removeBlockedTime(id);
      
      if (response.status === 'success') {
        setBlockedTimes(blockedTimes.filter(time => time.id !== id));
        showSuccess('Blocked time period removed successfully');
      } else {
        throw new Error(response.error?.message || 'Failed to remove blocked time period');
      }
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Validate time block
  const isValidTimeBlock = () => {
    const start = newBlock.startTime;
    const end = newBlock.endTime;
    
    // Convert to Date objects for comparison
    const startDate = parse(start, 'HH:mm', new Date());
    const endDate = parse(end, 'HH:mm', new Date());
    
    return isAfter(endDate, startDate);
  };
  
  // Validate blocked time
  const isValidBlockedTime = () => {
    const start = new Date(newBlockedTime.startDate);
    const end = new Date(newBlockedTime.endDate);
    
    return (
      newBlockedTime.reason.trim() !== '' && 
      (isAfter(end, start) || isSameDay(start, end))
    );
  };
  
  // Save all availability settings
  const saveAllSettings = async () => {
    try {
      await withErrorHandling(async () => {
        await handleSaveWorkingHours();
      });
    } catch (err) {
      console.error('Error saving settings:', err);
    }
  };
  
  // Copy one day's schedule to all weekdays
  const copyToWeekdays = (index: number) => {
    const sourceDay = regularHours[index];
    const updatedHours = regularHours.map((day, i) => {
      if (i !== index && ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(day.day)) {
        return {
          ...day,
          startTime: sourceDay.startTime,
          endTime: sourceDay.endTime,
          isActive: sourceDay.isActive,
        };
      }
      return day;
    });
    
    setRegularHours(updatedHours);
    showSuccess('Schedule copied to all weekdays');
  };

  // Show loading state while initially fetching data
  if (initialLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Box textAlign="center">
          <CircularProgress sx={{ mb: 2 }} />
          <Typography>Loading availability settings...</Typography>
        </Box>
      </Container>
    );
  }
  
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Snackbar
          open={success}
          autoHideDuration={3000}
          onClose={() => setSuccess(false)}
          message="Availability settings saved successfully"
        />
        
        <Typography variant="h4" gutterBottom>
          Manage Availability
        </Typography>
        
        <Typography variant="body1" paragraph color="text.secondary">
          Set your regular working hours and manage special availability time slots for appointments.
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ mb: 3 }}>
          <Tabs 
            value={tab} 
            onChange={(_, newValue) => setTab(newValue)}
            aria-label="availability management tabs"
          >
            <Tab label="Regular Hours" />
            <Tab label="Custom Availability" />
            <Tab label="Time Off & Blocked Periods" />
          </Tabs>
        </Box>
        
        {tab === 0 && (
          <Paper sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6">
                Regular Office Hours
              </Typography>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveWorkingHours}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Hours'}
              </Button>
            </Box>
            
            <Grid container spacing={3}>
              {regularHours.map((day, index) => (
                <Grid item xs={12} key={day.day}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Box display="flex" alignItems="center" gap={2}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={day.isActive}
                                onChange={(e) => handleWorkingHourChange(index, 'isActive', e.target.checked)}
                                name={`${day.day}-active`}
                              />
                            }
                            label={day.day}
                          />
                          {day.isActive ? (
                            <Chip size="small" label="Available" color="success" />
                          ) : (
                            <Chip size="small" label="Unavailable" color="default" />
                          )}
                        </Box>
                        
                        <IconButton 
                          size="small" 
                          onClick={() => copyToWeekdays(index)}
                          disabled={!['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(day.day) || loading}
                        >
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      
                      <Box mt={2} display="flex" gap={2}>
                        <TextField
                          label="Start Time"
                          type="time"
                          value={day.startTime}
                          onChange={(e) => handleWorkingHourChange(index, 'startTime', e.target.value)}
                          disabled={!day.isActive || loading}
                          InputLabelProps={{
                            shrink: true,
                          }}
                          sx={{ flexGrow: 1 }}
                        />
                        <TextField
                          label="End Time"
                          type="time"
                          value={day.endTime}
                          onChange={(e) => handleWorkingHourChange(index, 'endTime', e.target.value)}
                          disabled={!day.isActive || loading}
                          InputLabelProps={{
                            shrink: true,
                          }}
                          sx={{ flexGrow: 1 }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}
        
        {tab === 1 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Custom Availability
            </Typography>
            <Typography variant="body2" paragraph color="text.secondary">
              Add specific time slots when you're available outside your regular hours, or create one-time availability.
            </Typography>
            
            <Box mb={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Add New Availability
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={newBlock.isRecurring}
                            onChange={(e) => setNewBlock({
                              ...newBlock,
                              isRecurring: e.target.checked,
                              date: e.target.checked ? null : format(new Date(), 'yyyy-MM-dd'),
                            })}
                            disabled={loading}
                          />
                        }
                        label="Recurring weekly"
                      />
                      
                      {newBlock.isRecurring ? (
                        <FormControl fullWidth sx={{ mt: 2 }}>
                          <InputLabel>Day of Week</InputLabel>
                          <Select
                            value={newBlock.day}
                            label="Day of Week"
                            onChange={(e) => setNewBlock({
                              ...newBlock,
                              day: e.target.value as string,
                            })}
                            disabled={loading}
                          >
                            {regularHours.map((day) => (
                              <MenuItem key={day.day} value={day.day}>
                                {day.day}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      ) : (
                        <TextField
                          fullWidth
                          label="Date"
                          type="date"
                          value={newBlock.date || ''}
                          onChange={(e) => setNewBlock({
                            ...newBlock,
                            date: e.target.value,
                          })}
                          InputLabelProps={{
                            shrink: true,
                          }}
                          sx={{ mt: 2 }}
                          disabled={loading}
                        />
                      )}
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Box display="flex" gap={2}>
                        <TextField
                          label="Start Time"
                          type="time"
                          value={newBlock.startTime}
                          onChange={(e) => setNewBlock({
                            ...newBlock,
                            startTime: e.target.value,
                          })}
                          InputLabelProps={{
                            shrink: true,
                          }}
                          fullWidth
                          disabled={loading}
                        />
                        <TextField
                          label="End Time"
                          type="time"
                          value={newBlock.endTime}
                          onChange={(e) => setNewBlock({
                            ...newBlock,
                            endTime: e.target.value,
                          })}
                          InputLabelProps={{
                            shrink: true,
                          }}
                          fullWidth
                          disabled={loading}
                        />
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Box display="flex" justifyContent="flex-end">
                        <Button
                          variant="contained"
                          startIcon={<AddIcon />}
                          onClick={handleAddBlock}
                          disabled={!isValidTimeBlock() || loading}
                        >
                          {loading ? 'Adding...' : 'Add Time Slot'}
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Box>
            
            {availabilityBlocks.length > 0 ? (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    Current Custom Availability
                  </Typography>
                </Grid>
                
                {availabilityBlocks.map((block) => (
                  <Grid item xs={12} sm={6} md={4} key={block.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle2">
                            {block.isRecurring ? `Every ${block.day}` : (block.date ? format(new Date(block.date), 'MMM d, yyyy') : 'Unknown date')}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveBlock(block.id)}
                            color="error"
                            disabled={loading}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                        <Typography variant="body1" sx={{ mt: 1 }}>
                          {block.startTime} - {block.endTime}
                        </Typography>
                        <Chip
                          size="small"
                          label={block.isRecurring ? 'Recurring Weekly' : 'One-time'}
                          color={block.isRecurring ? 'primary' : 'secondary'}
                          sx={{ mt: 1 }}
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Alert severity="info">
                You haven't added any custom availability time slots yet.
              </Alert>
            )}
          </Paper>
        )}
        
        {tab === 2 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Time Off & Blocked Periods
            </Typography>
            <Typography variant="body2" paragraph color="text.secondary">
              Block out time for vacations, meetings, or other periods when you're unavailable for appointments.
            </Typography>
            
            <Box mb={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Add New Blocked Period
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Reason"
                        value={newBlockedTime.reason}
                        onChange={(e) => setNewBlockedTime({
                          ...newBlockedTime,
                          reason: e.target.value,
                        })}
                        placeholder="Vacation, Conference, Personal Day, etc."
                        disabled={loading}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Box display="flex" gap={2}>
                        <TextField
                          label="Start Date"
                          type="date"
                          value={newBlockedTime.startDate}
                          onChange={(e) => setNewBlockedTime({
                            ...newBlockedTime,
                            startDate: e.target.value,
                          })}
                          InputLabelProps={{
                            shrink: true,
                          }}
                          fullWidth
                          disabled={loading}
                        />
                        <TextField
                          label="End Date"
                          type="date"
                          value={newBlockedTime.endDate}
                          onChange={(e) => setNewBlockedTime({
                            ...newBlockedTime,
                            endDate: e.target.value,
                          })}
                          InputLabelProps={{
                            shrink: true,
                          }}
                          fullWidth
                          disabled={loading}
                        />
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Box display="flex" justifyContent="flex-end">
                        <Button
                          variant="contained"
                          startIcon={<AddIcon />}
                          onClick={handleAddBlockedTime}
                          disabled={!isValidBlockedTime() || loading}
                          color="warning"
                        >
                          {loading ? 'Blocking...' : 'Block Time Period'}
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Box>
            
            {blockedTimes.length > 0 ? (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    Currently Blocked Periods
                  </Typography>
                </Grid>
                
                {blockedTimes.map((blocked) => (
                  <Grid item xs={12} sm={6} md={4} key={blocked.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle2">
                            {blocked.reason}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveBlockedTime(blocked.id)}
                            color="error"
                            disabled={loading}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {format(new Date(blocked.startDate), 'MMM d, yyyy')}
                          {' - '}
                          {format(new Date(blocked.endDate), 'MMM d, yyyy')}
                        </Typography>
                        <Chip
                          size="small"
                          label={
                            isSameDay(
                              new Date(blocked.startDate),
                              new Date(blocked.endDate)
                            ) ? 'Single Day' : 'Multiple Days'
                          }
                          color="error"
                          sx={{ mt: 1 }}
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Alert severity="info">
                You haven't blocked any time periods yet.
              </Alert>
            )}
          </Paper>
        )}
        
        <Box display="flex" justifyContent="flex-end" mt={4}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={saveAllSettings}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save All Settings'}
          </Button>
        </Box>
      </Container>

      {/* Add Time Block Dialog */}
      <Dialog open={openBlockDialog} onClose={() => setOpenBlockDialog(false)}>
        <DialogTitle>Add Time Block</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Day</InputLabel>
                <Select
                  value={newBlock.day}
                  label="Day"
                  onChange={(e) => setNewBlock({ ...newBlock, day: e.target.value })}
                >
                  <MenuItem value="MONDAY">Monday</MenuItem>
                  <MenuItem value="TUESDAY">Tuesday</MenuItem>
                  <MenuItem value="WEDNESDAY">Wednesday</MenuItem>
                  <MenuItem value="THURSDAY">Thursday</MenuItem>
                  <MenuItem value="FRIDAY">Friday</MenuItem>
                  <MenuItem value="SATURDAY">Saturday</MenuItem>
                  <MenuItem value="SUNDAY">Sunday</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="time"
                label="Start Time"
                value={newBlock.startTime}
                onChange={(e) => setNewBlock({ ...newBlock, startTime: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="time"
                label="End Time"
                value={newBlock.endTime}
                onChange={(e) => setNewBlock({ ...newBlock, endTime: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={newBlock.isRecurring}
                    onChange={(e) => setNewBlock({ ...newBlock, isRecurring: e.target.checked })}
                  />
                }
                label="Recurring"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBlockDialog(false)}>Cancel</Button>
          <Button onClick={handleAddBlock} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Blocked Time Dialog */}
      <Dialog open={openBlockedTimeDialog} onClose={() => setOpenBlockedTimeDialog(false)}>
        <DialogTitle>Add Blocked Time</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Reason"
                value={newBlockedTime.reason}
                onChange={(e) => setNewBlockedTime({ ...newBlockedTime, reason: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="date"
                label="Start Date"
                value={newBlockedTime.startDate}
                onChange={(e) => setNewBlockedTime({ ...newBlockedTime, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="date"
                label="End Date"
                value={newBlockedTime.endDate}
                onChange={(e) => setNewBlockedTime({ ...newBlockedTime, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBlockedTimeDialog(false)}>Cancel</Button>
          <Button onClick={handleAddBlockedTime} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
} 