import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/appError.js';
const prisma = new PrismaClient();
export const getHealthMetrics = async (req, res) => {
    try {
        const userId = req.user.id;
        const metrics = await prisma.healthMetric.findMany({
            where: {
                OR: [
                    { patientId: userId },
                    { providerId: userId },
                ],
            },
            orderBy: {
                timestamp: 'desc',
            },
        });
        res.json({ data: metrics });
    }
    catch (error) {
        throw new AppError('Error fetching health metrics', 500);
    }
};
export const getHealthMetric = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const metric = await prisma.healthMetric.findFirst({
            where: {
                id,
                OR: [
                    { patientId: userId },
                    { providerId: userId },
                ],
            },
        });
        if (!metric) {
            throw new AppError('Health metric not found', 404);
        }
        res.json({ data: metric });
    }
    catch (error) {
        if (error instanceof AppError)
            throw error;
        throw new AppError('Error fetching health metric', 500);
    }
};
export const createHealthMetric = async (req, res) => {
    try {
        const { type, value, unit, notes, metadata, patientId } = req.body;
        const providerId = req.user.id;
        const metric = await prisma.healthMetric.create({
            data: {
                type,
                value,
                unit,
                notes,
                metadata,
                patientId,
                providerId,
                timestamp: new Date(),
            },
        });
        res.status(201).json({ data: metric });
    }
    catch (error) {
        throw new AppError('Error creating health metric', 500);
    }
};
export const updateHealthMetric = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { type, value, unit, notes, metadata } = req.body;
        const existingMetric = await prisma.healthMetric.findFirst({
            where: {
                id,
                OR: [
                    { patientId: userId },
                    { providerId: userId },
                ],
            },
        });
        if (!existingMetric) {
            throw new AppError('Health metric not found', 404);
        }
        const updatedMetric = await prisma.healthMetric.update({
            where: {
                id,
            },
            data: {
                type,
                value,
                unit,
                notes,
                metadata,
            },
        });
        res.json({ data: updatedMetric });
    }
    catch (error) {
        if (error instanceof AppError)
            throw error;
        throw new AppError('Error updating health metric', 500);
    }
};
export const deleteHealthMetric = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const metric = await prisma.healthMetric.findFirst({
            where: {
                id,
                OR: [
                    { patientId: userId },
                    { providerId: userId },
                ],
            },
        });
        if (!metric) {
            throw new AppError('Health metric not found', 404);
        }
        await prisma.healthMetric.delete({
            where: {
                id,
            },
        });
        res.json({ message: 'Health metric deleted successfully' });
    }
    catch (error) {
        if (error instanceof AppError)
            throw error;
        throw new AppError('Error deleting health metric', 500);
    }
};
//# sourceMappingURL=health-metric.controller.js.map