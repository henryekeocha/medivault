'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  useTheme,
  CircularProgress,
  Alert,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Assessment as ReportsIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import { adminClient } from '@/lib/api/adminClient';

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
      id={`report-tabpanel-${index}`}
      aria-labelledby={`report-tab-${index}`}
      {...other}
      style={{ width: '100%' }}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function AdminReportsPage() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  
  // Sample report data - would normally come from API
  const [userReports, setUserReports] = useState<any[]>([]);
  const [imageReports, setImageReports] = useState<any[]>([]);
  const [activityReports, setActivityReports] = useState<any[]>([]);

  useEffect(() => {
    async function fetchReportData() {
      try {
        setLoading(true);
        
        // Simulate API calls - in a real app, these would be actual API requests
        // Placeholder data for demonstration
        const userReportData = [
          { id: 1, title: 'Monthly User Registration', date: '2023-04-01', type: 'User', status: 'Available' },
          { id: 2, title: 'User Activity Summary', date: '2023-04-01', type: 'User', status: 'Available' },
          { id: 3, title: 'Provider Performance', date: '2023-03-28', type: 'User', status: 'Available' },
          { id: 4, title: 'User Demographic Analysis', date: '2023-03-15', type: 'User', status: 'Available' },
        ];
        
        const imageReportData = [
          { id: 5, title: 'Image Upload Statistics', date: '2023-04-01', type: 'Image', status: 'Available' },
          { id: 6, title: 'Image Type Distribution', date: '2023-03-31', type: 'Image', status: 'Available' },
          { id: 7, title: 'Storage Usage Trend', date: '2023-03-28', type: 'Image', status: 'Available' },
          { id: 8, title: 'Processing Performance', date: '2023-03-20', type: 'Image', status: 'Available' },
        ];
        
        const activityReportData = [
          { id: 9, title: 'System Access Log', date: '2023-04-01', type: 'Activity', status: 'Available' },
          { id: 10, title: 'Security Events', date: '2023-03-31', type: 'Activity', status: 'Available' },
          { id: 11, title: 'API Usage Summary', date: '2023-03-28', type: 'Activity', status: 'Available' },
          { id: 12, title: 'Error Frequency Report', date: '2023-03-25', type: 'Activity', status: 'Available' },
        ];
        
        // Set the report data
        setUserReports(userReportData);
        setImageReports(imageReportData);
        setActivityReports(activityReportData);
        
        setError(null);
      } catch (err) {
        console.error('Error fetching report data:', err);
        setError('Failed to load report data. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchReportData();
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleDownload = (reportId: number) => {
    console.log(`Downloading report ${reportId}`);
    // In a real application, this would trigger a download from the server
  };

  const handlePrint = (reportId: number) => {
    console.log(`Printing report ${reportId}`);
    // In a real application, this would open a print dialog
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, px: 3 }}>
        <ReportsIcon sx={{ fontSize: 32, mr: 2 }} />
        <Typography variant="h4" component="h1">
          Reports
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 4, mx: 3 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ px: 3 }}>
        <Card>
          <CardContent>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={handleTabChange} aria-label="report tabs">
                <Tab label="User Reports" />
                <Tab label="Image Reports" />
                <Tab label="Activity Reports" />
              </Tabs>
            </Box>
            
            <TabPanel value={tabValue} index={0}>
              <ReportTable 
                reports={userReports} 
                onDownload={handleDownload} 
                onPrint={handlePrint} 
              />
            </TabPanel>
            
            <TabPanel value={tabValue} index={1}>
              <ReportTable 
                reports={imageReports} 
                onDownload={handleDownload} 
                onPrint={handlePrint} 
              />
            </TabPanel>
            
            <TabPanel value={tabValue} index={2}>
              <ReportTable 
                reports={activityReports} 
                onDownload={handleDownload} 
                onPrint={handlePrint} 
              />
            </TabPanel>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

interface ReportTableProps {
  reports: any[];
  onDownload: (id: number) => void;
  onPrint: (id: number) => void;
}

function ReportTable({ reports, onDownload, onPrint }: ReportTableProps) {
  return (
    <TableContainer component={Paper}>
      <Table aria-label="reports table">
        <TableHead>
          <TableRow>
            <TableCell>Title</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {reports.map((report) => (
            <TableRow key={report.id}>
              <TableCell>{report.title}</TableCell>
              <TableCell>{report.date}</TableCell>
              <TableCell>{report.type}</TableCell>
              <TableCell>{report.status}</TableCell>
              <TableCell align="right">
                <Button
                  startIcon={<DownloadIcon />}
                  size="small"
                  onClick={() => onDownload(report.id)}
                  sx={{ mr: 1 }}
                >
                  Download
                </Button>
                <Button
                  startIcon={<PrintIcon />}
                  size="small"
                  onClick={() => onPrint(report.id)}
                >
                  Print
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
} 