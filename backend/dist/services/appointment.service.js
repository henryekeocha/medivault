import { AppError } from '../utils/appError.js';
import { prisma } from '../lib/prisma.js';
// Constants
const DEFAULT_WORKING_HOURS = {
    start: 9, // 9 AM
    end: 17, // 5 PM
    slotDuration: 30 // 30 minutes
};
export class AppointmentService {
    wsService;
    notificationService;
    emailService;
    constructor(wsService, notificationService, emailService) {
        this.wsService = wsService;
        this.notificationService = notificationService;
        this.emailService = emailService;
    }
    async createAppointment(data) {
        const { datetime, patientId, doctorId, notes, imageId } = data;
        // Verify patient exists
        const patient = await prisma.user.findFirst({
            where: {
                id: patientId,
                role: 'PATIENT'
            }
        });
        if (!patient) {
            throw new AppError('Patient not found', 404);
        }
        // Verify doctor exists
        const doctor = await prisma.user.findFirst({
            where: {
                id: doctorId,
                role: 'PROVIDER'
            }
        });
        if (!doctor) {
            throw new AppError('Provider not found', 404);
        }
        // Check if the slot is available
        const isAvailable = await this.checkSlotAvailability(doctorId, datetime);
        if (!isAvailable) {
            throw new AppError('Selected time slot is not available', 400);
        }
        // Create appointment
        const appointment = await prisma.appointment.create({
            data: {
                startTime: datetime,
                endTime: new Date(datetime.getTime() + DEFAULT_WORKING_HOURS.slotDuration * 60000),
                patientId,
                doctorId,
                notes,
                imageId,
                status: 'SCHEDULED'
            },
            include: {
                patient: true,
                doctor: true
            }
        });
        // Send notifications
        await Promise.all([
            this.notificationService.sendAppointmentNotification(appointment),
            this.wsService.notifyAppointmentCreated(appointment),
            this.emailService.sendAppointmentConfirmation(appointment)
        ]);
        return appointment;
    }
    async updateAppointment(id, userId, role, data) {
        const appointment = await prisma.appointment.findFirst({
            where: {
                id,
                OR: [
                    { patientId: userId },
                    { doctorId: userId }
                ]
            },
            include: {
                patient: true,
                doctor: true
            }
        });
        if (!appointment) {
            throw new AppError('Appointment not found', 404);
        }
        // Check if the new time slot is available (if datetime is being updated)
        if (data.datetime && data.datetime !== appointment.startTime) {
            const isAvailable = await this.checkSlotAvailability(appointment.doctorId, data.datetime, appointment.id);
            if (!isAvailable) {
                throw new AppError('Selected time slot is not available', 400);
            }
        }
        // Update appointment
        const updatedAppointment = await prisma.appointment.update({
            where: { id },
            data: {
                ...data,
                endTime: data.datetime
                    ? new Date(data.datetime.getTime() + DEFAULT_WORKING_HOURS.slotDuration * 60000)
                    : appointment.endTime
            },
            include: {
                patient: true,
                doctor: true
            }
        });
        // Handle notifications for status changes
        if (data.status && data.status !== appointment.status) {
            await this.handleStatusChangeNotifications(updatedAppointment, data.status);
        }
        return updatedAppointment;
    }
    async getAppointments(options) {
        const { userId, role, status, startDate, endDate, page = 1, limit = 10 } = options;
        const where = {
            ...(role === 'PATIENT' ? { patientId: userId } : {}),
            ...(role === 'PROVIDER' ? { doctorId: userId } : {}),
            ...(status ? { status: status } : {}),
            ...(startDate && endDate ? {
                startTime: {
                    gte: startDate,
                    lte: endDate
                }
            } : {})
        };
        const [appointments, count] = await Promise.all([
            prisma.appointment.findMany({
                where,
                include: {
                    patient: true,
                    doctor: true
                },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: {
                    startTime: 'desc'
                }
            }),
            prisma.appointment.count({ where })
        ]);
        return [appointments, count];
    }
    async getProviderAvailability(providerId, startDate, endDate) {
        // Verify provider exists
        const provider = await prisma.user.findFirst({
            where: {
                id: providerId,
                role: 'PROVIDER'
            }
        });
        if (!provider) {
            throw new AppError('Provider not found', 404);
        }
        // Get existing appointments
        const existingAppointments = await prisma.appointment.findMany({
            where: {
                doctorId: providerId,
                startTime: {
                    gte: startDate,
                    lte: endDate
                },
                status: {
                    not: 'CANCELLED'
                }
            }
        });
        // Generate available time slots
        const availableSlots = this.generateAvailableTimeSlots(startDate, endDate, existingAppointments, DEFAULT_WORKING_HOURS);
        return {
            providerId,
            availableSlots,
            timezone: 'UTC' // TODO: Get from provider settings
        };
    }
    async checkSlotAvailability(doctorId, datetime, excludeAppointmentId) {
        const slotStart = datetime;
        const slotEnd = new Date(datetime.getTime() + DEFAULT_WORKING_HOURS.slotDuration * 60000);
        const conflictingAppointment = await prisma.appointment.findFirst({
            where: {
                id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
                doctorId,
                status: { not: 'CANCELLED' },
                OR: [
                    {
                        AND: [
                            { startTime: { lte: slotStart } },
                            { endTime: { gt: slotStart } }
                        ]
                    },
                    {
                        AND: [
                            { startTime: { lt: slotEnd } },
                            { endTime: { gte: slotEnd } }
                        ]
                    }
                ]
            }
        });
        return !conflictingAppointment;
    }
    async handleStatusChangeNotifications(appointment, newStatus) {
        // Create a type adapter for compatibility with email and notification services
        // This handles the difference between types/models.AppointmentWithUsers and the service-specific types
        const adaptAppointment = (apt) => {
            // Make sure all required fields are present, adding default values for missing fields
            return {
                ...apt,
                patient: {
                    ...apt.patient,
                    // Add missing properties with default values
                    updatedAt: apt.patient.createdAt || new Date(),
                    lastLoginAt: null,
                    lastLoginIp: null
                },
                doctor: {
                    ...apt.doctor,
                    // Add missing properties with default values
                    updatedAt: apt.doctor.createdAt || new Date(),
                    lastLoginAt: null,
                    lastLoginIp: null
                }
            };
        };
        // Send notifications based on status change
        switch (newStatus) {
            case 'COMPLETED':
                await Promise.all([
                    this.notificationService.sendAppointmentCompleted(adaptAppointment(appointment)),
                    this.emailService.sendAppointmentCompletedEmail(adaptAppointment(appointment))
                ]);
                break;
            case 'CANCELLED':
                await Promise.all([
                    this.notificationService.sendAppointmentCancelled(adaptAppointment(appointment)),
                    this.emailService.sendAppointmentCancelledEmail(adaptAppointment(appointment))
                ]);
                break;
            case 'NO_SHOW':
                await Promise.all([
                    this.notificationService.sendAppointmentNoShow(adaptAppointment(appointment)),
                    this.emailService.sendAppointmentNoShowEmail(adaptAppointment(appointment))
                ]);
                break;
        }
        // Notify via WebSocket
        await this.wsService.notifyAppointmentUpdated(appointment);
    }
    generateAvailableTimeSlots(startDate, endDate, existingAppointments, workingHours) {
        const slots = [];
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            // Skip weekends
            if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
                // Generate slots for the day
                for (let hour = workingHours.start; hour < workingHours.end; hour += workingHours.slotDuration / 60) {
                    const slotTime = new Date(currentDate);
                    slotTime.setHours(Math.floor(hour));
                    slotTime.setMinutes((hour % 1) * 60);
                    slotTime.setSeconds(0);
                    slotTime.setMilliseconds(0);
                    // Check if slot conflicts with existing appointments
                    const isConflicting = existingAppointments.some(appointment => {
                        const appointmentStart = new Date(appointment.startTime);
                        const appointmentEnd = new Date(appointment.endTime);
                        return slotTime >= appointmentStart && slotTime < appointmentEnd;
                    });
                    if (!isConflicting) {
                        slots.push(slotTime);
                    }
                }
            }
            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return slots;
    }
}
//# sourceMappingURL=appointment.service.js.map