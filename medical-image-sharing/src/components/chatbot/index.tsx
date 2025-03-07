'use client';

import React, { useState } from 'react';
import { 
  Box,
  Button,
  Card,
  TextField,
  Typography,
  IconButton,
  useTheme,
} from '@mui/material';
import { 
  Close as CloseIcon,
  Send as SendIcon,
  Message as MessageIcon,
} from '@mui/icons-material';

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

export function Chatbot() {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! How can I assist you with MediVault today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);

    // Add user message
    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setInput("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();

      // Add assistant response
      setMessages(prev => [...prev, { role: "assistant", content: data.message }]);
    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: "I apologize, but I'm having trouble connecting right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = (message: Message, index: number) => {
    const isAssistant = message.role === 'assistant';
    
    return (
      <Box
        key={index}
        sx={{
          maxWidth: '80%',
          width: 'fit-content',
          p: 1.5,
          borderRadius: 2,
          mb: 1,
          bgcolor: isAssistant 
            ? isDarkMode 
              ? 'grey.800' 
              : 'grey.100' 
            : 'primary.main',
          color: isAssistant 
            ? isDarkMode 
              ? 'grey.100' 
              : 'text.primary' 
            : 'white',
          ml: isAssistant ? 0 : 'auto',
          boxShadow: theme.shadows[1],
          border: isAssistant && isDarkMode ? `1px solid ${theme.palette.divider}` : 'none',
        }}
      >
        <Typography variant="body1">
          {message.content}
        </Typography>
      </Box>
    );
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        sx={{
          position: 'fixed',
          bottom: { xs: 8, sm: 16 },
          right: { xs: 8, sm: 16 },
          minWidth: { xs: 40, sm: 48 },
          width: { xs: 40, sm: 48 },
          height: { xs: 40, sm: 48 },
          borderRadius: '50%',
        }}
        variant="contained"
      >
        <MessageIcon />
      </Button>

      <Card
        sx={{
          position: 'fixed',
          bottom: { xs: 8, sm: 16 },
          right: { xs: 8, sm: 16 },
          width: { xs: 'calc(100% - 16px)', sm: 350, md: 380 },
          maxWidth: '100%',
          height: { xs: 400, sm: 500 },
          display: 'flex',
          flexDirection: 'column',
          p: { xs: 1, sm: 2 },
          transform: isOpen ? 'translateY(0)' : 'translateY(120%)',
          opacity: isOpen ? 1 : 0,
          transition: 'all 0.2s ease-in-out',
          zIndex: 50,
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">MediVault AI Assistant</Typography>
          <IconButton onClick={() => setIsOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ 
          flexGrow: 1, 
          overflowY: 'auto',
          mb: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          px: 1,
          bgcolor: 'background.default',
          borderRadius: 1,
        }}>
          {messages.map(renderMessage)}
        </Box>

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            display: 'flex',
            gap: 1,
          }}
        >
          <TextField
            value={input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
            placeholder="Ask about MediVault..."
            fullWidth
            disabled={isLoading}
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: theme.palette.divider,
                },
                '&:hover fieldset': {
                  borderColor: 'primary.main',
                },
              },
            }}
          />
          <IconButton 
            type="submit" 
            disabled={isLoading}
            color="primary"
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Card>
    </>
  );
} 