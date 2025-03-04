import { AppError } from '../utils/appError.js';
import { prisma } from '../lib/prisma.js';
import { Role } from '@prisma/client';
import { catchAsync } from '../utils/catchAsync.js';
class ProviderController {
    getProviderProfile = catchAsync(async (req, res) => {
        const provider = await prisma.user.findFirst({
            where: {
                id: req.user.id,
                role: Role.PROVIDER
            },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
                specialty: true,
                settings: true
            }
        });
        if (!provider) {
            throw new AppError('Provider not found', 404);
        }
        res.status(200).json({
            status: 'success',
            data: provider
        });
    });
    updateProviderProfile = catchAsync(async (req, res) => {
        const provider = await prisma.user.update({
            where: {
                id: req.user.id,
                role: Role.PROVIDER
            },
            data: req.body,
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                specialty: true
            }
        });
        res.status(200).json({
            status: 'success',
            data: provider
        });
    });
    getProviderPatients = catchAsync(async (req, res) => {
        const patients = await prisma.user.findMany({
            where: {
                role: Role.PATIENT,
                providers: {
                    some: {
                        doctorId: req.user.id
                    }
                }
            },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true
            }
        });
        res.status(200).json({
            status: 'success',
            data: patients
        });
    });
    getProviderAppointments = catchAsync(async (req, res) => {
        const appointments = await prisma.appointment.findMany({
            where: {
                doctorId: req.user.id
            },
            include: {
                patient: {
                    select: {
                        id: true,
                        username: true,
                        email: true
                    }
                }
            },
            orderBy: {
                startTime: 'desc'
            }
        });
        res.status(200).json({
            status: 'success',
            data: appointments
        });
    });
    scheduleAppointment = catchAsync(async (req, res) => {
        const { patientId, startTime, endTime, notes } = req.body;
        const appointment = await prisma.appointment.create({
            data: {
                doctorId: req.user.id,
                patientId,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                notes,
                status: 'SCHEDULED'
            },
            include: {
                patient: {
                    select: {
                        id: true,
                        username: true,
                        email: true
                    }
                }
            }
        });
        res.status(201).json({
            status: 'success',
            data: appointment
        });
    });
    getProviderMedicalRecords = catchAsync(async (req, res) => {
        const records = await prisma.medicalRecord.findMany({
            where: {
                providerId: req.user.id
            },
            include: {
                patient: {
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
        res.status(200).json({
            status: 'success',
            data: records
        });
    });
    getProviderAnalytics = catchAsync(async (req, res) => {
        const [patientCount, appointmentCount, recordCount] = await Promise.all([
            prisma.patientProvider.count({
                where: {
                    doctorId: req.user.id
                }
            }),
            prisma.appointment.count({
                where: {
                    doctorId: req.user.id
                }
            }),
            prisma.medicalRecord.count({
                where: {
                    providerId: req.user.id
                }
            })
        ]);
        res.status(200).json({
            status: 'success',
            data: {
                totalPatients: patientCount,
                totalAppointments: appointmentCount,
                totalMedicalRecords: recordCount
            }
        });
    });
}
export const providerController = new ProviderController();
//# sourceMappingURL=provider.controller.js.map