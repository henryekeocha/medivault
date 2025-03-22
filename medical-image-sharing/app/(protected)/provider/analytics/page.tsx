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
import { PaginatedResponse } from '@/lib/api/types';

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
          const { totalPatients = 0, totalImages = 0, totalShares = 0, recentActivity = [] } = statsResponse.data || {};
          
          setStats([
            { title: 'Total Patients', value: totalPatients.toString() },
            { title: 'Total Images', value: totalImages.toString() },
            { title: 'Total Shares', value: totalShares.toString() },
            { title: 'Recent Activity', value: recentActivity.length.toString() },
          ]);

          // Process recent activity for the chart
          const activityByMonth = recentActivity.reduce((acc: any, activity: any) => {
            const month = new Date(activity.timestamp).toLocaleString('default', { month: 'short' });
            if (!acc[month]) {
              acc[month] = { month, active: 0, new: 0 };
            }
            if (activity.type === 'NEW_PATIENT') {
              acc[month].new++;
            } else {
              acc[month].active++;
            }
            return acc;
          }, {});

          setPatientActivityData(Object.values(activityByMonth));

          // Process image types for the pie chart
          const imageTypes = recentActivity
            .filter((activity: any) => activity.type === 'IMAGE_UPLOAD')
            .reduce((acc: any, activity: any) => {
              const type = activity.details?.imageType || 'Unknown';
              acc[type] = (acc[type] || 0) + 1;
              return acc;
            }, {});

          setImageTypeData(
            Object.entries(imageTypes).map(([name, value]) => ({
              name,
              value
            }))
          );

          // Process monthly image uploads
          const monthlyUploads = recentActivity
            .filter((activity: any) => activity.type === 'IMAGE_UPLOAD')
            .reduce((acc: any, activity: any) => {
              const month = new Date(activity.timestamp).toLocaleString('default', { month: 'short' });
              acc[month] = (acc[month] || 0) + 1;
              return acc;
            }, {});

          setMonthlyImageData(
            Object.entries(monthlyUploads).map(([month, uploads]) => ({
              month,
              uploads
            }))
          );
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