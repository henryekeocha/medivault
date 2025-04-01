import React, { useState, useEffect } from 'react';
import { Paper, Typography, Box, Skeleton, FormControl, InputLabel, MenuItem, Select, Alert, Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { HealthMetricResponse } from '@/lib/api/types';
import { patientClient } from '@/lib/api';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import RefreshIcon from '@mui/icons-material/Refresh';

// Define our own loading state component to avoid incompatible props
interface SimpleLoadingStateProps {
  height?: number;
}

const SimpleLoadingState: React.FC<SimpleLoadingStateProps> = ({ height }) => {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: height || 300 }}>
      <Skeleton variant="rectangular" width="100%" height={height || 300} />
    </Box>
  );
};

interface HealthMetricsChartProps { 
  title: string;
  patientId: string;
  loading?: boolean;
}

// Metric types and their properties
const metricTypes = {
  HEART_RATE: { label: 'Heart Rate', unit: 'bpm', color: '#FF5252' },
  BLOOD_PRESSURE: { label: 'Blood Pressure', unit: 'mmHg', color: '#448AFF' },
  BLOOD_GLUCOSE: { label: 'Blood Glucose', unit: 'mg/dL', color: '#7E57C2' },
  TEMPERATURE: { label: 'Temperature', unit: '°F', color: '#FFC107' },
  OXYGEN_SATURATION: { label: 'Oxygen Saturation', unit: '%', color: '#66BB6A' },
  RESPIRATORY_RATE: { label: 'Respiratory Rate', unit: 'breaths/min', color: '#26A69A' },
  WEIGHT: { label: 'Weight', unit: 'lbs', color: '#78909C' },
  HEIGHT: { label: 'Height', unit: 'in', color: '#8D6E63' },
  BMI: { label: 'BMI', unit: '', color: '#EC407A' },
};

// Helper to format timestamp into readable date for chart
const formatDate = (timestamp: string | Date) => {
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

// Define types for chart data
interface ChartDataPoint {
  date: string;
  value: number;
  timestamp?: number; // Make timestamp optional
}

const HealthMetricsChart: React.FC<HealthMetricsChartProps> = ({ title, patientId, loading = false }) => {
  const theme = useTheme();
  const [metrics, setMetrics] = useState<HealthMetricResponse[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [selectedMetricType, setSelectedMetricType] = useState<string>('HEART_RATE');
  const [isLoading, setIsLoading] = useState(false);
  const { error, handleError, clearErrors } = useErrorHandler();

  // Fetch health metrics data
  useEffect(() => {
    if (patientId && !loading) {
      fetchHealthMetrics();
    }
  }, [patientId, selectedMetricType, loading]);

  const fetchHealthMetrics = async () => {
    if (!patientId) return;
    
    try {
      setIsLoading(true);
      clearErrors();
      
      const response = await patientClient.getHealthMetrics({ 
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString()
      });
      
      if (response.status === 'success') {
        // Filter metrics by the selected type
        const filteredMetrics = (response.data.data || []).filter(
          (metric: HealthMetricResponse) => metric.type === selectedMetricType
        );
        setMetrics(filteredMetrics);
        
        // Process data for chart
        const formattedData: ChartDataPoint[] = filteredMetrics.map((metric: HealthMetricResponse) => ({
          date: formatDate(metric.timestamp),
          value: metric.value,
          timestamp: new Date(metric.timestamp).getTime() // For sorting
        }));
        
        // Sort by timestamp and remove the timestamp property
        const sortedData = formattedData.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        setChartData(sortedData.map(({ timestamp, ...rest }) => rest));
      } else {
        throw new Error(response.error?.message || 'Failed to fetch health metrics');
      }
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMetricTypeChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedMetricType(event.target.value as string);
    clearErrors();
  };

  const handleRetry = () => {
    fetchHealthMetrics();
  };

  return (
    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h2">
          {title}
        </Typography>
        <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="metric-type-label">Metric Type</InputLabel>
          <Select
            labelId="metric-type-label"
            id="metric-type"
            value={selectedMetricType}
            onChange={(e) => setSelectedMetricType(e.target.value)}
            label="Metric Type"
            disabled={isLoading || loading}
          >
            {Object.entries(metricTypes).map(([key, { label }]) => (
              <MenuItem key={key} value={key}>
                {label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={() => handleRetry()}
              startIcon={<RefreshIcon />}
            >
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {loading || isLoading ? (
        <SimpleLoadingState height={300} />
      ) : chartData.length > 0 ? (
        <Box sx={{ height: 300, flex: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis
                label={{
                  value: metricTypes[selectedMetricType as keyof typeof metricTypes]?.unit || '',
                  angle: -90,
                  position: 'insideLeft',
                }}
              />
              <Tooltip
                formatter={(value: number) => [
                  `${value} ${metricTypes[selectedMetricType as keyof typeof metricTypes]?.unit || ''}`,
                  metricTypes[selectedMetricType as keyof typeof metricTypes]?.label || selectedMetricType,
                ]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                name={metricTypes[selectedMetricType as keyof typeof metricTypes]?.label || selectedMetricType}
                stroke={metricTypes[selectedMetricType as keyof typeof metricTypes]?.color || theme.palette.primary.main}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      ) : (
        <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No data available for this metric
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default HealthMetricsChart; 