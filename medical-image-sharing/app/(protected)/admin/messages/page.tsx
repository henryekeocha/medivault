'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  TextField,
  Box,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Divider, 
  CircularProgress,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Block as BlockIcon,
  Flag as FlagIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { adminClient } from '@/lib/api/adminClient';
import { ApiResponse } from '@/lib/api/types';

// Define PaginatedResponse interface
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  data?: T[]; // Added for compatibility with existing API responses
}

// Define API message interface
interface ApiMessage {
  id: string;
  content: string;
  createdAt: string | Date;
  senderId: string;
  recipientId: string;
  sender?: { name: string; };
  recipient?: { name: string; };
  status?: string;
  type?: string;
  flags?: string[];
}

// Define UI message interface
interface Message {
  id: string;
  from: string;
  to: string;
  subject: string;
  content: string;
  timestamp: string;
  status: string;
  type: string;
  flags: string[];
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{message: string, severity: 'success' | 'error'} | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{open: boolean, messageId: string, action: string}>({
    open: false,
    messageId: '',
    action: ''
  });

  useEffect(() => {
    fetchMessages();
  }, [typeFilter, statusFilter]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      
      const params: any = {
        page: 1,
        limit: 50
      };
      
      if (typeFilter !== 'ALL') params.type = typeFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      
      const response = await adminClient.getMessages(params);
      
      if (response.status === 'success') {
        // Map to UI format
        setMessages((response.data.data || []).map((msg: ApiMessage) => ({
          id: msg.id,
          from: msg.sender?.name || 'Unknown',
          to: msg.recipient?.name || 'Unknown',
          subject: msg.content.substring(0, 50),
          content: msg.content,
          timestamp: new Date(msg.createdAt).toISOString(),
          status: msg.status || 'ACTIVE',
          type: msg.type || 'GENERAL',
          flags: msg.flags || []
        })));
        setError(null);
      } else {
        setError(response.error?.message || 'Failed to fetch messages');
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('An error occurred while fetching messages. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const filteredMessages = messages.filter(message => {
    const matchesSearch = 
      message.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.subject.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const handleDelete = async (messageId: string) => {
    setConfirmDialog({
      open: true,
      messageId,
      action: 'delete'
    });
  };

  const handleBlock = async (messageId: string) => {
    setConfirmDialog({
      open: true,
      messageId,
      action: 'block'
    });
  };

  const handleFlag = async (messageId: string) => {
    setConfirmDialog({
      open: true,
      messageId,
      action: 'flag'
    });
  };

  const handleConfirmAction = async () => {
    const { messageId, action } = confirmDialog;
    try {
      let response;
      
      switch (action) {
        case 'delete':
          response = await adminClient.deleteMessage(messageId);
          break;
        case 'block':
          response = await adminClient.updateMessageStatus(messageId, 'BLOCKED');
          break;
        case 'flag':
          response = await adminClient.updateMessageStatus(messageId, 'FLAGGED');
          break;
      }
      
      if (response && response.status === 'success') {
        setNotification({
          message: `Message successfully ${action === 'delete' ? 'deleted' : action === 'block' ? 'blocked' : 'flagged'}`,
          severity: 'success'
        });
        // Refresh messages list
        fetchMessages();
      } else {
        setNotification({
          message: `Failed to ${action} message`,
          severity: 'error'
        });
      }
    } catch (err) {
      console.error(`Error ${action}ing message:`, err);
      setNotification({
        message: `An error occurred while ${action}ing the message`,
        severity: 'error'
      });
    } finally {
      setConfirmDialog({ open: false, messageId: '', action: '' });
    }
  };

  const handleCloseDialog = () => {
    setConfirmDialog({ open: false, messageId: '', action: '' });
  };

  const handleCloseNotification = () => {
    setNotification(null);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Message Monitoring
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            label="Search Messages"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ width: 300 }}
          />
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={typeFilter}
              label="Type"
              onChange={(e) => setTypeFilter(e.target.value as string)}
            >
              <MenuItem value="ALL">All Types</MenuItem>
              <MenuItem value="MEDICAL">Medical</MenuItem>
              <MenuItem value="APPOINTMENT">Appointment</MenuItem>
              <MenuItem value="GENERAL">General</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value as string)}
            >
              <MenuItem value="ALL">All Status</MenuItem>
              <MenuItem value="ACTIVE">Active</MenuItem>
              <MenuItem value="FLAGGED">Flagged</MenuItem>
              <MenuItem value="BLOCKED">Blocked</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : filteredMessages.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography>No messages found matching your criteria</Typography>
        </Paper>
      ) : (
        <Paper>
          <List>
            {filteredMessages.map((message, index) => (
              <React.Fragment key={message.id}>
                {index > 0 && <Divider />}
                <ListItem
                  secondaryAction={
                    <Box>
                      <IconButton edge="end" onClick={() => handleFlag(message.id)}>
                        <FlagIcon color={message.status === 'FLAGGED' ? 'error' : 'inherit'} />
                      </IconButton>
                      <IconButton edge="end" onClick={() => handleBlock(message.id)}>
                        <BlockIcon color={message.status === 'BLOCKED' ? 'error' : 'inherit'} />
                      </IconButton>
                      <IconButton edge="end" onClick={() => handleDelete(message.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  }
                >
                  <ListItemAvatar>
                    <Avatar>{message.from[0]}</Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1">
                          {message.subject}
                        </Typography>
                        {message.flags.map((flag) => (
                          <Chip
                            key={flag}
                            label={flag}
                            size="small"
                            color={flag === 'URGENT' ? 'error' : 'default'}
                          />
                        ))}
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography component="span" variant="body2">
                          From: {message.from} To: {message.to}
                        </Typography>
                        <br />
                        <Typography component="span" variant="body2" color="text.secondary">
                          {message.content.substring(0, 100)}...
                        </Typography>
                        <br />
                        <Typography component="span" variant="caption" color="text.secondary">
                          {new Date(message.timestamp).toLocaleString()}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={handleCloseDialog}
      >
        <DialogTitle>
          {confirmDialog.action === 'delete' ? 'Delete Message' : 
           confirmDialog.action === 'block' ? 'Block Message' : 'Flag Message'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDialog.action === 'delete' 
              ? 'Are you sure you want to delete this message? This action cannot be undone.'
              : `Are you sure you want to ${confirmDialog.action} this message?`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleConfirmAction} 
            color={confirmDialog.action === 'delete' ? 'error' : 'primary'} 
            autoFocus
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar - fixed to ensure it doesn't return null */}
      {notification && (
        <Snackbar
          open={true}
          autoHideDuration={6000}
          onClose={handleCloseNotification}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={handleCloseNotification} 
            severity={notification.severity}
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      )}
    </Container>
  );
} 