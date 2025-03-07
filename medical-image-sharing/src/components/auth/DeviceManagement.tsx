import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Tooltip,
  IconButton,
  Chip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import { format } from 'date-fns';
import { deviceService, Device, AuthEvent } from '@/services/deviceService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`device-tabpanel-${index}`}
      aria-labelledby={`device-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function DeviceManagement() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [authEvents, setAuthEvents] = useState<AuthEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const fetchedDevices = await deviceService.getDevices();
      setDevices(fetchedDevices);
      setError(null);
    } catch (err) {
      setError('Failed to load devices. Please try again later.');
      console.error('Error fetching devices:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuthEvents = async () => {
    try {
      setLoading(true);
      const fetchedEvents = await deviceService.getAuthEvents();
      setAuthEvents(fetchedEvents);
      setError(null);
    } catch (err) {
      setError('Failed to load authentication events. Please try again later.');
      console.error('Error fetching auth events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tabValue === 0) {
      fetchDevices();
    } else {
      fetchAuthEvents();
    }
  }, [tabValue]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleForgetDevice = async (deviceKey: string) => {
    try {
      setActionInProgress(deviceKey);
      const success = await deviceService.forgetDevice(deviceKey);
      if (success) {
        setDevices(devices.filter(device => device.deviceKey !== deviceKey));
      } else {
        setError('Failed to forget device. Please try again.');
      }
    } catch (err) {
      setError('An error occurred while forgetting the device.');
      console.error('Error forgetting device:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRememberDevice = async (deviceKey: string, remembered: boolean) => {
    try {
      setActionInProgress(deviceKey);
      const success = await deviceService.updateDeviceStatus(deviceKey, remembered);
      if (success) {
        setDevices(
          devices.map(device =>
            device.deviceKey === deviceKey ? { ...device, remembered } : device
          )
        );
      } else {
        setError('Failed to update device status. Please try again.');
      }
    } catch (err) {
      setError('An error occurred while updating the device status.');
      console.error('Error updating device status:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'PPP p');
    } catch (err) {
      return dateString;
    }
  };

  const getDeviceName = (device: Device) => {
    return device.deviceName || 
           (device.deviceAttributes?.['device_name'] || 
           'Unknown Device');
  };

  const getEventStatusChip = (event: AuthEvent) => {
    const status = event.eventResponse;
    
    if (status === 'Success') {
      return <Chip label="Success" color="success" size="small" />;
    } else if (status === 'Failure') {
      return <Chip label="Failed" color="error" size="small" />;
    } else {
      return <Chip label={status} color="default" size="small" />;
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h5" gutterBottom>
        Device Management
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="device management tabs">
          <Tab label="My Devices" id="device-tab-0" aria-controls="device-tabpanel-0" />
          <Tab label="Login History" id="device-tab-1" aria-controls="device-tabpanel-1" />
        </Tabs>
      </Box>
      
      <TabPanel value={tabValue} index={0}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : devices.length === 0 ? (
          <Typography variant="body1" sx={{ p: 2 }}>
            No devices found.
          </Typography>
        ) : (
          <TableContainer component={Paper}>
            <Table aria-label="devices table">
              <TableHead>
                <TableRow>
                  <TableCell>Device</TableCell>
                  <TableCell>Last Used</TableCell>
                  <TableCell>Remember Device</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {devices.map((device) => (
                  <TableRow key={device.deviceKey}>
                    <TableCell>
                      <Typography variant="body1">
                        {getDeviceName(device)}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Added: {formatDate(device.deviceCreateDate)}
                      </Typography>
                    </TableCell>
                    <TableCell>{formatDate(device.deviceLastAuthenticatedDate)}</TableCell>
                    <TableCell>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={!!device.remembered}
                            onChange={(e) => handleRememberDevice(device.deviceKey, e.target.checked)}
                            disabled={actionInProgress === device.deviceKey}
                          />
                        }
                        label={device.remembered ? "Remembered" : "Not remembered"}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Forget this device">
                        <IconButton
                          onClick={() => handleForgetDevice(device.deviceKey)}
                          disabled={actionInProgress === device.deviceKey}
                          color="error"
                        >
                          {actionInProgress === device.deviceKey ? (
                            <CircularProgress size={24} />
                          ) : (
                            <DeleteIcon />
                          )}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : authEvents.length === 0 ? (
          <Typography variant="body1" sx={{ p: 2 }}>
            No login history found.
          </Typography>
        ) : (
          <TableContainer component={Paper}>
            <Table aria-label="login history table">
              <TableHead>
                <TableRow>
                  <TableCell>Date & Time</TableCell>
                  <TableCell>Event</TableCell>
                  <TableCell>Device</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Risk</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {authEvents.map((event) => (
                  <TableRow key={event.eventId}>
                    <TableCell>{formatDate(event.creationDate)}</TableCell>
                    <TableCell>{event.eventType}</TableCell>
                    <TableCell>
                      {event.deviceName || 'Unknown Device'}
                      {event.ipAddress && (
                        <Typography variant="caption" display="block" color="textSecondary">
                          IP: {event.ipAddress}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {event.city && event.country 
                        ? `${event.city}, ${event.country}`
                        : (event.country || event.city || 'Unknown')}
                    </TableCell>
                    <TableCell>{getEventStatusChip(event)}</TableCell>
                    <TableCell>
                      {event.eventRisk ? (
                        <Tooltip title={`Risk Decision: ${event.eventRisk.riskDecision}`}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {event.eventRisk.riskLevel}
                            <InfoIcon fontSize="small" sx={{ ml: 0.5 }} />
                          </Box>
                        </Tooltip>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>
    </Box>
  );
} 