import React, { useState } from 'react';
import {
  Box,
  Card,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Grid,
  IconButton,
  Tooltip,
  ChipProps,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
} from '@mui/lab';
import type { TimelineDotProps } from '@mui/lab';
import {
  Warning as WarningIcon,
  Info as InfoIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { providerClient } from '@/lib/api/providerClient';
import { ImageAnalysis as ImageAnalysisType, AnalysisResult, AnalysisFinding } from '@/lib/api/types';

type TimelineDotColor = TimelineDotProps['color'];

interface Props {
  imageId: string;
  onAnalysisComplete?: (result: AnalysisResult) => void;
}

export const ImageAnalysis: React.FC<Props> = ({ imageId, onAnalysisComplete }) => {
  const [showHistory, setShowHistory] = useState(false);

  // Query for analysis results
  const {
    data: analysisResponse,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['analysis', imageId],
    queryFn: async () => {
      const response = await providerClient.analyzeImage({
        imageId,
        type: 'DIAGNOSTIC',
      });
      const result: AnalysisResult = {
        id: response.data.id,
        imageId: response.data.imageId,
        findings: typeof response.data.findings === 'string' 
          ? JSON.parse(response.data.findings)
          : response.data.findings || [],
        diagnosis: response.data.diagnosis || undefined,
        confidence: response.data.confidence || undefined,
        status: response.data.status,
        createdAt: response.data.createdAt,
        updatedAt: response.data.updatedAt
      };
      if (onAnalysisComplete) {
        onAnalysisComplete(result);
      }
      return { data: result };
    }
  });

  // Query for analysis history
  const {
    data: historyResponse,
    isLoading: historyLoading
  } = useQuery({
    queryKey: ['analysis-history', imageId],
    queryFn: async () => {
      const response = await providerClient.getAnalyses({ imageId });
      return response.data.data; // Access the data array from PaginatedResponse
    },
    enabled: showHistory
  });

  const analysis = analysisResponse?.data;
  const history = historyResponse || [];

  const getSeverityColor = (severity: AnalysisFinding['severity']): TimelineDotColor => {
    switch (severity.toLowerCase()) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'grey';
    }
  };

  const getSeverityIcon = (severity: AnalysisFinding['severity']) => {
    switch (severity.toLowerCase()) {
      case 'high':
        return <ErrorIcon color="error" />;
      case 'medium':
        return <WarningIcon color="warning" />;
      case 'low':
        return <InfoIcon color="info" />;
      default:
        return <InfoIcon />;
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Alert severity="error">
        Error analyzing image: {error?.message || 'Unknown error'}
      </Alert>
    );
  }

  if (!analysis) {
    return (
      <Alert severity="warning">
        No analysis data available
      </Alert>
    );
  }

  return (
    <Card>
      <Box p={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Image Analysis Results</Typography>
          <Box>
            <IconButton onClick={() => refetch()} title="Refresh analysis">
              <RefreshIcon />
            </IconButton>
            <IconButton 
              onClick={() => setShowHistory(!showHistory)}
              title={showHistory ? "Hide history" : "Show history"}
            >
              <HistoryIcon />
            </IconButton>
          </Box>
        </Box>

        {analysis.findings && (
          <Timeline>
            {analysis.findings.map((finding: AnalysisFinding, index: number) => (
              <TimelineItem key={index}>
                <TimelineSeparator>
                  <TimelineDot color={getSeverityColor(finding.severity)}>
                    {getSeverityIcon(finding.severity)}
                  </TimelineDot>
                  {index < analysis.findings.length - 1 && <TimelineConnector />}
                </TimelineSeparator>
                <TimelineContent>
                  <Typography variant="subtitle1">{finding.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {finding.description}
                  </Typography>
                  {finding.confidence && (
                    <Chip
                      size="small"
                      label={`Confidence: ${(finding.confidence * 100).toFixed(1)}%`}
                      color={finding.confidence > 0.8 ? "success" : "warning"}
                      sx={{ mt: 1 }}
                    />
                  )}
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        )}

        {showHistory && history.length > 0 && (
          <Box mt={3}>
            <Typography variant="subtitle1" gutterBottom>Analysis History</Typography>
            <Timeline>
              {history.map((item: ImageAnalysisType, index: number) => (
                <TimelineItem key={item.id}>
                  <TimelineSeparator>
                    <TimelineDot />
                    {index < history.length - 1 && <TimelineConnector />}
                  </TimelineSeparator>
                  <TimelineContent>
                    <Typography variant="body2">
                      {new Date(item.createdAt).toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.type} - {item.status}
                    </Typography>
                  </TimelineContent>
                </TimelineItem>
              ))}
            </Timeline>
          </Box>
        )}
      </Box>
    </Card>
  );
}; 