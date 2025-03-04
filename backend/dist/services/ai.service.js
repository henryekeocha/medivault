import OpenAI from 'openai';
import { AppError } from '../utils/appError.js';
import { prisma } from '../lib/prisma.js';
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});
export class AIService {
    async processMessage(message, userId, sessionId) {
        try {
            // Get or create chat session
            const session = await this.getOrCreateSession(userId, sessionId);
            // Get user role
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { role: true }
            });
            if (!user) {
                throw new AppError('User not found', 404);
            }
            // Get previous messages for context
            const previousMessages = await prisma.chatMessage.findMany({
                where: { chatSessionId: session.id },
                orderBy: { createdAt: 'desc' },
                take: 5
            });
            // Process the message
            const response = await this.processAIResponse(message, {
                userRole: user.role,
                context: previousMessages.map(msg => msg.content).reverse()
            });
            // Save the user's message
            await prisma.chatMessage.create({
                data: {
                    chatSessionId: session.id,
                    content: message,
                    role: 'USER'
                }
            });
            // Save the AI's response
            await prisma.chatMessage.create({
                data: {
                    chatSessionId: session.id,
                    content: response.message,
                    role: 'ASSISTANT'
                }
            });
            return response;
        }
        catch (error) {
            console.error('AI Service Error:', error);
            throw error instanceof AppError ? error : new AppError('AI service error', 500);
        }
    }
    async getOrCreateSession(userId, sessionId) {
        if (sessionId) {
            const existingSession = await prisma.chatSession.findUnique({
                where: { id: sessionId }
            });
            if (existingSession && existingSession.userId === userId) {
                return existingSession;
            }
        }
        // Create new session
        return await prisma.chatSession.create({
            data: {
                userId,
                title: `Chat Session ${new Date().toLocaleString()}`
            }
        });
    }
    async processAIResponse(message, metadata) {
        try {
            // Prepare context from previous interactions
            const contextString = metadata.context
                .slice(-5) // Use last 5 interactions for context
                .join('\n');
            // Create system message based on user role
            const systemMessage = this.getSystemMessageForRole(metadata.userRole);
            const completion = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    { role: "system", content: systemMessage },
                    { role: "user", content: `Previous context:\n${contextString}\n\nCurrent message: ${message}` }
                ],
                temperature: 0.7,
                max_tokens: 500
            });
            const response = completion.choices[0].message.content || '';
            const confidence = completion.choices[0].finish_reason === 'stop' ? 1.0 : 0.8;
            // Extract medical context if present
            const context = this.extractMedicalContext(response);
            return {
                message: response || 'I apologize, but I could not process your request.',
                confidence,
                context
            };
        }
        catch (error) {
            console.error('AI Processing Error:', error);
            throw new AppError('Failed to process message with AI service', 500);
        }
    }
    getSystemMessageForRole(role) {
        const baseMessage = "You are a HIPAA-compliant medical assistant AI. Always maintain patient confidentiality and privacy.";
        switch (role) {
            case 'PROVIDER':
                return `${baseMessage} You are assisting a healthcare provider. Provide detailed medical information and professional terminology when appropriate.`;
            case 'PATIENT':
                return `${baseMessage} You are assisting a patient. Use clear, simple language and avoid complex medical terminology unless specifically asked.`;
            case 'ADMIN':
                return `${baseMessage} You are assisting an administrator. Focus on system and operational aspects while maintaining medical data privacy.`;
            default:
                return baseMessage;
        }
    }
    extractMedicalContext(response) {
        // Extract potential medical terms, conditions, or topics from the response
        const medicalTerms = this.extractMedicalTerms(response);
        const conditions = this.extractConditions(response);
        const topics = this.extractTopics(response);
        return {
            medicalTerms,
            conditions,
            topics,
            timestamp: new Date().toISOString()
        };
    }
    extractMedicalTerms(text) {
        // Implement medical term extraction logic
        // This is a placeholder - in production, use a medical terminology database
        const commonTerms = [
            'diagnosis', 'treatment', 'symptoms', 'prescription',
            'examination', 'test results', 'scan', 'mri', 'ct',
            'x-ray', 'medication', 'dosage'
        ];
        return commonTerms.filter(term => text.toLowerCase().includes(term.toLowerCase()));
    }
    extractConditions(text) {
        // Implement condition extraction logic
        // This is a placeholder - in production, use a medical conditions database
        return [];
    }
    extractTopics(text) {
        // Implement topic extraction logic
        // This is a placeholder - in production, use NLP for topic extraction
        return text
            .split('.')
            .map(sentence => sentence.trim())
            .filter(sentence => sentence.length > 0)
            .map(sentence => {
            const words = sentence.split(' ');
            return words.length > 3 ? words.slice(0, 3).join(' ') + '...' : sentence;
        });
    }
}
//# sourceMappingURL=ai.service.js.map