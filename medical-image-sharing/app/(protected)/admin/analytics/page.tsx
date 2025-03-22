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

export default function AdminAnalytics() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [userActivityData, setUserActivityData] = useState<any[]>([]);
  const [imageUploadData, setImageUploadData] = useState<any[]>([]);
  const [userDistributionData, setUserDistributionData] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

  useEffect(() => {
    async function fetchAnalyticsData() {
      try {
        setLoading(true);
        const apiClient = ApiClient.getInstance();
        
        // Fetch admin statistics for summary stats
        const statsResponse = await apiClient.getAdminStatistics();
        if (statsResponse.status === 'success') {
          const { userStats, imageStats } = statsResponse.data;
          
          setStats([
            { title: 'Total Users', value: userStats.total.toString() },
            { title: 'Active Today', value: userStats.active.toString() },
            { title: 'Total Images', value: imageStats.total.toString() },
            { title: 'Storage Used', value: imageStats.storageUsed },
          ]);
          
          // Set user distribution data
          setUserDistributionData([
            { name: 'Providers', value: userStats.providers },
            { name: 'Patients', value: userStats.patients },
            { name: 'Admins', value: userStats.admins },
          ]);
        }
        
        // Fetch user activity data by month
        const userActivityResponse = await apiClient.get<any>('/admin/analytics/user-activity');
        if (userActivityResponse && userActivityResponse.data) {
          setUserActivityData(userActivityResponse.data);
        }
        
        // Fetch image upload trends
        const imageUploadsResponse = await apiClient.get<any>('/admin/analytics/image-uploads');
        if (imageUploadsResponse && imageUploadsResponse.data) {
          setImageUploadData(imageUploadsResponse.data);
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
  }, []);

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
        <AnalyticsIcon sx={{ fontSize: 32, mr: 2 }} />
        <Typography variant="h4" component="h1">
          Analytics Dashboard
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Box sx={{ px: 3 }}>
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
          {/* User Activity Chart */}
          <Grid item xs={12} md={8}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  User Activity
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={userActivityData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="providers" fill="#0088FE" />
                      <Bar dataKey="patients" fill="#00C49F" />
                      <Bar dataKey="admins" fill="#FFBB28" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* User Distribution Chart */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  User Distribution
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={userDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {userDistributionData.map((entry, index) => (
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

          {/* Image Upload Trend */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Image Upload Trend
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={imageUploadData}>
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
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
} 