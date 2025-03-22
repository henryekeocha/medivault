'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  CircularProgress, 
  Button,
  IconButton,
  TextField,
  InputAdornment,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  RadioGroup,
  Radio,
  FormControlLabel,
} from '@mui/material';
import { 
  Search as SearchIcon, 
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Info as InfoIcon,
  Download as DownloadIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { ApiClient } from '@/lib/api/client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { Role } from '@prisma/client';

interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  actionType: string;
  description: string;
  ipAddress: string;
  timestamp: string;
  metadata?: any;
}

export default function AuditLogsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>('');
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [actionType, setActionType] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Selected log for details view
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [showLogDetails, setShowLogDetails] = useState(false);
  
  // Export dialog state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportDateRange, setExportDateRange] = useState<'all' | 'current' | 'custom'>('current');
  const [exportStartDate, setExportStartDate] = useState<Date | null>(null);
  const [exportEndDate, setExportEndDate] = useState<Date | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Function to fetch activity logs
  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    
    try {
      const apiClient = ApiClient.getInstance();
      
      const params: any = {
        page: page,
        limit: limit
      };
      
      if (searchTerm) params.search = searchTerm;
      if (actionType) params.type = actionType;
      if (startDate) params.startDate = startDate.toISOString();
      if (endDate) params.endDate = endDate.toISOString();
      
      const response = await apiClient.getActivityLogs(params);
      
      if (response.status === 'success') {
        setLogs(response.data.data || []);
        setTotalLogs(response.data.pagination.total);
      } else {
        setError(response.error?.message || 'Failed to fetch activity logs');
      }
    } catch (err) {
      console.error('Error fetching activity logs:', err);
      setError('An error occurred while fetching logs. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Check if user is authorized and fetch logs
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (user?.role !== Role.ADMIN) {
      router.push('/dashboard');
      return;
    }
    
    fetchLogs();
  }, [isAuthenticated, user?.role, router, page, limit]);
  
  // Handle search when the search term changes (with debounce)
  useEffect(() => {
    const handler = setTimeout(() => {
      if (page === 1) {
        fetchLogs();
      } else {
        setPage(1); // This will trigger a fetch through the dependency array
      }
    }, 500);
    
    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, actionType, startDate, endDate]);
  
  // Handle page change
  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };
  
  // Handle search input change
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };
  
  // Handle filter changes
  const handleFilterChange = (filter: string, value: any) => {
    switch (filter) {
      case 'actionType':
        setActionType(value);
        break;
      case 'startDate':
        setStartDate(value);
        break;
      case 'endDate':
        setEndDate(value);
        break;
      default:
        break;
    }
  };
  
  // Reset filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setActionType('');
    setStartDate(null);
    setEndDate(null);
    setPage(1);
  };
  
  // Open export dialog
  const handleOpenExportDialog = () => {
    setExportFormat('csv');
    setExportDateRange('current');
    setExportStartDate(startDate);
    setExportEndDate(endDate);
    setExportDialogOpen(true);
  };
  
  // Close export dialog
  const handleCloseExportDialog = () => {
    setExportDialogOpen(false);
  };
  
  // Handle export format change
  const handleExportFormatChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setExportFormat(event.target.value);
  };
  
  // Handle export date range change
  const handleExportDateRangeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setExportDateRange(event.target.value as 'all' | 'current' | 'custom');
  };
  
  // Export logs
  const handleExportLogs = async () => {
    setIsExporting(true);
    setExportError(null);
    
    try {
      const apiClient = ApiClient.getInstance();
      
      const exportParams: any = {
        format: exportFormat
      };
      
      // Add date range if selected
      if (exportDateRange === 'custom') {
        if (exportStartDate) exportParams.startDate = exportStartDate.toISOString();
        if (exportEndDate) exportParams.endDate = exportEndDate.toISOString();
      }
      
      // Call the export API - update to use getAuditLogs with export flag
      const response = await apiClient.getAuditLogs({
        ...exportParams,
        export: true
      });
      
      if (response.status === 'success') {
        // Convert the response data to a string if it's not already
        const exportData = typeof response.data === 'string' 
          ? response.data 
          : JSON.stringify(response.data);
          
        // Create a download link for the exported file
        const blob = new Blob([exportData], { 
          type: exportFormat === 'csv' 
            ? 'text/csv' 
            : exportFormat === 'json' 
              ? 'application/json' 
              : 'text/plain' 
        });
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-export-${new Date().toISOString().split('T')[0]}.${exportFormat}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Close the dialog
        handleCloseExportDialog();
        setSuccess('Logs exported successfully');
      } else {
        setExportError(response.error?.message || 'Failed to export logs');
      }
    } catch (err) {
      console.error('Error exporting logs:', err);
      setExportError('An error occurred during export. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };
  
  // Show log details
  const handleShowLogDetails = (log: ActivityLog) => {
    setSelectedLog(log);
    setShowLogDetails(true);
  };
  
  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch (e) {
      return timestamp;
    }
  };
  
  // Get color for action type
  const getActionTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'login':
      case 'logout':
        return 'info';
      case 'create':
      case 'upload':
        return 'success';
      case 'delete':
        return 'error';
      case 'update':
      case 'edit':
        return 'warning';
      case 'share':
        return 'secondary';
      default:
        return 'default';
    }
  };
  
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ width: '100%' }}>
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Typography variant="h4" component="h1">
              Audit Logs
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={() => setIsFilterOpen(!isFilterOpen)}
              >
                Filters
              </Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleOpenExportDialog}
                disabled={logs.length === 0 || loading}
              >
                Export
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchLogs}
                disabled={loading}
              >
                Refresh
              </Button>
            </Box>
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          
          {/* Search and Filters */}
          <Box sx={{ mb: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  placeholder="Search logs by user, action, or description..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                    endAdornment: searchTerm ? (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setSearchTerm('')} size="small">
                          <ClearIcon />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                  }}
                />
              </Grid>
              
              {isFilterOpen && (
                <>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>Action Type</InputLabel>
                      <Select
                        value={actionType}
                        label="Action Type"
                        onChange={(e) => handleFilterChange('actionType', e.target.value)}
                      >
                        <MenuItem value="">All Actions</MenuItem>
                        <MenuItem value="login">Login</MenuItem>
                        <MenuItem value="logout">Logout</MenuItem>
                        <MenuItem value="create">Create</MenuItem>
                        <MenuItem value="update">Update</MenuItem>
                        <MenuItem value="delete">Delete</MenuItem>
                        <MenuItem value="upload">Upload</MenuItem>
                        <MenuItem value="share">Share</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <DatePicker
                      label="Start Date"
                      value={startDate}
                      onChange={(newValue: Date | null) => handleFilterChange('startDate', newValue)}
                      renderInput={(params) => <TextField {...params} fullWidth />}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <DatePicker
                      label="End Date"
                      value={endDate}
                      onChange={(newValue: Date | null) => handleFilterChange('endDate', newValue)}
                      renderInput={(params) => <TextField {...params} fullWidth />}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button 
                        variant="outlined" 
                        onClick={handleResetFilters}
                        startIcon={<ClearIcon />}
                      >
                        Clear Filters
                      </Button>
                    </Box>
                  </Grid>
                </>
              )}
            </Grid>
          </Box>
          
          {/* Active Filters Display */}
          {(actionType || startDate || endDate) && (
            <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="body2" sx={{ mr: 1 }}>
                Active Filters:
              </Typography>
              {actionType && (
                <Chip 
                  label={`Action: ${actionType}`} 
                  size="small" 
                  onDelete={() => handleFilterChange('actionType', '')} 
                />
              )}
              {startDate && (
                <Chip 
                  label={`From: ${startDate.toLocaleDateString()}`} 
                  size="small" 
                  onDelete={() => handleFilterChange('startDate', null)} 
                />
              )}
              {endDate && (
                <Chip 
                  label={`To: ${endDate.toLocaleDateString()}`} 
                  size="small" 
                  onDelete={() => handleFilterChange('endDate', null)} 
                />
              )}
            </Box>
          )}
          
          {/* Loading Indicator */}
          {loading && (
            <LinearProgress sx={{ mb: 2 }} />
          )}
          
          {/* Logs Table */}
          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>IP Address</TableCell>
                  <TableCell>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                      {loading ? (
                        <CircularProgress size={24} />
                      ) : (
                        'No activity logs found'
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{formatTimestamp(log.timestamp)}</TableCell>
                      <TableCell>{log.userName}</TableCell>
                      <TableCell>
                        <Chip 
                          label={log.actionType} 
                          size="small" 
                          color={getActionTypeColor(log.actionType) as any} 
                        />
                      </TableCell>
                      <TableCell>{log.description}</TableCell>
                      <TableCell>{log.ipAddress}</TableCell>
                      <TableCell>
                        <IconButton 
                          size="small" 
                          onClick={() => handleShowLogDetails(log)}
                        >
                          <InfoIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          {/* Pagination */}
          {logs.length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <Pagination 
                count={Math.ceil(totalLogs / limit)} 
                page={page} 
                onChange={handlePageChange} 
                color="primary" 
                disabled={loading}
              />
            </Box>
          )}
          
          {/* Log Details Dialog */}
          <Dialog
            open={showLogDetails}
            onClose={() => setShowLogDetails(false)}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              Activity Log Details
            </DialogTitle>
            <DialogContent dividers>
              {selectedLog && (
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">ID</Typography>
                    <Typography variant="body2" gutterBottom>{selectedLog.id}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">Timestamp</Typography>
                    <Typography variant="body2" gutterBottom>{formatTimestamp(selectedLog.timestamp)}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">User</Typography>
                    <Typography variant="body2" gutterBottom>{selectedLog.userName}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">User ID</Typography>
                    <Typography variant="body2" gutterBottom>{selectedLog.userId}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">Action</Typography>
                    <Typography variant="body2" gutterBottom>{selectedLog.action}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">Action Type</Typography>
                    <Typography variant="body2" gutterBottom>{selectedLog.actionType}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">Description</Typography>
                    <Typography variant="body2" gutterBottom>{selectedLog.description}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">IP Address</Typography>
                    <Typography variant="body2" gutterBottom>{selectedLog.ipAddress}</Typography>
                  </Grid>
                  {selectedLog.metadata && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2">Metadata</Typography>
                      <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                        <pre style={{ margin: 0, overflow: 'auto' }}>
                          {JSON.stringify(selectedLog.metadata, null, 2)}
                        </pre>
                      </Paper>
                    </Grid>
                  )}
                </Grid>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowLogDetails(false)}>
                Close
              </Button>
            </DialogActions>
          </Dialog>
          
          {/* Export Dialog */}
          <Dialog
            open={exportDialogOpen}
            onClose={handleCloseExportDialog}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>Export Audit Logs</DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ mb: 2 }}>
                Choose export format and date range for the audit logs.
              </DialogContentText>
              
              <Typography variant="subtitle2" gutterBottom>Export Format</Typography>
              <RadioGroup
                value={exportFormat}
                onChange={handleExportFormatChange}
                row
                sx={{ mb: 3 }}
              >
                <FormControlLabel value="csv" control={<Radio />} label="CSV" />
                <FormControlLabel value="json" control={<Radio />} label="JSON" />
                <FormControlLabel value="pdf" control={<Radio />} label="PDF" />
              </RadioGroup>
              
              <Typography variant="subtitle2" gutterBottom>Date Range</Typography>
              <RadioGroup
                value={exportDateRange}
                onChange={handleExportDateRangeChange}
                sx={{ mb: 2 }}
              >
                <FormControlLabel value="all" control={<Radio />} label="All logs" />
                <FormControlLabel value="current" control={<Radio />} label="Current filters" />
                <FormControlLabel value="custom" control={<Radio />} label="Custom date range" />
              </RadioGroup>
              
              {exportDateRange === 'custom' && (
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={6}>
                    <DatePicker
                      label="Start Date"
                      value={exportStartDate}
                      onChange={(newValue: Date | null) => setExportStartDate(newValue)}
                      renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <DatePicker
                      label="End Date"
                      value={exportEndDate}
                      onChange={(newValue: Date | null) => setExportEndDate(newValue)}
                      renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                    />
                  </Grid>
                </Grid>
              )}
              
              {exportDateRange === 'current' && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {actionType && `Action Type: ${actionType}`}
                    {startDate && ` • From: ${startDate.toLocaleDateString()}`}
                    {endDate && ` • To: ${endDate.toLocaleDateString()}`}
                    {!actionType && !startDate && !endDate && 'No filters applied'}
                  </Typography>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseExportDialog}>Cancel</Button>
              <Button 
                onClick={handleExportLogs} 
                variant="contained" 
                startIcon={isExporting ? <CircularProgress size={20} /> : <DownloadIcon />}
                disabled={isExporting || (exportDateRange === 'custom' && (!exportStartDate || !exportEndDate))}
              >
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>
            </DialogActions>
          </Dialog>
        </Container>
      </Box>
    </LocalizationProvider>
  );
} 