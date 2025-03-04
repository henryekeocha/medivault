import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/appError.js';
import { prisma } from '../lib/prisma.js';
import { decryptData } from '../middleware/encryption.js';
// Send message
export const sendMessage = catchAsync(async (req, res) => {
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
export const getMessages = catchAsync(async (req, res) => {
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
export const getMessage = catchAsync(async (req, res) => {
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
export const updateMessage = catchAsync(async (req, res) => {
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
export const deleteMessage = catchAsync(async (req, res) => {
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
export const getConversations = catchAsync(async (req, res) => {
    const userId = req.user.id;
    // Using Prisma's raw query capabilities for complex query
    const conversations = await prisma.$queryRaw `
    SELECT DISTINCT 
      CASE 
        WHEN m."senderId" = ${userId} THEN m."recipientId" 
        ELSE m."senderId" 
      END as "participantId",
      u.username as "participantName",
      u.email as "participantEmail",
      (
        SELECT m2.content 
        FROM "Message" m2 
        WHERE (m2."senderId" = ${userId} AND m2."recipientId" = "participantId") 
           OR (m2."senderId" = "participantId" AND m2."recipientId" = ${userId}) 
        ORDER BY m2."createdAt" DESC 
        LIMIT 1
      ) as "lastMessage",
      (
        SELECT m2."createdAt" 
        FROM "Message" m2 
        WHERE (m2."senderId" = ${userId} AND m2."recipientId" = "participantId") 
           OR (m2."senderId" = "participantId" AND m2."recipientId" = ${userId}) 
        ORDER BY m2."createdAt" DESC 
        LIMIT 1
      ) as "lastMessageAt"
    FROM "Message" m
    INNER JOIN "User" u ON u.id = 
      CASE 
        WHEN m."senderId" = ${userId} THEN m."recipientId" 
        ELSE m."senderId" 
      END
    WHERE m."senderId" = ${userId} OR m."recipientId" = ${userId}
    ORDER BY "lastMessageAt" DESC
  `;
    res.status(200).json({
        status: 'success',
        data: {
            conversations,
        },
    });
});
//# sourceMappingURL=message.controller.js.map