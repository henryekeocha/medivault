import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/appError.js';
import { prisma } from '../lib/prisma.js';
import { encryptData, decryptData } from '../middleware/encryption.js';
import { AuthenticatedRequest } from '../types/auth.js';

// Send message
export const sendMessage = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { recipientId } = req.params;
  const recipient = await prisma.user.findUnique({
    where: { id: recipientId }
  });

  if (!recipient) {
    throw new AppError('Recipient not found', 404);
  }

  const { iv, authTag, encryptedData } = req.body;
  const decryptedData = decryptData(encryptedData, iv, authTag);
  
  const message = await prisma.message.create({
    data: {
      ...decryptedData,
      senderId: req.user.id,
      recipientId
    }
  });

  res.status(201).json({
    status: 'success',
    data: message
  });
});

// Get all messages for current user
export const getMessages = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: req.user.id },
        { recipientId: req.user.id },
      ]
    },
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          email: true,
        }
      },
      recipient: {
        select: {
          id: true,
          username: true,
          email: true,
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  res.status(200).json({
    status: 'success',
    data: {
      messages,
    },
  });
});

// Get single message
export const getMessage = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const message = await prisma.message.findUnique({
    where: { id }
  });

  if (!message) {
    throw new AppError('Message not found', 404);
  }

  // Only allow sender and recipient to view the message
  if (message.senderId !== req.user.id && message.recipientId !== req.user.id) {
    throw new AppError('Not authorized to view this message', 403);
  }

  res.status(200).json({
    status: 'success',
    data: message
  });
});

// Update message
export const updateMessage = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const message = await prisma.message.findUnique({
    where: { id }
  });

  if (!message) {
    throw new AppError('Message not found', 404);
  }

  // Only allow sender to update the message
  if (message.senderId !== req.user.id) {
    throw new AppError('Not authorized to update this message', 403);
  }

  const { iv, authTag, encryptedData } = req.body;
  const decryptedData = decryptData(encryptedData, iv, authTag);
  
  const updatedMessage = await prisma.message.update({
    where: { id },
    data: decryptedData
  });

  res.status(200).json({
    status: 'success',
    data: updatedMessage
  });
});

// Delete message
export const deleteMessage = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const message = await prisma.message.findUnique({
    where: { id }
  });

  if (!message) {
    throw new AppError('Message not found', 404);
  }

  // Only allow sender to delete the message
  if (message.senderId !== req.user.id) {
    throw new AppError('Not authorized to delete this message', 403);
  }

  await prisma.message.delete({
    where: { id }
  });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Get conversations
export const getConversations = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user.id;

  // Get all messages for the current user
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: userId },
        { recipientId: userId }
      ]
    },
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          email: true
        }
      },
      recipient: {
        select: {
          id: true,
          username: true,
          email: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Group messages by conversation
  const conversations = messages.reduce((acc: any[], message) => {
    const participantId = message.senderId === userId ? message.recipientId : message.senderId;
    const participant = message.senderId === userId ? message.recipient : message.sender;

    // Check if conversation already exists
    const existingConversation = acc.find(c => c.participantId === participantId);
    
    if (!existingConversation) {
      acc.push({
        participantId,
        participantName: participant.username,
        participantEmail: participant.email,
        lastMessage: message.content,
        lastMessageAt: message.createdAt
      });
    }

    return acc;
  }, []);

  res.status(200).json({
    status: 'success',
    data: {
      conversations,
    },
  });
}); 