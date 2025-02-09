import { Request, Response } from 'express';
import { AppDataSource } from '../config/database.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../middleware/errorHandler.js';
import { Message } from '../entities/Message.js';
import { User } from '../entities/User.js';

const messageRepository = AppDataSource.getRepository(Message);
const userRepository = AppDataSource.getRepository(User);

// Send message
export const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const { recipientId, content } = req.body;

  // Check if recipient exists
  const recipient = await userRepository.findOne({
    where: { id: parseInt(recipientId) }
  });

  if (!recipient) {
    throw new AppError('Recipient not found', 404);
  }

  const message = messageRepository.create({
    senderId: req.user!.id,
    recipientId: parseInt(recipientId),
    content,
  });

  await messageRepository.save(message);

  const savedMessage = await messageRepository.findOne({
    where: { id: message.id },
    relations: {
      sender: true,
      recipient: true,
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      sender: {
        id: true,
        username: true,
        email: true,
      },
      recipient: {
        id: true,
        username: true,
        email: true,
      },
    },
  });

  res.status(201).json({
    status: 'success',
    data: {
      message: savedMessage,
    },
  });
});

// Get all messages for current user
export const getMessages = catchAsync(async (req: Request, res: Response) => {
  const messages = await messageRepository.find({
    where: [
      { senderId: req.user!.id },
      { recipientId: req.user!.id },
    ],
    relations: {
      sender: true,
      recipient: true,
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      sender: {
        id: true,
        username: true,
        email: true,
      },
      recipient: {
        id: true,
        username: true,
        email: true,
      },
    },
    order: {
      createdAt: 'DESC',
    },
  });

  res.status(200).json({
    status: 'success',
    data: {
      messages,
    },
  });
});

// Get single message
export const getMessage = catchAsync(async (req: Request, res: Response) => {
  const message = await messageRepository.findOne({
    where: { id: parseInt(req.params.id) },
    relations: {
      sender: true,
      recipient: true,
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      sender: {
        id: true,
        username: true,
        email: true,
      },
      recipient: {
        id: true,
        username: true,
        email: true,
      },
    },
  });

  if (!message) {
    throw new AppError('Message not found', 404);
  }

  // Check if user is sender or recipient
  if (message.senderId !== req.user!.id && message.recipientId !== req.user!.id) {
    throw new AppError('Not authorized', 403);
  }

  res.status(200).json({
    status: 'success',
    data: {
      message,
    },
  });
});

// Update message
export const updateMessage = catchAsync(async (req: Request, res: Response) => {
  const { content } = req.body;
  const messageId = parseInt(req.params.id);

  const message = await messageRepository.findOne({
    where: { id: messageId },
  });

  if (!message) {
    throw new AppError('Message not found', 404);
  }

  // Check if user is sender
  if (message.senderId !== req.user!.id) {
    throw new AppError('Not authorized', 403);
  }

  message.content = content;
  message.isEdited = true;

  await messageRepository.save(message);

  const updatedMessage = await messageRepository.findOne({
    where: { id: messageId },
    relations: {
      sender: true,
      recipient: true,
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      isEdited: true,
      sender: {
        id: true,
        username: true,
        email: true,
      },
      recipient: {
        id: true,
        username: true,
        email: true,
      },
    },
  });

  res.status(200).json({
    status: 'success',
    data: {
      message: updatedMessage,
    },
  });
});

// Delete message
export const deleteMessage = catchAsync(async (req: Request, res: Response) => {
  const message = await messageRepository.findOne({
    where: { id: parseInt(req.params.id) },
  });

  if (!message) {
    throw new AppError('Message not found', 404);
  }

  // Check if user is sender
  if (message.senderId !== req.user!.id) {
    throw new AppError('Not authorized', 403);
  }

  await messageRepository.remove(message);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// Get conversations
export const getConversations = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  // Using TypeORM's QueryBuilder for complex query
  const conversations = await messageRepository
    .createQueryBuilder('message')
    .select([
      'DISTINCT CASE WHEN message.senderId = :userId THEN message.recipientId ELSE message.senderId END as participantId',
      'user.username as participantName',
      'user.email as participantEmail',
      '(SELECT m.content FROM message m WHERE (m.senderId = :userId AND m.recipientId = participantId) OR (m.senderId = participantId AND m.recipientId = :userId) ORDER BY m.createdAt DESC LIMIT 1) as lastMessage',
      '(SELECT m.createdAt FROM message m WHERE (m.senderId = :userId AND m.recipientId = participantId) OR (m.senderId = participantId AND m.recipientId = :userId) ORDER BY m.createdAt DESC LIMIT 1) as lastMessageAt'
    ])
    .innerJoin(
      User,
      'user',
      'user.id = CASE WHEN message.senderId = :userId THEN message.recipientId ELSE message.senderId END'
    )
    .where('message.senderId = :userId OR message.recipientId = :userId', { userId })
    .orderBy('lastMessageAt', 'DESC')
    .getRawMany();

  res.status(200).json({
    status: 'success',
    data: {
      conversations,
    },
  });
}); 