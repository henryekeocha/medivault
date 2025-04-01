import { AppError } from '../utils/appError.js';
import prisma from '../lib/prisma.js';
import { Role } from '@prisma/client';
import { catchAsync } from '../utils/catchAsync.js';
import { AppointmentStatus } from '@prisma/client';
const DEFAULT_WORKING_HOURS = {
    start: 9, // 9 AM
    end: 17, // 5 PM
    slotDuration: 30, // 30 minutes
    availabilityBlocks: [],
    blockedTimes: []
};
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
        const { page = '1', limit = '10', doctorId, status, startDate, endDate } = req.query;
        const where = {
            doctorId: doctorId || req.user.id,
            ...(status && {
                status: {
                    in: status.split(',').map(s => s.trim().toUpperCase())
                        .filter(s => Object.values(AppointmentStatus).includes(s))
                }
            }),
            ...(startDate && {
                datetime: {
                    gte: new Date(startDate),
                    ...(endDate && { lte: new Date(endDate) })
                }
            })
        };
        const [appointments, total] = await Promise.all([
            prisma.appointment.findMany({
                where,
                include: {
                    patient: {
                        select: {
                            id: true,
                            username: true,
                            email: true
                        }
                    }
                },
                skip: (Number(page) - 1) * Number(limit),
                take: Number(limit),
                orderBy: {
                    datetime: 'desc'
                }
            }),
            prisma.appointment.count({ where })
        ]);
        res.status(200).json({
            status: 'success',
            data: {
                items: appointments,
                totalCount: total,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total
                }
            }
        });
    });
    scheduleAppointment = catchAsync(async (req, res) => {
        const { patientId, startTime, endTime, notes } = req.body;
        const appointment = await prisma.appointment.create({
            data: {
                doctorId: req.user.id,
                patientId,
                datetime: new Date(startTime),
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
        const providerId = req.query.providerId || req.user.id;
        const [patientCount, appointmentCount, recordCount] = await Promise.all([
            prisma.patientProvider.count({
                where: {
                    doctorId: providerId
                }
            }),
            prisma.appointment.count({
                where: {
                    doctorId: providerId
                }
            }),
            prisma.medicalRecord.count({
                where: {
                    providerId: providerId
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
    getProviderWorkingHours = catchAsync(async (req, res) => {
        const settings = await prisma.userSettings.findUnique({
            where: { userId: req.user.id }
        });
        res.status(200).json({
            status: 'success',
            data: settings?.workingHours || DEFAULT_WORKING_HOURS
        });
    });
    saveProviderWorkingHours = catchAsync(async (req, res) => {
        const { workingHours } = req.body;
        const settings = await prisma.userSettings.upsert({
            where: { userId: req.user.id },
            update: { workingHours },
            create: {
                userId: req.user.id,
                workingHours
            }
        });
        res.status(200).json({
            status: 'success',
            data: settings.workingHours
        });
    });
    getProviderAvailabilityBlocks = catchAsync(async (req, res) => {
        const settings = await prisma.userSettings.findUnique({
            where: { userId: req.user.id }
        });
        const workingHours = settings?.workingHours || {};
        const blocks = workingHours.availabilityBlocks || [];
        res.status(200).json({
            status: 'success',
            data: blocks
        });
    });
    addProviderAvailabilityBlock = catchAsync(async (req, res) => {
        const { block } = req.body;
        const settings = await prisma.userSettings.findUnique({
            where: { userId: req.user.id }
        });
        const workingHours = settings?.workingHours || {};
        const blocks = workingHours.availabilityBlocks || [];
        blocks.push(block);
        const updatedSettings = await prisma.userSettings.upsert({
            where: { userId: req.user.id },
            update: {
                workingHours: {
                    ...workingHours,
                    availabilityBlocks: blocks
                }
            },
            create: {
                userId: req.user.id,
                workingHours: {
                    availabilityBlocks: [block]
                }
            }
        });
        res.status(200).json({
            status: 'success',
            data: updatedSettings.workingHours
        });
    });
    saveProviderAvailabilityBlocks = catchAsync(async (req, res) => {
        const { blocks } = req.body;
        const settings = await prisma.userSettings.findUnique({
            where: { userId: req.user.id }
        });
        const workingHours = settings?.workingHours || {};
        const updatedSettings = await prisma.userSettings.upsert({
            where: { userId: req.user.id },
            update: {
                workingHours: {
                    ...workingHours,
                    availabilityBlocks: blocks
                }
            },
            create: {
                userId: req.user.id,
                workingHours: {
                    availabilityBlocks: blocks
                }
            }
        });
        res.status(200).json({
            status: 'success',
            data: updatedSettings.workingHours
        });
    });
    removeProviderAvailabilityBlock = catchAsync(async (req, res) => {
        const { blockId } = req.params;
        const settings = await prisma.userSettings.findUnique({
            where: { userId: req.user.id }
        });
        const workingHours = settings?.workingHours || {};
        const blocks = workingHours.availabilityBlocks || [];
        const updatedBlocks = blocks.filter((block) => block.id !== blockId);
        const updatedSettings = await prisma.userSettings.upsert({
            where: { userId: req.user.id },
            update: {
                workingHours: {
                    ...workingHours,
                    availabilityBlocks: updatedBlocks
                }
            },
            create: {
                userId: req.user.id,
                workingHours: {
                    availabilityBlocks: []
                }
            }
        });
        res.status(200).json({
            status: 'success',
            data: updatedSettings.workingHours
        });
    });
    getProviderBlockedTimes = catchAsync(async (req, res) => {
        const settings = await prisma.userSettings.findUnique({
            where: { userId: req.user.id }
        });
        const workingHours = settings?.workingHours || {};
        const blockedTimes = workingHours.blockedTimes || [];
        res.status(200).json({
            status: 'success',
            data: blockedTimes
        });
    });
    addProviderBlockedTime = catchAsync(async (req, res) => {
        const { blockedTime } = req.body;
        const settings = await prisma.userSettings.findUnique({
            where: { userId: req.user.id }
        });
        const workingHours = settings?.workingHours || {};
        const blockedTimes = workingHours.blockedTimes || [];
        blockedTimes.push(blockedTime);
        const updatedSettings = await prisma.userSettings.upsert({
            where: { userId: req.user.id },
            update: {
                workingHours: {
                    ...workingHours,
                    blockedTimes
                }
            },
            create: {
                userId: req.user.id,
                workingHours: {
                    blockedTimes: [blockedTime]
                }
            }
        });
        res.status(200).json({
            status: 'success',
            data: updatedSettings.workingHours
        });
    });
    saveProviderBlockedTimes = catchAsync(async (req, res) => {
        const { blockedTimes } = req.body;
        const settings = await prisma.userSettings.findUnique({
            where: { userId: req.user.id }
        });
        const workingHours = settings?.workingHours || {};
        const updatedSettings = await prisma.userSettings.upsert({
            where: { userId: req.user.id },
            update: {
                workingHours: {
                    ...workingHours,
                    blockedTimes
                }
            },
            create: {
                userId: req.user.id,
                workingHours: {
                    blockedTimes
                }
            }
        });
        res.status(200).json({
            status: 'success',
            data: updatedSettings.workingHours
        });
    });
    removeProviderBlockedTime = catchAsync(async (req, res) => {
        const { blockedTimeId } = req.params;
        const settings = await prisma.userSettings.findUnique({
            where: { userId: req.user.id }
        });
        const workingHours = settings?.workingHours || {};
        const blockedTimes = workingHours.blockedTimes || [];
        const updatedBlockedTimes = blockedTimes.filter((time) => time.id !== blockedTimeId);
        const updatedSettings = await prisma.userSettings.upsert({
            where: { userId: req.user.id },
            update: {
                workingHours: {
                    ...workingHours,
                    blockedTimes: updatedBlockedTimes
                }
            },
            create: {
                userId: req.user.id,
                workingHours: {
                    blockedTimes: []
                }
            }
        });
        res.status(200).json({
            status: 'success',
            data: updatedSettings.workingHours
        });
    });
    // Get all providers (provider directory)
    getAllProviders = catchAsync(async (req, res) => {
        const { page = '1', limit = '10', search, specialty } = req.query;
        const where = {
            role: Role.PROVIDER,
        };
        // Add search filter if provided
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }
        // Add specialty filter if provided
        if (specialty) {
            where.specialty = { contains: specialty, mode: 'insensitive' };
        }
        const [providers, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    specialty: true,
                    createdAt: true,
                    isActive: true
                },
                skip: (Number(page) - 1) * Number(limit),
                take: Number(limit),
                orderBy: {
                    name: 'asc'
                }
            }),
            prisma.user.count({ where })
        ]);
        res.status(200).json({
            status: 'success',
            data: {
                data: providers,
                totalCount: total,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total
                }
            }
        });
    });
}
export const providerController = new ProviderController();
//# sourceMappingURL=provider.controller.js.map