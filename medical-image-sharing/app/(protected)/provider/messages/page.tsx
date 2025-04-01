'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Box,
  Paper,
  Divider,
  CircularProgress,
  Alert,
  Button,
  Breadcrumbs,
  Tab,
  Tabs,
  Badge,
  useTheme,
  useMediaQuery,
} from '@mui/material'; 
import {
  Email as MessageIcon,
  ChatBubble as ChatIcon,
  Forum as DiscussionIcon,
  ArrowBack as BackIcon,
  FormatListBulleted as TemplateIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChatList } from '@/components/messages/ChatList';
import { ChatWindow } from '@/components/messages/ChatWindow';
import { useQuery } from '@tanstack/react-query';
import { providerClient } from '@/lib/api/providerClient';
import { useUser } from '@clerk/nextjs';
import { useToast } from '@/contexts/ToastContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { LoadingState } from '@/components/LoadingState'; 

// Component for empty chat state
const EmptyChatState = () => (
  <Box
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    height="100%"
    p={4}
    textAlign="center"
  >
    <ChatIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
    <Typography variant="h6" color="text.secondary" gutterBottom>
      Select a conversation
    </Typography>
    <Typography variant="body2" color="text.secondary">
      Choose a patient conversation from the list to view messages
    </Typography>
  </Box>
);

// Define tabs for message categories
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
      id={`messages-tabpanel-${index}`}
      aria-labelledby={`messages-tab-${index}`}
      {...other}
      style={{ height: '100%' }}
    >
      {value === index && <Box sx={{ height: '100%' }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `messages-tab-${index}`,
    'aria-controls': `messages-tabpanel-${index}`,
  };
}

export default function ProviderMessagesPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();
  const { handleError, withErrorHandling, clearErrors } = useErrorHandler({
    context: 'Provider Messages',
    showToastByDefault: true
  });
  
  // Get recipient ID from URL if available
  const recipientId = searchParams?.get('recipient') || null;
  
  // State
  const [tabValue, setTabValue] = useState(0);
  const [selectedRecipient, setSelectedRecipient] = useState<{id: string, name: string} | null>(null);
  const [showChatList, setShowChatList] = useState(!recipientId || !isMobile);
  const [unreadCounts, setUnreadCounts] = useState({
    all: 0,
    patients: 0,
    providers: 0
  });
  
  // Fetch unread message counts
  const { 
    data: unreadCountData,
    isLoading: unreadCountLoading,
    refetch: refetchUnreadCount,
    error: unreadCountError
  } = useQuery({
    queryKey: ['unread-message-counts'],
    queryFn: async () => {
      try {
        const response = await providerClient.getUnreadMessageCounts();
        return response.data;
      } catch (error) {
        console.error('Error fetching unread counts:', error);
        throw error;
      }
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  // Effect to handle unread count errors
  useEffect(() => {
    if (unreadCountError) {
      handleError(unreadCountError, true);
    }
  }, [unreadCountError]);
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Handle recipient selection
  const handleRecipientSelect = (recipientId: string, recipientName: string) => {
    setSelectedRecipient({ id: recipientId, name: recipientName });
    
    // On mobile, hide the chat list when a recipient is selected
    if (isMobile) {
      setShowChatList(false);
    }
    
    // Update URL with the selected recipient
    router.push(`/provider/messages?recipient=${recipientId}`);
  };
  
  // Handle back button on mobile
  const handleBackToList = () => {
    setShowChatList(true);
    setSelectedRecipient(null);
    router.push('/provider/messages');
  };
  
  // Update unread counts when data is loaded
  useEffect(() => {
    if (unreadCountData) {
      setUnreadCounts(unreadCountData);
    }
  }, [unreadCountData]);
  
  // Set selected recipient from URL on initial load
  useEffect(() => {
    if (recipientId) {
      // Fetch recipient details to get the name
      const fetchRecipientDetails = async () => {
        try {
          const response = await withErrorHandling(
            async () => providerClient.getPatientDetails(recipientId),
            { showToast: true }
          );
          
          if (response.data) {
            setSelectedRecipient({
              id: recipientId,
              name: response.data.name || 'Unknown Patient'
            });
            
            // On mobile, hide the chat list when a recipient is selected
            if (isMobile) {
              setShowChatList(false);
            }
          } else {
            throw new Error('Patient details not found');
          }
        } catch (error) {
          console.error('Error fetching recipient details:', error);
        }
      };
      
      fetchRecipientDetails();
    }
  }, [recipientId, isMobile, withErrorHandling]);
  
  useEffect(() => {
    if (!user?.id) return;
    
    // Initial load of unread counts
    refetchUnreadCount();
  }, [user?.id, refetchUnreadCount]);

  if (!isLoaded) {
    return null;
  }

  if (!user) {
    return null;
  }

  // Check if user has provider role in metadata
  const userRole = user.publicMetadata.role;
  if (userRole !== 'PROVIDER') {
    return null;
  }
  
  return (
    <Container maxWidth="xl" sx={{ py: 3, height: 'calc(100vh - 130px)' }}>
      {/* Breadcrumbs */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link href="/provider/dashboard" passHref>
          <Typography color="inherit" sx={{ cursor: 'pointer' }}>Dashboard</Typography>
        </Link>
        <Typography color="text.primary">Messages</Typography>
      </Breadcrumbs>
      
      {/* Error display at page level */}
      {unreadCountError && (
        <Alert 
          severity="error" 
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={() => clearErrors()}
            >
              Dismiss
            </Button>
          }
          sx={{ mb: 2 }}
        >
          Failed to load recipient details. Please try again.
        </Alert>
      )}

      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Messages</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {isMobile && selectedRecipient && !showChatList && (
            <Button
              variant="outlined"
              startIcon={<BackIcon />}
              onClick={handleBackToList}
            >
              Back to List
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<TemplateIcon />}
            onClick={() => router.push('/provider/messages/templates')}
          >
            Manage Templates
          </Button>
        </Box>
      </Box>
      
      {/* Message Categories Tabs */}
      <Tabs 
        value={tabValue} 
        onChange={handleTabChange} 
        aria-label="message categories"
        sx={{ mb: 2 }}
      >
        <Tab 
          label="All Messages" 
          icon={
            unreadCountLoading ? (
              <CircularProgress size={16} />
            ) : (
              <Badge 
                badgeContent={unreadCounts.all} 
                color="error"
                invisible={unreadCounts.all === 0}
              >
                <MessageIcon />
              </Badge>
            )
          } 
          iconPosition="start" 
          {...a11yProps(0)} 
        />
        <Tab 
          label="Patient Messages" 
          icon={
            unreadCountLoading ? (
              <CircularProgress size={16} />
            ) : (
              <Badge 
                badgeContent={unreadCounts.patients} 
                color="error"
                invisible={unreadCounts.patients === 0}
              >
                <ChatIcon />
              </Badge>
            )
          } 
          iconPosition="start" 
          {...a11yProps(1)} 
        />
        <Tab 
          label="Provider Messages" 
          icon={
            unreadCountLoading ? (
              <CircularProgress size={16} />
            ) : (
              <Badge 
                badgeContent={unreadCounts.providers} 
                color="error"
                invisible={unreadCounts.providers === 0}
              >
                <DiscussionIcon />
              </Badge>
            )
          } 
          iconPosition="start" 
          {...a11yProps(2)} 
        />
      </Tabs>
      
      {/* Message Content */}
      <Paper 
        elevation={3} 
        sx={{ 
          height: 'calc(100% - 100px)', 
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {unreadCountError && (
          <Alert 
            severity="warning" 
            action={
              <Button 
                color="inherit" 
                size="small" 
                startIcon={<RefreshIcon />}
                onClick={() => refetchUnreadCount()}
              >
                Retry
              </Button>
            }
            sx={{ mx: 2, my: 1 }}
          >
            Unable to load unread message counts. Some badges may not be up to date.
          </Alert>
        )}
        
        <Box sx={{ display: 'flex', height: '100%' }}>
          {/* Chat List Panel */}
          {(showChatList || !isMobile) && (
            <Box 
              sx={{ 
                width: isMobile ? '100%' : 300,
                height: '100%',
                borderRight: !isMobile ? 1 : 0,
                borderColor: 'divider',
                overflow: 'hidden'
              }}
            >
              <TabPanel value={tabValue} index={0}>
                <ChatList 
                  type="all"
                  onSelectChat={handleRecipientSelect}
                  selectedChatId={selectedRecipient?.id}
                  onRefresh={() => refetchUnreadCount()}
                />
              </TabPanel>
              <TabPanel value={tabValue} index={1}>
                <ChatList 
                  type="patient"
                  onSelectChat={handleRecipientSelect}
                  selectedChatId={selectedRecipient?.id}
                  onRefresh={() => refetchUnreadCount()}
                />
              </TabPanel>
              <TabPanel value={tabValue} index={2}>
                <ChatList 
                  type="provider"
                  onSelectChat={handleRecipientSelect}
                  selectedChatId={selectedRecipient?.id}
                  onRefresh={() => refetchUnreadCount()}
                />
              </TabPanel>
            </Box>
          )}
          
          {/* Chat Window Panel */}
          {(!isMobile || (isMobile && !showChatList)) && (
            <Box 
              sx={{ 
                flex: 1,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              {selectedRecipient ? (
                <ChatWindow 
                  recipientId={selectedRecipient.id} 
                  recipientName={selectedRecipient.name}
                  onMessageRead={() => refetchUnreadCount()}
                />
              ) : (
                <EmptyChatState />
              )}
            </Box>
          )}
        </Box>
      </Paper>
    </Container>
  );
} 