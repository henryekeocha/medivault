'use client';

import React from 'react';
import { Box, Typography, Avatar, Tooltip } from '@mui/material';
import { format } from 'date-fns';
import { Message } from '@/lib/api/types';

interface ChatMessageProps {
  message: Message;
  isOwnMessage: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isOwnMessage }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isOwnMessage ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        mb: 2,
      }}
    >
      <Avatar
        src={message.sender.image} 
        alt={message.sender.name}
        sx={{ width: 32, height: 32, mr: isOwnMessage ? 0 : 1, ml: isOwnMessage ? 1 : 0 }}
      />
      <Box
        sx={{
          maxWidth: '70%',
          bgcolor: isOwnMessage ? 'primary.main' : 'grey.100',
          color: isOwnMessage ? 'white' : 'text.primary',
          borderRadius: 2,
          p: 1.5,
          position: 'relative',
        }}
      >
        <Typography variant="body1">{message.content}</Typography>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mt: 0.5,
            color: isOwnMessage ? 'rgba(255,255,255,0.7)' : 'text.secondary',
          }}
        >
          {format(new Date(message.createdAt), 'MMM d, h:mm a')}
          {message.readAt && isOwnMessage && (
            <Tooltip title={`Read at ${format(new Date(message.readAt), 'MMM d, h:mm a')}`}>
              <Box
                component="span"
                sx={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: 'success.main',
                  ml: 1,
                }}
              />
            </Tooltip>
          )}
        </Typography>
        {message.attachments && message.attachments.length > 0 && (
          <Box sx={{ mt: 1 }}>
            {message.attachments.map((attachment: { id: string; filename: string; url: string; size: number }) => (
              <Box
                key={attachment.id}
                component="a"
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  display: 'block',
                  bgcolor: 'rgba(0,0,0,0.05)',
                  borderRadius: 1,
                  p: 1,
                  mb: 1,
                  textDecoration: 'none',
                  color: 'inherit',
                  '&:hover': {
                    bgcolor: 'rgba(0,0,0,0.1)',
                  },
                }}
              >
                <Typography variant="body2">
                  {attachment.filename} ({(attachment.size / 1024).toFixed(1)} KB)
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}; 