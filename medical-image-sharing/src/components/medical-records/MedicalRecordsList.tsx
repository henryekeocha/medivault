'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  TextField,
  MenuItem,
  InputAdornment,
  Divider,
  Grid,
  FormControl, 
  InputLabel,
  Select,
  Button,
} from '@mui/material';
import {
  Description as DescriptionIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  SortByAlpha as SortIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { patientClient } from '@/lib/api';
import { MedicalRecord } from '@/lib/api/types';
import { formatDate } from '@/lib/utils/dateUtils';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { LoadingState } from '@/components/LoadingState';

interface MedicalRecordsListProps {
  patientId?: string;
  onRecordClick: (record: MedicalRecord) => void;
}

const recordTypeColors: Record<string, string> = {
  'visit': 'primary',
  'lab': 'success',
  'prescription': 'warning',
  'imaging': 'secondary',
  'surgery': 'error',
  'vaccination': 'info',
  'other': 'default',
};

const recordTypeLabels: Record<string, string> = {
  'visit': 'Office Visit',
  'lab': 'Lab Results',
  'prescription': 'Prescription',
  'imaging': 'Imaging',
  'surgery': 'Surgery',
  'vaccination': 'Vaccination',
  'other': 'Other',
};

export function MedicalRecordsList({ patientId, onRecordClick }: MedicalRecordsListProps) {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [recordType, setRecordType] = useState<string>('');
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null });
  
  // Sort states
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const { error, handleError, clearError, withErrorHandling } = useErrorHandler({
    context: 'Medical Records',
    showToastByDefault: true
  });
  
  const fetchRecords = async () => {
    setLoading(true);
    clearError();
    
    try {
      const params: any = {};
      
      if (dateRange.startDate) {
        params.startDate = dateRange.startDate;
      }
      
      if (dateRange.endDate) {
        params.endDate = dateRange.endDate;
      }
      
      params.sortBy = sortBy;
      params.sortOrder = sortOrder;
      
      const response = await patientClient.getMedicalRecords(params);
      
      if (response.status === 'success') {
        // Filter by search term if provided
        let filteredRecords = response.data.data || [];
        
        if (searchTerm) {
          const lowercaseSearch = searchTerm.toLowerCase();
          filteredRecords = filteredRecords.filter(
            (record: MedicalRecord) =>
              record.title.toLowerCase().includes(lowercaseSearch) ||
              record.content.toLowerCase().includes(lowercaseSearch)
          );
        }
        
        setRecords(filteredRecords);
      } else if (response.error?.code === 'SERVICE_UNAVAILABLE' || response.error?.code === 'NETWORK_ERROR') {
        // For 404 errors or network errors, just show empty state without error
        console.warn('Medical records service unavailable:', response.error);
        setRecords([]);
      } else {
        throw new Error(response.error?.message || 'Failed to fetch medical records');
      }
    } catch (err: any) {
      // Check if it's a 404 error (not found)
      if (err.response?.status === 404) {
        console.warn('Medical records service returned 404, showing empty state');
        setRecords([]);
      } else {
        handleError(err);
      }
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchRecords();
  }, [patientId, recordType, sortBy, sortOrder]);
  
  const handleSearch = () => {
    fetchRecords();
  };
  
  const handleClearFilters = () => {
    setSearchTerm('');
    setRecordType('');
    setDateRange({ startDate: null, endDate: null });
    setSortBy('createdAt');
    setSortOrder('desc');
  };
  
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleDownload = async (e: React.MouseEvent, recordId: string) => {
    e.stopPropagation();
    try {
      const blob = await patientClient.downloadMedicalRecord(recordId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `medical-record-${recordId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      // Check if it's a 404 error (document not found)
      if (err.response?.status === 404) {
        handleError(new Error('The requested document could not be found or downloaded'));
      } else {
        handleError(err);
      }
    }
  };

  const handleDateRangeChange = (field: 'startDate' | 'endDate', newValue: Date | null) => {
    setDateRange(prev => ({ ...prev, [field]: newValue }));
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Filters
        </Typography>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Search Records"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={handleSearch}>
                      <SearchIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Record Type</InputLabel>
              <Select
                value={recordType}
                onChange={(e) => setRecordType(e.target.value)}
                label="Record Type"
              >
                <MenuItem value="">All Types</MenuItem>
                {Object.entries(recordTypeLabels).map(([type, label]) => (
                  <MenuItem key={type} value={type}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Grid item xs={12} sm={6} md={2}>
              <DatePicker
                label="Start Date"
                value={dateRange.startDate}
                onChange={(newValue) => handleDateRangeChange('startDate', newValue as Date | null)}
                slotProps={{
                  textField: {
                    fullWidth: true
                  }
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <DatePicker
                label="End Date"
                value={dateRange.endDate}
                onChange={(newValue) => handleDateRangeChange('endDate', newValue as Date | null)}
                slotProps={{
                  textField: {
                    fullWidth: true
                  }
                }}
              />
            </Grid>
          </LocalizationProvider>
          
          <Grid item xs={12} sm={6} md={2}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <IconButton onClick={handleClearFilters} color="primary">
                <ClearIcon />
              </IconButton>
              <IconButton onClick={handleSearch} color="primary">
                <FilterIcon />
              </IconButton>
              <IconButton 
                onClick={() => handleSort('createdAt')} 
                color={sortBy === 'createdAt' ? 'primary' : 'default'}
              >
                <SortIcon sx={{ transform: sortOrder === 'asc' ? 'none' : 'scaleY(-1)' }} />
              </IconButton>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={fetchRecords}
              startIcon={<RefreshIcon />}
            >
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <LoadingState message="Loading medical records..." />
        </Box>
      ) : !error && records.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            No medical records found
          </Typography>
          {(recordType || searchTerm || dateRange.startDate || dateRange.endDate) && (
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Try adjusting your filters to see more results
            </Typography>
          )}
          <Button 
            variant="text" 
            startIcon={<RefreshIcon />} 
            onClick={fetchRecords}
            sx={{ mt: 1 }}
          >
            Refresh
          </Button>
        </Paper>
      ) : (
        <Paper>
          <List sx={{ width: '100%' }}>
            {records.map((record, index) => (
              <React.Fragment key={record.id}>
                {index > 0 && <Divider component="li" />}
                <ListItem
                  disablePadding
                  secondaryAction={
                    <Tooltip title="Download Record">
                      <IconButton edge="end" onClick={(e) => handleDownload(e, record.id)}>
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                  }
                >
                  <ListItemButton onClick={() => onRecordClick(record)}>
                    <ListItemIcon>
                      <DescriptionIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1" component="span">
                            {record.title}
                          </Typography>
                          <Chip
                            size="small"
                            label={recordTypeLabels[record.recordType] || record.recordType}
                            color={recordTypeColors[record.recordType] as any || 'default'}
                          />
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography variant="body2" component="span" color="text.secondary">
                            {formatDate(new Date(record.createdAt))}
                          </Typography>
                          <br />
                          <Typography
                            variant="body2"
                            component="span"
                            color="text.secondary"
                            sx={{
                              display: '-webkit-box',
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {record.content}
                          </Typography>
                        </>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
} 