import { AppError } from '../utils/appError.js';
import { WebSocketService } from './websocket.service.js';
import { NotificationService } from './notification.service.js';
import { EmailService } from './email.service.js';
import prisma from '../lib/prisma.js';
import { Appointment, AppointmentStatus, Prisma, Role, User } from '@prisma/client';
import { AppointmentWithUsers } from '../types/models.js';

// Constants
const DEFAULT_WORKING_HOURS = {
  start: 9, // 9 AM
  end: 17, // 5 PM
  slotDuration: 30 // 30 minutes
};

interface CreateAppointmentDTO {
  datetime: Date;
  patientId: string;
  doctorId: string;
  notes?: string;
  imageId?: string;
}

interface UpdateAppointmentDTO {
  datetime?: Date;
  status?: AppointmentStatus;
  notes?: string;
  imageId?: string;
}

interface GetAppointmentsOptions {
  userId: string;
  role: Role;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

interface ProviderAvailability {
  providerId: string;
  availableSlots: Date[];
  timezone: string;
}

export class AppointmentService {
  constructor(
    private wsService: WebSocketService,
    private notificationService: NotificationService,
    private emailService: EmailService
  ) {}

  async createAppointment(data: CreateAppointmentDTO): Promise<Appointment> {
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
        datetime,
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

    // Create AppointmentWithUsers for notifications
    const appointmentWithUsers: AppointmentWithUsers = {
      id: appointment.id,
      startTime: appointment.datetime, // Map datetime to startTime for AppointmentWithUsers
      endTime: new Date(appointment.datetime.getTime() + DEFAULT_WORKING_HOURS.slotDuration * 60000),
      datetime: appointment.datetime, // Add datetime field for API compatibility
      status: appointment.status,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      notes: appointment.notes,
      imageId: appointment.imageId,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
      patient: appointment.patient,
      doctor: appointment.doctor
    };

    // Send notifications
    await Promise.all([
      this.notificationService.sendAppointmentNotification(appointmentWithUsers),
      this.wsService.notifyAppointmentCreated(appointmentWithUsers),
      this.emailService.sendAppointmentConfirmation(appointmentWithUsers)
    ]);

    return appointment;
  }

  async updateAppointment(
    id: string,
    userId: string,
    role: Role,
    data: UpdateAppointmentDTO
  ): Promise<Appointment> {
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
    if (data.datetime && data.datetime !== appointment.datetime) {
      const isAvailable = await this.checkSlotAvailability(
        appointment.doctorId,
        data.datetime,
        appointment.id
      );
      if (!isAvailable) {
        throw new AppError('Selected time slot is not available', 400);
      }
    }

    // Update appointment
    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        ...data
      },
      include: {
        patient: true,
        doctor: true
      }
    });

    // Handle notifications for status changes
    if (data.status && data.status !== appointment.status) {
      // Create AppointmentWithUsers for notifications
      const updatedAppointmentWithUsers: AppointmentWithUsers = {
        id: updatedAppointment.id,
        startTime: updatedAppointment.datetime,
        endTime: new Date(updatedAppointment.datetime.getTime() + DEFAULT_WORKING_HOURS.slotDuration * 60000),
        datetime: updatedAppointment.datetime, // Add datetime field for API compatibility
        status: updatedAppointment.status,
        patientId: updatedAppointment.patientId,
        doctorId: updatedAppointment.doctorId,
        notes: updatedAppointment.notes,
        imageId: updatedAppointment.imageId,
        createdAt: updatedAppointment.createdAt,
        updatedAt: updatedAppointment.updatedAt,
        patient: updatedAppointment.patient,
        doctor: updatedAppointment.doctor
      };
      
      await this.handleStatusChangeNotifications(updatedAppointmentWithUsers, data.status);
    }

    return updatedAppointment;
  }

  async getAppointments(options: GetAppointmentsOptions): Promise<[Appointment[], number]> {
    const {
      userId,
      role,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 10
    } = options;

    const where = {
      ...(role === 'PATIENT' ? { patientId: userId } : {}),
      ...(role === 'PROVIDER' ? { doctorId: userId } : {}),
      ...(status ? { status: status as AppointmentStatus } : {}),
      ...(startDate && endDate ? {
        datetime: {
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
          datetime: 'desc'
        }
      }),
      prisma.appointment.count({ where })
    ]);

    return [appointments, count];
  }

  async getProviderAvailability(
    providerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ProviderAvailability> {
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
        datetime: {
          gte: startDate,
          lte: endDate
        },
        status: {
          not: 'CANCELLED'
        }
      }
    });

    // Generate available time slots
    const availableSlots = this.generateAvailableTimeSlots(
      startDate,
      endDate,
      existingAppointments,
      DEFAULT_WORKING_HOURS
    );

    return {
      providerId,
      availableSlots,
      timezone: 'UTC' // TODO: Get from provider settings
    };
  }

  private async checkSlotAvailability(
    doctorId: string,
    datetime: Date,
    excludeAppointmentId?: string
  ): Promise<boolean> {
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
              { datetime: { lte: slotStart } },
              { datetime: { gt: new Date(slotStart.getTime() - DEFAULT_WORKING_HOURS.slotDuration * 60000) } }
            ]
          },
          {
            AND: [
              { datetime: { lt: slotEnd } },
              { datetime: { gte: new Date(slotEnd.getTime() - DEFAULT_WORKING_HOURS.slotDuration * 60000) } }
            ]
          }
        ]
      }
    });

    return !conflictingAppointment;
  }

  private async handleStatusChangeNotifications( 
    appointment: AppointmentWithUsers,
    newStatus: AppointmentStatus
  ): Promise<void> {
    // Create a type adapter for compatibility with email and notification services
    // This handles the difference between types/models.AppointmentWithUsers and the service-specific types
    const adaptAppointment = (apt: AppointmentWithUsers): any => {
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

  private generateAvailableTimeSlots(
    startDate: Date,
    endDate: Date,
    existingAppointments: Appointment[],
    workingHours: typeof DEFAULT_WORKING_HOURS
  ): Date[] {
    const slots: Date[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      // Skip weekends
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        // Generate slots for the day
        for (
          let hour = workingHours.start;
          hour < workingHours.end;
          hour += workingHours.slotDuration / 60
        ) {
          const slotTime = new Date(currentDate);
          slotTime.setHours(Math.floor(hour));
          slotTime.setMinutes((hour % 1) * 60);
          slotTime.setSeconds(0);
          slotTime.setMilliseconds(0);

          // Check if slot conflicts with existing appointments
          const isConflicting = existingAppointments.some(appointment => {
            const appointmentStart = appointment.datetime;
            const appointmentEnd = new Date(appointmentStart.getTime() + workingHours.slotDuration * 60000);
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