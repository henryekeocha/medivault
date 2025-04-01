import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/appError.js';
import prisma from '../lib/prisma.js';
class UserController {
    getAllUsers = catchAsync(async (req, res) => {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true
            }
        });
        res.status(200).json({
            status: 'success',
            data: users
        });
    });
    getUser = catchAsync(async (req, res) => {
        const user = await prisma.user.findUnique({
            where: { id: req.params.id },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true
            }
        });
        if (!user) {
            throw new AppError('User not found', 404);
        }
        res.status(200).json({
            status: 'success',
            data: user
        });
    });
    createUser = catchAsync(async (req, res) => {
        const { username, email, role, authId } = req.body;
        if (!authId) {
            throw new AppError('authId is required', 400);
        }
        const user = await prisma.user.create({
            data: {
                username,
                email,
                authId,
                role: role,
                name: username, // Using username as default name
                isActive: true
            },
            select: {
                id: true,
                username: true,
                email: true,
                role: true
            }
        });
        res.status(201).json({
            status: 'success',
            data: user
        });
    });
    updateUser = catchAsync(async (req, res) => {
        const { password, authId, ...updateData } = req.body;
        // Don't allow updating authId through this endpoint
        if (authId) {
            throw new AppError('Cannot update authId', 400);
        }
        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: updateData,
            select: {
                id: true,
                username: true,
                email: true,
                role: true
            }
        });
        res.status(200).json({
            status: 'success',
            data: user
        });
    });
    deleteUser = catchAsync(async (req, res) => {
        await prisma.user.delete({
            where: { id: req.params.id }
        });
        res.status(204).json({
            status: 'success',
            data: null
        });
    });
    getProfile = catchAsync(async (req, res) => {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true
            }
        });
        if (!user) {
            throw new AppError('User not found', 404);
        }
        res.status(200).json({
            status: 'success',
            data: user
        });
    });
    updateProfile = catchAsync(async (req, res) => {
        try {
            // Extract phoneNumber from request body, but don't try to save it to the database
            // phoneNumber is stored in Clerk's user metadata, not in our database
            const { password, authId, role, phoneNumber, ...updateData } = req.body;
            // Don't allow updating authId through this endpoint
            if (authId) {
                throw new AppError('Cannot update authId', 400);
            }
            // Don't allow updating role through this endpoint
            if (role) {
                throw new AppError('Cannot update role through profile endpoint', 400);
            }
            // Get the user schema to validate only allowed fields are updated
            const validUserFields = [
                'username', 'email', 'name', 'isActive', 'emailVerified',
                'image', 'specialty', 'institution'
            ];
            // Filter out any fields that aren't in our valid fields list
            const sanitizedUpdateData = {};
            for (const key of Object.keys(updateData)) {
                if (validUserFields.includes(key)) {
                    sanitizedUpdateData[key] = updateData[key];
                }
            }
            console.log('Updating user profile with data:', JSON.stringify(sanitizedUpdateData));
            // Update the user with only the valid fields
            const user = await prisma.user.update({
                where: { id: req.user.id },
                data: sanitizedUpdateData,
                select: {
                    id: true,
                    username: true,
                    email: true,
                    name: true,
                    role: true
                }
            });
            // Note about phoneNumber handling
            if (phoneNumber !== undefined) {
                console.log('Note: phoneNumber is stored in Clerk metadata, not in the database');
            }
            res.status(200).json({
                status: 'success',
                data: {
                    ...user,
                    // If phoneNumber was sent, include it in the response for consistency
                    // even though it's not stored in our database
                    ...(phoneNumber !== undefined && { phoneNumber })
                }
            });
        }
        catch (error) { // Type the error as any to access properties
            console.error('Error updating user profile:', error);
            // If it's already an AppError, just throw it
            if (error instanceof AppError) {
                throw error;
            }
            // For database errors, provide more helpful messages
            if (error.code === 'P2002') {
                throw new AppError(`Unique constraint failed on field: ${error.meta?.target}`, 400);
            }
            else if (error.code === 'P2025') {
                throw new AppError('User not found', 404);
            }
            else if (error.code && typeof error.code === 'string' && error.code.startsWith('P2')) {
                throw new AppError(`Database error: ${error.message}`, 400);
            }
            // Generic server error for unexpected issues
            throw new AppError('Failed to update profile. Please try again.', 500);
        }
    });
}
export const userController = new UserController();
//# sourceMappingURL=user.controller.js.map