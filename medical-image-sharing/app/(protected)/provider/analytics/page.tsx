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
import { providerClient } from '@/lib/api/providerClient';
import { useUser } from '@clerk/nextjs';
import { ApiResponse } from '@/lib/api/types';
import { PaginatedResponse } from '@/lib/api/types';

interface AnalyticsData {
  totalPatients: number;
  totalImages: number;
  totalShares: number;
  recentActivity: Array<{
    timestamp: string;
    type: string;
    details?: {
      imageType?: string;
    };
  }>;
}

interface ActivityData {
  month: string;
  active: number;
  new: number;
}

interface ImageTypeData {
  name: string;
  value: number;
}

export default function ProviderAnalytics() {
  const theme = useTheme();
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [patientActivityData, setPatientActivityData] = useState<ActivityData[]>([]); 
  const [imageTypeData, setImageTypeData] = useState<ImageTypeData[]>([]);
  const [monthlyImageData, setMonthlyImageData] = useState<any[]>([]);
  const [stats, setStats] = useState<Array<{ title: string; value: string }>>([]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

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
    
    async function fetchAnalyticsData() {
      try {
        setLoading(true);
        
        // Fetch provider statistics for summary stats
        const statsResponse = await providerClient.getProviderStatistics();
        if (statsResponse.status === 'success') {
          const data = statsResponse.data;
          const { totalPatients = 0, totalAppointments = 0, totalMedicalRecords = 0 } = data;
          
          setStats([
            { title: 'Total Patients', value: totalPatients.toString() },
            { title: 'Total Appointments', value: totalAppointments.toString() },
            { title: 'Medical Records', value: totalMedicalRecords.toString() },
            { title: 'Active Patients', value: '0' }, // This will be updated when we add patient status tracking
          ]);

          // Since we don't have activity data yet, we'll set empty arrays
          setPatientActivityData([]);
          setImageTypeData([]);
          setMonthlyImageData([]);
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
  }, [isLoaded, user]);

  if (!isLoaded) {
    return null;
  }

  if (!user) {
    return null;
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