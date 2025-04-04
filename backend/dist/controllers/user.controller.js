import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/appError.js';
import { hash } from 'bcrypt';
import { prisma } from '../lib/prisma.js';
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
        const { username, email, password, role } = req.body;
        const hashedPassword = await hash(password, 12);
        const user = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
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
        const { password, ...updateData } = req.body;
        const data = { ...updateData };
        if (password) {
            data.password = await hash(password, 12);
        }
        const user = await prisma.user.update({
            where: { id: req.params.id },
            data,
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
                twoFactorEnabled: true
            }
        });
        if (!user) {
            throw new AppError('User not found', 404);
        }
        res.status(200).json({
            status: 'success',
            data: { user }
        });
    });
    updateProfile = catchAsync(async (req, res) => {
        const { username, email } = req.body;
        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: {
                username,
                email
            },
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
}
export const userController = new UserController();
//# sourceMappingURL=user.controller.js.map