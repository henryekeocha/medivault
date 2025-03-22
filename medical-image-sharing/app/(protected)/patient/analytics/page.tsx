'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  useTheme,
  Skeleton, 
  Alert,
  CircularProgress,
  Button,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/hooks/useToast';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { LoadingState } from '@/components/LoadingState';
import RefreshIcon from '@mui/icons-material/Refresh';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

// Define proper interfaces for our data types
interface ImageHistoryItem {
  name: string;
  uploads: number;
}

interface ImageTypeItem {
  name: string;
  value: number;
}

interface ProviderInteractionItem {
  month: string;
  interactions: number;
}

export default function PatientAnalytics() {
  const theme = useTheme();
  const { showError } = useToast();
  const [stats, setStats] = useState([
    { title: 'Total Images', value: '0' },
    { title: 'Active Providers', value: '0' },
    { title: 'Storage Used', value: '0 MB' },
    { title: 'Last Upload', value: 'N/A' },
  ]);
  const [imageHistoryData, setImageHistoryData] = useState<ImageHistoryItem[]>([]);
  const [imageTypeData, setImageTypeData] = useState<ImageTypeItem[]>([]);
  const [providerInteractionData, setProviderInteractionData] = useState<ProviderInteractionItem[]>([]);
  const { error, loading, withErrorHandling } = useErrorHandler({
    context: 'Patient Analytics',
    showToastByDefault: true
  });

  // Type-specific empty data handlers
  const handleEmptyImageHistoryData = (
    data: ImageHistoryItem[] | undefined | null,
    message = 'No data'
  ): ImageHistoryItem[] => {
    if (!data || data.length === 0) {
      return [{ name: message, uploads: 0 }];
    }
    return data;
  };

  const handleEmptyImageTypeData = (
    data: ImageTypeItem[] | undefined | null,
    message = 'No data'
  ): ImageTypeItem[] => {
    if (!data || data.length === 0) {
      return [{ name: message, value: 0 }];
    }
    return data;
  };

  const handleEmptyProviderInteractionData = (
    data: ProviderInteractionItem[] | undefined | null,
    message = 'No data'
  ): ProviderInteractionItem[] => {
    if (!data || data.length === 0) {
      return [{ month: message, interactions: 0 }];
    }
    return data;
  };

  // Define a function for fetching analytics that returns a Promise
  const fetchAnalytics = async () => {
    // Use withErrorHandling to wrap the API call
    return withErrorHandling(async () => {
      const response = await apiClient.getPatientAnalytics();
      
      if (response.status === 'success') {
        const { data } = response;
        
        // Update stats
        setStats([
          { title: 'Total Images', value: data.totalImages.toString() },
          { title: 'Active Providers', value: data.activeProviders.toString() },
          { title: 'Storage Used', value: data.storageUsed },
          { title: 'Last Upload', value: data.lastUpload || 'N/A' },
        ]);
        
        // Update chart data
        setImageHistoryData(data.imageHistory || []);
        setImageTypeData(data.imageTypes || []);
        setProviderInteractionData(data.providerInteractions || []);
        
        return data;
      } else {
        throw new Error(response.error?.message || 'Failed to load analytics data');
      }
    }, { showToast: true, successMessage: 'Analytics data loaded successfully' });
  };

  // Call fetchAnalytics in useEffect with proper handling
  useEffect(() => {
    // Create a function to call fetchAnalytics to avoid React warning about async function in useEffect
    fetchAnalytics().catch((error: Error) => {
      console.error('Error loading analytics data:', error);
    });
  }, []);

  // Create a proper onClick handler for the Retry button
  const handleRetryClick = (e: React.MouseEvent) => {
    e.preventDefault();
    fetchAnalytics().catch((error: Error) => {
      console.error('Error reloading analytics data:', error);
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Patient Analytics Dashboard
      </Typography>

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={handleRetryClick}
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
        <LoadingState />
      ) : (
        <>
          {/* Stats Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {stats.map((stat) => (
              <Grid item xs={12} sm={6} md={3} key={stat.title}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography color="textSecondary" gutterBottom>
                    {stat.title}
                  </Typography>
                  <Typography variant="h5" component="div">
                    {stat.value}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* Charts Section */}
          <Grid container spacing={3}>
            {/* Image History Chart */}
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Image Upload History
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={handleEmptyImageHistoryData(imageHistoryData, 'No uploads')}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="uploads" fill="#0088FE" name="Images Uploaded" />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* Image Type Distribution */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Image Type Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={handleEmptyImageTypeData(imageTypeData)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {handleEmptyImageTypeData(imageTypeData).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* Provider Interaction Trend */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Provider Interactions
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={handleEmptyProviderInteractionData(providerInteractionData).map(item => ({
                    name: item.month,
                    value: item.interactions
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#8884d8"
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
} 