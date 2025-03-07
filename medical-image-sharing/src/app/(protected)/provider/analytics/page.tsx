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
  CircularProgress,
  Alert,
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
import { Analytics as AnalyticsIcon } from '@mui/icons-material';
import { ApiClient } from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { ApiResponse } from '@/lib/api/types';

export default function ProviderAnalytics() {
  const theme = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [patientActivityData, setPatientActivityData] = useState<any[]>([]); 
  const [imageTypeData, setImageTypeData] = useState<any[]>([]);
  const [monthlyImageData, setMonthlyImageData] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  useEffect(() => {
    if (!user?.id) return;
    
    async function fetchAnalyticsData() {
      try {
        setLoading(true);
        const apiClient = ApiClient.getInstance();
        
        // Fetch provider statistics for summary stats
        const statsResponse = await apiClient.getProviderStatistics(user?.id || '');
        if (statsResponse.status === 'success') {
          const { patientStats, imageStats } = statsResponse.data;
          
          setStats([
            { title: 'Total Patients', value: patientStats.total.toString() },
            { title: 'Active Patients', value: patientStats.active.toString() },
            { title: 'Total Images', value: imageStats.total.toString() },
            { title: 'Storage Used', value: imageStats.storageUsed },
          ]);
        }
        
        // Fetch patient activity data by month
        const patientActivityResponse = await apiClient.get<ApiResponse<any>>('/provider/analytics/patient-activity', {
          params: { providerId: user?.id }
        });
        if (patientActivityResponse && patientActivityResponse.status === 'success') {
          setPatientActivityData(patientActivityResponse.data as any);
        }
        
        // Fetch image type distribution
        const imageTypeResponse = await apiClient.get<ApiResponse<any>>('/provider/analytics/image-types', {
          params: { providerId: user?.id }
        });
        if (imageTypeResponse && imageTypeResponse.status === 'success') {
          setImageTypeData(imageTypeResponse.data as any);
        }
        
        // Fetch monthly image upload data
        const monthlyImageResponse = await apiClient.get<ApiResponse<any>>('/provider/analytics/monthly-images', {
          params: { providerId: user?.id }
        });
        if (monthlyImageResponse && monthlyImageResponse.status === 'success') {
          setMonthlyImageData(monthlyImageResponse.data as any);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError('Failed to load analytics data. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchAnalyticsData();
  }, [user?.id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: '1800px', mx: 'auto', px: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <AnalyticsIcon sx={{ fontSize: 32, mr: 2 }} />
        <Typography variant="h4" component="h1">
          Provider Analytics
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat) => (
          <Grid item xs={12} sm={6} md={3} key={stat.title}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  {stat.title}
                </Typography>
                <Typography variant="h5" component="div">
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Patient Activity Chart */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Patient Activity
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={patientActivityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="active" fill="#0088FE" name="Active Patients" />
                    <Bar dataKey="new" fill="#00C49F" name="New Patients" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Image Type Distribution */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Image Type Distribution
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={imageTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {imageTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Monthly Image Upload Trend */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Monthly Image Uploads
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyImageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="uploads"
                      stroke="#8884d8"
                      activeDot={{ r: 8 }}
                      name="Images Uploaded"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
} 