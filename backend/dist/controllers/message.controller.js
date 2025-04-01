import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/appError.js';
import prisma from '../lib/prisma.js';
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
    const conversations = messages.reduce((acc, message) => {
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
// Template categories for message templates
const templateCategories = [
    { id: 'general', name: 'General' },
    { id: 'appointment', name: 'Appointment' },
    { id: 'results', name: 'Test Results' },
    { id: 'followup', name: 'Follow-up Care' },
    { id: 'prescription', name: 'Prescription' },
    { id: 'billing', name: 'Billing & Insurance' },
];
// Initial message templates
const messageTemplates = [
    {
        id: 'template-1',
        title: 'Appointment Reminder',
        content: 'This is a reminder that you have an appointment scheduled for [DATE] at [TIME]. Please let us know if you need to reschedule.',
        category: 'appointment',
        isDefault: true,
    },
    {
        id: 'template-2',
        title: 'Results Ready',
        content: 'Your test results are now available. Please schedule a follow-up appointment to discuss the findings.',
        category: 'results',
        isDefault: true,
    },
    {
        id: 'template-3',
        title: 'Prescription Refill',
        content: 'Your prescription refill has been processed and is ready for pickup at your pharmacy.',
        category: 'prescription',
        isDefault: true,
    },
    {
        id: 'template-4',
        title: 'Follow-up Needed',
        content: 'Based on your recent imaging study, we recommend a follow-up appointment to discuss the results and next steps.',
        category: 'followup',
        isDefault: true,
    },
    {
        id: 'template-5',
        title: 'Additional Information Needed',
        content: 'We need some additional information about your symptoms before your appointment. Can you please provide more details?',
        category: 'general',
        isDefault: true,
    },
];
// Get message templates
export const getMessageTemplates = catchAsync(async (req, res) => {
    // In a real implementation, these would be fetched from the database
    // For now, we'll return the static templates
    res.status(200).json({
        status: 'success',
        data: messageTemplates
    });
});
// Get message template categories
export const getMessageTemplateCategories = catchAsync(async (req, res) => {
    // In a real implementation, these would be fetched from the database
    // For now, we'll return the static categories
    res.status(200).json({
        status: 'success',
        data: templateCategories
    });
});
//# sourceMappingURL=message.controller.js.map