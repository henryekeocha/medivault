'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Paper,
  Divider,
  Avatar,
  CircularProgress,
  Button,
  Alert,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Popover,
  Chip,
} from '@mui/material';
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Image as ImageIcon,
  Description as FileIcon,
  MoreVert as MoreVertIcon, 
  AccountCircle,
  FormatListBulleted as TemplateIcon,
  ContentCopy as CopyIcon,
  AutoAwesome as AIIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { apiClient } from '@/lib/api/client';
import { Message } from '@/lib/api/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { LoadingState } from '@/components/LoadingState'; 

// Extended Message interface to include the properties we need
interface ExtendedMessage extends Message {
  isSender: boolean;
  unread: boolean;
  attachments?: Array<{
    id: string;
    filename: string;
    url: string;
    type: string;
  }>;
}

interface ChatWindowProps {
  recipientId: string;
  recipientName: string;
  onMessageRead?: () => void;
}

// Message templates
const messageTemplates = [
  {
    id: 'appt-reminder',
    title: 'Appointment Reminder',
    content: 'This is a reminder that you have an appointment scheduled soon. Please let us know if you need to reschedule.',
  },
  {
    id: 'results-ready',
    title: 'Results Ready',
    content: 'Your test results are now available. Please schedule a follow-up appointment to discuss the findings.',
  },
  {
    id: 'prescription-refill',
    title: 'Prescription Refill',
    content: 'Your prescription refill has been processed and is ready for pickup at your pharmacy.',
  },
  {
    id: 'follow-up-needed',
    title: 'Follow-up Needed',
    content: 'Based on your recent imaging study, we recommend a follow-up appointment to discuss the results and next steps.',
  },
  {
    id: 'additional-info',
    title: 'Additional Information Needed',
    content: 'We need some additional information about your symptoms before your appointment. Can you please provide more details?',
  },
];

export function ChatWindow({ recipientId, recipientName, onMessageRead }: ChatWindowProps) {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const { 
    error, 
    handleError, 
    withErrorHandling, 
    clearErrors,
    loading: errorLoading
  } = useErrorHandler({
    context: 'Chat Window'
  });
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [templateAnchorEl, setTemplateAnchorEl] = useState<null | HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (recipientId) {
      fetchMessages();
    }
  }, [recipientId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    if (!recipientId) return;

    setLoading(true);
    clearErrors();

    try {
      const response = await apiClient.getMessages({ receiverId: recipientId });
      if (response.status === 'success') {
        const currentUserId = apiClient.getCurrentUserId() || '';
        
        // Transform the messages to include isSender and unread flags
        const extendedMessages = response.data.map(msg => ({
          ...msg,
          isSender: msg.senderId === currentUserId,
          unread: msg.readAt === null || msg.readAt === undefined
        })) as ExtendedMessage[];
        
        setMessages(extendedMessages);
        
        // Mark messages as read
        extendedMessages.forEach(msg => {
          if (!msg.isSender && msg.unread) {
            apiClient.markMessageAsRead(msg.id).catch(err => {
              console.error("Error marking message as read:", err);
              // Continue without breaking the user experience
            });
          }
        });

        // Mark unread messages as read
        const unreadMessages = extendedMessages.filter((m: ExtendedMessage) => m.unread);
        if (unreadMessages.length > 0) {
          // Make API call to mark messages as read
          await Promise.all(
            unreadMessages.map((m: ExtendedMessage) => apiClient.markMessageAsRead(m.id))
          );
          if (onMessageRead) {
            onMessageRead();
          }
        }
      } else {
        handleError(new Error(response.error?.message || 'Failed to load messages'));
      }
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessageAsync = async () => {
    if (!messageText.trim() && attachments.length === 0) return;

    setSendingMessage(true);
    try {
      const response = await apiClient.sendMessage(recipientId, messageText, attachments);
      if (response.status === 'success') {
        // Add isSender and unread flags to the new message
        const newMessage = {
          ...response.data,
          isSender: true,
          unread: false
        } as ExtendedMessage;
        
        setMessages([...messages, newMessage]);
        setMessageText('');
        setAttachments([]);
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        showSuccess('Message sent successfully');
      } else {
        throw new Error(response.error?.message || 'Failed to send message');
      }
    } finally {
      setSendingMessage(false);
    }
  };
  
  const handleSendMessage = () => {
    withErrorHandling(handleSendMessageAsync, {
      showToast: true,
      successMessage: 'Message sent successfully'
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setAttachments([...attachments, ...Array.from(files)]);
    }
    // Reset the input value so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (indexToRemove: number) => {
    setAttachments(attachments.filter((_, index) => index !== indexToRemove));
  };

  const handleAttachmentClick = (type: 'image' | 'document') => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = type === 'image' ? 'image/*' : '.pdf,.doc,.docx,.txt';
      fileInputRef.current.click();
    }
    setMenuAnchorEl(null);
  };

  const formatMessageTime = (date: Date) => {
    return format(new Date(date), 'h:mm a');
  };

  // Template functions
  const openTemplateMenu = (event: React.MouseEvent<HTMLElement>) => {
    setTemplateAnchorEl(event.currentTarget);
  };
  
  const closeTemplateMenu = () => {
    setTemplateAnchorEl(null);
  };
  
  const applyTemplate = (content: string) => {
    setMessageText(content);
    closeTemplateMenu();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Chat header */}
      <Box 
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="h6">{recipientName}</Typography>
        {/* ... existing header content ... */}
      </Box>
      
      {/* Messages list */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          backgroundColor: 'background.default',
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <LoadingState message="Loading messages..." />
          </Box>
        ) : messages.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, flexDirection: 'column', gap: 2 }}>
            {error ? (
              <>
                <Alert 
                  severity="error" 
                  action={
                    <Button 
                      color="inherit" 
                      size="small" 
                      startIcon={<RefreshIcon />}
                      onClick={fetchMessages}
                    >
                      Retry
                    </Button>
                  }
                >
                  {error || 'Failed to load messages'}
                </Alert>
                <Typography variant="body1" color="text.secondary">
                  Unable to load messages. Please try again.
                </Typography>
              </>
            ) : (
              <Typography variant="body1" color="text.secondary">
                No messages yet. Start the conversation!
              </Typography>
            )}
          </Box>
        ) : (
          <>
            {error && (
              <Alert 
                severity="error" 
                action={
                  <Button 
                    color="inherit" 
                    size="small" 
                    startIcon={<RefreshIcon />}
                    onClick={fetchMessages}
                  >
                    Retry
                  </Button>
                }
                sx={{ mb: 2 }}
              >
                {error || 'Failed to load some messages'}
              </Alert>
            )}
            {messages.map((message) => (
              <Box
                key={message.id}
                sx={{
                  alignSelf: message.isSender ? 'flex-end' : 'flex-start',
                  maxWidth: '70%',
                }}
              >
                <Paper
                  sx={{
                    p: 2,
                    backgroundColor: message.isSender ? 'primary.main' : 'background.paper',
                    color: message.isSender ? 'primary.contrastText' : 'text.primary',
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="body1">{message.content}</Typography>
                  {message.attachments && message.attachments.length > 0 && (
                    <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {message.attachments.map((attachment) => (
                        <Tooltip key={attachment.id} title={attachment.filename}>
                          <Box
                            component="a"
                            href={attachment.url}
                            target="_blank"
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              p: 0.5,
                              border: '1px solid',
                              borderColor: message.isSender ? 'primary.light' : 'divider',
                              borderRadius: 1,
                              color: message.isSender ? 'primary.contrastText' : 'primary.main',
                              textDecoration: 'none',
                            }}
                          >
                            {attachment.type.startsWith('image/') ? (
                              <ImageIcon fontSize="small" />
                            ) : (
                              <FileIcon fontSize="small" />
                            )}
                            <Typography variant="caption" sx={{ ml: 0.5, maxWidth: 100 }} noWrap>
                              {attachment.filename}
                            </Typography>
                          </Box>
                        </Tooltip>
                      ))}
                    </Box>
                  )}
                </Paper>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 0.5, textAlign: message.isSender ? 'right' : 'left' }}
                >
                  {formatMessageTime(message.createdAt)}
                </Typography>
              </Box>
            ))}
          </>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input area */}
      <Box
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
          backgroundColor: 'background.paper',
        }}
      >
        {/* File attachments */}
        {attachments.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, backgroundColor: 'background.paper' }}>
            {attachments.map((file, index) => (
              <Tooltip key={index} title={file.name}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 0.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                >
                  {file.type.startsWith('image/') ? (
                    <ImageIcon fontSize="small" color="primary" />
                  ) : (
                    <FileIcon fontSize="small" color="primary" />
                  )}
                  <Typography variant="caption" sx={{ ml: 0.5, maxWidth: 100 }} noWrap>
                    {file.name}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveAttachment(index)}
                    sx={{ ml: 0.5, p: 0.2 }}
                  >
                    ✕
                  </IconButton>
                </Box>
              </Tooltip>
            ))}
          </Box>
        )}
        
        <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
          <Tooltip title="Message Templates">
            <IconButton 
              onClick={openTemplateMenu}
              size="medium"
              sx={{ mr: 1 }}
              disabled={loading || sendingMessage}
            >
              <TemplateIcon />
            </IconButton>
          </Tooltip>
          
          <TextField
            fullWidth
            placeholder="Type a message..."
            multiline
            maxRows={4}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={loading || sendingMessage}
            sx={{ mr: 1 }}
            error={!!error}
            helperText={error}
          />
          
          <Button
            variant="contained"
            onClick={handleSendMessage}
            disabled={(!messageText.trim() && attachments.length === 0) || loading || sendingMessage}
            endIcon={sendingMessage ? <CircularProgress size={20} color="inherit" /> : null}
          >
            Send
          </Button>
        </Box>
      </Box>
      
      {/* Templates Menu */}
      <Menu
        anchorEl={templateAnchorEl}
        open={Boolean(templateAnchorEl)}
        onClose={closeTemplateMenu}
        sx={{ maxWidth: '80%' }}
      >
        <MenuItem sx={{ bgcolor: 'background.paper', color: 'primary.main' }}>
          <ListItemIcon>
            <TemplateIcon color="primary" />
          </ListItemIcon>
          <ListItemText primary="Message Templates" />
        </MenuItem>
        <Divider />
        {messageTemplates.map((template) => (
          <MenuItem 
            key={template.id} 
            onClick={() => applyTemplate(template.content)}
            sx={{ maxWidth: 350 }}
          >
            <ListItemText 
              primary={template.title} 
              secondary={
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ 
                    whiteSpace: 'normal',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}
                >
                  {template.content}
                </Typography>
              }
            />
          </MenuItem>
        ))}
        <Divider />
        <MenuItem 
          disabled 
          sx={{ color: 'text.secondary', fontStyle: 'italic' }}
        >
          <ListItemIcon>
            <AIIcon color="disabled" />
          </ListItemIcon>
          <ListItemText primary="AI-suggested responses coming soon" />
        </MenuItem>
      </Menu>
    </Box>
  );
} 