import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { AppError } from '../utils/appError.js';
import { encryptData, decryptData } from '../middleware/encryption.js';
import { Role } from '@prisma/client';

// Define missing enums
enum ChatMessageType {
  USER = 'USER',
  AI = 'AI'
}

enum ChatMessageStatus {
  PENDING = 'PENDING',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED'
}

interface SessionMetadata {
  userRole: Role;
  context: string[];
}

// Define authenticated request type
interface AuthUser {
  id: string;
  role: Role;
}

interface AuthenticatedRequest extends Omit<Request, 'user'> {
  user: AuthUser;
}

// Mock the AI service function
const processAIResponse = async (message: string, context: any[]): Promise<string> => {
  // This is a placeholder. Implement the actual AI response processing logic
  return `AI response to: ${message}`;
};

class ChatbotController {
  async startChatSession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const session = await prisma.chatSession.create({
      data: {
        userId: req.user.id,
        title: 'New Chat Session',
        // Store the metadata in a compatible format
        // Note: Make sure your Prisma schema has the metadata field defined as Json
        // If not present, consider storing this in a separate table or modifying the schema
      }
    });

    res.status(201).json({
      status: 'success',
      data: {
        sessionId: session.id,
        createdAt: session.createdAt,
        title: session.title
      }
    });
  }

  async sendMessage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const { sessionId, content, encrypted, iv, authTag } = req.body;

    // Decrypt content if needed
    const decryptedContent = encrypted ? decryptData(content, iv, authTag) : content;

    // Create user message
    const userMessage = await prisma.chatMessage.create({
      data: {
        // Use the correct field name for the relation
        chatSessionId: sessionId,
        content: decryptedContent,
        role: ChatMessageType.USER, // Use role instead of type
        // Remove status or add it to schema if needed
        createdAt: new Date()
      }
    });

    // Get session with context
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 10 // Get last 10 messages for context
        }
      }
    });

    if (!session) {
      throw new AppError('Chat session not found', 404);
    }

    // Process AI response
    const aiResponse = await processAIResponse(decryptedContent, session.messages);

    // Create AI message
    const aiMessage = await prisma.chatMessage.create({
      data: {
        chatSessionId: sessionId,
        content: aiResponse,
        role: ChatMessageType.AI, // Use role instead of type
        // Remove status or add it to schema if needed
        createdAt: new Date()
      }
    });

    // Update session title based on first message if no title yet
    if (session.title === null || session.title === 'New Chat Session') {
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: {
          title: decryptedContent.substring(0, 50) + (decryptedContent.length > 50 ? '...' : ''),
          updatedAt: new Date()
        }
      });
    }

    // Encrypt response if needed
    const responseData = encrypted ? {
      userMessage: {
        ...userMessage,
        content: encryptData(userMessage.content)
      },
      aiMessage: {
        ...aiMessage,
        content: encryptData(aiMessage.content)
      }
    } : {
      userMessage,
      aiMessage
    };

    res.status(200).json({
      status: 'success',
      data: responseData
    });
  }

  async getChatHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const { sessionId } = req.params;
    const { encrypted, iv, authTag } = req.query;

    const messages = await prisma.chatMessage.findMany({
      where: { 
        chatSessionId: sessionId 
      },
      orderBy: { createdAt: 'asc' }
    });

    // Encrypt messages if requested
    const processedMessages = encrypted ? messages.map(msg => ({
      ...msg,
      content: encryptData(msg.content)
    })) : messages;

    res.status(200).json({
      status: 'success',
      data: processedMessages
    });
  }

  async endChatSession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;

      const session = await prisma.chatSession.findUnique({
        where: { id: sessionId },
        include: {
          messages: true
        }
      });

      if (!session) {
        return next(new AppError('Chat session not found', 404));
      }

      // Since isActive doesn't exist in the schema, we can mark it as "ended" by updating the title
      const updatedSession = await prisma.chatSession.update({
        where: { id: sessionId },
        data: {
          title: `[Ended] ${session.title || 'Chat Session'}`,
          updatedAt: new Date()
        }
      });

      res.status(200).json({
        status: 'success',
        data: {
          sessionId: updatedSession.id,
          updatedAt: updatedSession.updatedAt,
          title: updatedSession.title,
          ended: true
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

export const chatbotController = new ChatbotController(); 