import React from 'react';
import { Paper, Typography, Box, Skeleton } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DataPoint {
  name: string;
  value: number;
}

interface UsageChartProps {
  title: string;
  data: DataPoint[];
  loading?: boolean;
}

const UsageChart: React.FC<UsageChartProps> = ({ title, data, loading = false }) => {
  const theme = useTheme();

  return (
    <Paper
      sx={{
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderRadius: 2,
        boxShadow: theme.shadows[2],
      }}
    >
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {title}
      </Typography>

      {loading ? (
        <Box sx={{ height: 300, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Skeleton variant="rectangular" height={250} width="100%" />
        </Box>
      ) : (
        <Box sx={{ height: 300, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{
                top: 10,
                right: 30,
                left: 0,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis 
                dataKey="name" 
                tick={{ fill: theme.palette.text.secondary }}
                stroke={theme.palette.divider}
              />
              <YAxis 
                tick={{ fill: theme.palette.text.secondary }}
                stroke={theme.palette.divider}
                tickFormatter={(value) => `${value}TB`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 4,
                  boxShadow: theme.shadows[3],
                }}
                formatter={(value: number) => [`${value.toFixed(2)}TB`, 'Storage Used']}
                labelStyle={{ color: theme.palette.text.primary }}
              />
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={theme.palette.primary.main} 
                fillOpacity={1} 
                fill="url(#colorValue)" 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Paper>
  );
};

export default UsageChart; 