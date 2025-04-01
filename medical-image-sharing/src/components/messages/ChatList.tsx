'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Divider,
  TextField,
  InputAdornment,
  CircularProgress,
  Paper,
  Badge,
  IconButton,
  Alert,
  Button,
} from '@mui/material';
import {
  Search as SearchIcon,
  AccountCircle,
  Circle as CircleIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { sharedClient } from '@/lib/api/sharedClient';
import { Message } from '@/lib/api/types';
import { formatDistanceToNow } from 'date-fns';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { LoadingState } from '@/components/LoadingState';

// Extended Message interface to include the properties we need
interface ExtendedMessage extends Message {
  isSender: boolean;
  unread: boolean;
}

interface ChatListProps {
  onSelectChat: (userId: string, userName: string) => void;
  selectedChatId?: string;
  type?: 'all' | 'patient' | 'provider';
  onRefresh?: () => void;
}

export function ChatList({ 
  onSelectChat, 
  selectedChatId, 
  type = 'all', 
  onRefresh 
}: ChatListProps) {
  const [chats, setChats] = useState<ExtendedMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { handleError, withErrorHandling, clearErrors } = useErrorHandler({
    context: 'Chat List',
    showToastByDefault: true
  });

  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    setLoading(true);
    clearErrors();
    setErrorMessage(null);

    try {
      const response = await sharedClient.getChats();
      if (!response || !response.data) {
        throw new Error('Invalid response from server');
      }
      
      const currentUserId = sharedClient.getCurrentUserId() || '';
      
      // Transform the conversations into the format expected by the component
      // Handle different response formats (direct array or nested in data.conversations)
      const conversationsData = Array.isArray(response.data) 
        ? response.data 
        : (response.data.conversations || []);
      
      const messages = conversationsData.map((conversation: any) => ({
        id: conversation.id || `${conversation.participantId}-${Date.now()}`,
        senderId: conversation.senderId || conversation.participantId,
        recipientId: conversation.recipientId || currentUserId,
        content: conversation.content || conversation.lastMessage || '',
        createdAt: conversation.createdAt || conversation.lastMessageAt || new Date(),
        sender: conversation.sender || {
          id: conversation.participantId,
          name: conversation.participantName
        },
        recipient: conversation.recipient || {
          id: currentUserId,
          name: "You"
        },
        isSender: (conversation.senderId === currentUserId) || false,
        unread: (!conversation.readAt && conversation.recipientId === currentUserId) || false
      })) as ExtendedMessage[];
      
      setChats(messages);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load conversations');
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const filteredChats = chats.filter(chat => {
    const searchLower = searchTerm.toLowerCase();
    return (
      chat.sender.name?.toLowerCase().includes(searchLower) ||
      chat.recipient.name?.toLowerCase().includes(searchLower) ||
      chat.content?.toLowerCase().includes(searchLower)
    );
  });

  const getOtherUser = (chat: ExtendedMessage) => {
    // Determine which user in the chat is not the current user
    return chat.isSender ? chat.recipient : chat.sender;
  };

  const formatMessageDate = (date: Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Search conversations..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <LoadingState message="Loading conversations..." />
        </Box>
      ) : errorMessage ? (
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
          <Alert 
            severity="error" 
            action={
              <Button 
                color="inherit" 
                size="small" 
                startIcon={<RefreshIcon />}
                onClick={fetchChats}
              >
                Retry
              </Button>
            }
            sx={{ width: '100%' }}
          >
            {errorMessage}
          </Alert>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Unable to load your conversations. Please check your connection and try again.
          </Typography>
        </Box>
      ) : filteredChats.length === 0 ? (
        <Typography variant="body1" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
          {searchTerm ? 'No conversations match your search' : 'No conversations yet'}
        </Typography>
      ) : (
        <List sx={{ width: '100%', flex: 1, overflow: 'auto' }}>
          {filteredChats.map((chat, index) => {
            const otherUser = getOtherUser(chat);
            const isSelected = otherUser.id === selectedChatId;

            return (
              <React.Fragment key={chat.id}>
                {index > 0 && <Divider component="li" />}
                <ListItem
                  disablePadding
                  secondaryAction={
                    chat.unread && !chat.isSender ? (
                      <Badge
                        color="primary"
                        variant="dot"
                        overlap="circular"
                        sx={{ mr: 1 }}
                      >
                        <CircleIcon sx={{ fontSize: 12 }} />
                      </Badge>
                    ) : null
                  }
                >
                  <ListItemButton
                    selected={isSelected}
                    onClick={() => onSelectChat(otherUser.id, otherUser.name || 'Unknown')}
                    sx={{
                      borderLeft: isSelected ? '4px solid' : 'none',
                      borderLeftColor: 'primary.main',
                      pl: isSelected ? 2 : 3,
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar src={otherUser.image}>
                        <AccountCircle />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="subtitle2" noWrap>
                            {otherUser.name || 'Unknown User'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatMessageDate(chat.createdAt)}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Typography
                          variant="body2"
                          color={chat.unread && !chat.isSender ? 'text.primary' : 'text.secondary'}
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            fontWeight: chat.unread && !chat.isSender ? 'medium' : 'normal',
                          }}
                        >
                          {chat.isSender && (
                            <Typography component="span" variant="body2" color="text.secondary">
                              You:{' '}
                            </Typography>
                          )}
                          {chat.content}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              </React.Fragment>
            );
          })}
        </List>
      )}
    </Box>
  );
} 