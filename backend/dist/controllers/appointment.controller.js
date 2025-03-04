import { AppError } from '../utils/appError.js';
import { PrismaClient, AppointmentStatus } from '@prisma/client';
import { EmailService } from '../services/email.service.js';
const prisma = new PrismaClient();
const emailService = new EmailService();
export const createAppointment = async (req, res, next) => {
    try {
        const { startTime, endTime, doctorId, patientId, notes, imageId } = req.body;
        // Validate required fields
        if (!startTime || !endTime || !doctorId || !patientId) {
            throw new AppError('Missing required fields', 400);
        }
        // Convert string dates to Date objects
        const appointmentStart = new Date(startTime);
        const appointmentEnd = new Date(endTime);
        // Validate appointment time
        if (appointmentStart >= appointmentEnd) {
            throw new AppError('End time must be after start time', 400);
        }
        // Check for overlapping appointments
        const overlappingAppointments = await prisma.appointment.findMany({
            where: {
                OR: [
                    {
                        doctorId,
                        startTime: {
                            lt: appointmentEnd,
                        },
                        endTime: {
                            gt: appointmentStart,
                        },
                    },
                    {
                        patientId,
                        startTime: {
                            lt: appointmentEnd,
                        },
                        endTime: {
                            gt: appointmentStart,
                        },
                    },
                ],
                status: {
                    notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED],
                },
            },
        });
        if (overlappingAppointments.length > 0) {
            throw new AppError('Time slot is not available', 409);
        }
        // Create appointment
        const appointment = await prisma.appointment.create({
            data: {
                startTime: appointmentStart,
                endTime: appointmentEnd,
                doctorId,
                patientId,
                notes: notes || null,
                imageId: imageId || null,
                status: AppointmentStatus.SCHEDULED,
            },
            include: {
                patient: true,
                doctor: true,
            },
        });
        // Send notifications
        if (req.notificationService) {
            await req.notificationService.sendAppointmentNotification(appointment);
        }
        else {
            console.warn('Notification service not available');
        }
        await emailService.sendAppointmentConfirmation(appointment);
        res.status(201).json({
            status: 'success',
            data: appointment,
        });
    }
    catch (error) {
        next(error);
    }
};
export const updateAppointment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { startTime, endTime, status, notes } = req.body;
        // Validate appointment exists
        const existingAppointment = await prisma.appointment.findUnique({
            where: { id },
            include: {
                patient: true,
                doctor: true,
            },
        });
        if (!existingAppointment) {
            throw new AppError('Appointment not found', 404);
        }
        // Check authorization
        if (req.user.id !== existingAppointment.patientId &&
            req.user.id !== existingAppointment.doctorId) {
            throw new AppError('Not authorized to update this appointment', 403);
        }
        // Prepare update data
        const updateData = {};
        if (startTime)
            updateData.startTime = new Date(startTime);
        if (endTime)
            updateData.endTime = new Date(endTime);
        if (status)
            updateData.status = status;
        if (notes !== undefined)
            updateData.notes = notes;
        // Update appointment
        const updatedAppointment = await prisma.appointment.update({
            where: { id },
            data: updateData,
            include: {
                patient: true,
                doctor: true,
            },
        });
        // Send notifications based on status
        if (status === AppointmentStatus.CANCELLED) {
            if (req.notificationService) {
                await req.notificationService.sendAppointmentCancelled(updatedAppointment);
            }
            else {
                console.warn('Notification service not available');
            }
            await emailService.sendAppointmentCancelledEmail(updatedAppointment);
        }
        else if (status === AppointmentStatus.COMPLETED) {
            if (req.notificationService) {
                await req.notificationService.sendAppointmentCompleted(updatedAppointment);
            }
            else {
                console.warn('Notification service not available');
            }
            await emailService.sendAppointmentConfirmation(updatedAppointment);
        }
        else {
            if (req.notificationService) {
                await req.notificationService.sendAppointmentNotification(updatedAppointment);
            }
            else {
                console.warn('Notification service not available');
            }
            await emailService.sendAppointmentConfirmation(updatedAppointment);
        }
        res.status(200).json({
            status: 'success',
            data: updatedAppointment,
        });
    }
    catch (error) {
        next(error);
    }
};
export const getAppointment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const appointment = await prisma.appointment.findUnique({
            where: { id },
            include: {
                patient: true,
                doctor: true,
            },
        });
        if (!appointment) {
            throw new AppError('Appointment not found', 404);
        }
        // Check authorization
        if (req.user.id !== appointment.patientId &&
            req.user.id !== appointment.doctorId) {
            throw new AppError('Not authorized to view this appointment', 403);
        }
        res.status(200).json({
            status: 'success',
            data: appointment,
        });
    }
    catch (error) {
        next(error);
    }
};
export const listAppointments = async (req, res, next) => {
    try {
        const { startDate, endDate, status } = req.query;
        // Build where clause
        const where = {
            OR: [
                { patientId: req.user.id },
                { doctorId: req.user.id },
            ],
        };
        if (startDate) {
            where.startTime = {
                gte: new Date(startDate),
            };
        }
        if (endDate) {
            where.endTime = {
                lte: new Date(endDate),
            };
        }
        if (status) {
            where.status = status;
        }
        const appointments = await prisma.appointment.findMany({
            where,
            include: {
                patient: true,
                doctor: true,
            },
            orderBy: {
                startTime: 'asc',
            },
        });
        res.status(200).json({
            status: 'success',
            data: appointments,
        });
    }
    catch (error) {
        next(error);
    }
};
export const cancelAppointment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const appointment = await prisma.appointment.findUnique({
            where: { id },
            include: {
                patient: true,
                doctor: true,
            },
        });
        if (!appointment) {
            throw new AppError('Appointment not found', 404);
        }
        // Check authorization
        if (req.user.id !== appointment.patientId &&
            req.user.id !== appointment.doctorId) {
            throw new AppError('Not authorized to cancel this appointment', 403);
        }
        // Update appointment status
        const updatedAppointment = await prisma.appointment.update({
            where: { id },
            data: {
                status: AppointmentStatus.CANCELLED,
            },
            include: {
                patient: true,
                doctor: true,
            },
        });
        // Send notifications
        if (req.notificationService) {
            await req.notificationService.sendAppointmentCancelled(updatedAppointment);
        }
        else {
            console.warn('Notification service not available');
        }
        await emailService.sendAppointmentCancelledEmail(updatedAppointment);
        res.status(200).json({
            status: 'success',
            data: updatedAppointment,
        });
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=appointment.controller.js.map