import { AppError } from '../utils/appError.js';
import prisma from '../lib/prisma.js';
import { Role } from '@prisma/client';
import { catchAsync } from '../utils/catchAsync.js';
import { encryptData, decryptData } from '../middleware/encryption.js';
// Define the HealthMetricType enum if it's not exported by Prisma
var HealthMetricType;
(function (HealthMetricType) {
    HealthMetricType["BLOOD_PRESSURE"] = "BLOOD_PRESSURE";
    HealthMetricType["HEART_RATE"] = "HEART_RATE";
    HealthMetricType["BLOOD_GLUCOSE"] = "BLOOD_GLUCOSE";
    HealthMetricType["WEIGHT"] = "WEIGHT";
    HealthMetricType["TEMPERATURE"] = "TEMPERATURE";
    HealthMetricType["OXYGEN_SATURATION"] = "OXYGEN_SATURATION";
})(HealthMetricType || (HealthMetricType = {}));
class PatientController {
    getPatientProfile = catchAsync(async (req, res) => {
        const patient = await prisma.user.findFirst({
            where: {
                id: req.user.id,
                role: Role.PATIENT
            },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
                settings: true
            }
        });
        if (!patient) {
            throw new AppError('Patient not found', 404);
        }
        // Encrypt sensitive data if needed
        const responseData = req.query.encrypted ? {
            ...patient,
            email: encryptData(patient.email)
        } : patient;
        res.status(200).json({
            status: 'success',
            data: responseData
        });
    });
    updatePatientProfile = catchAsync(async (req, res) => {
        const { iv, authTag, encryptedData } = req.body;
        const decryptedData = req.body.encrypted ? decryptData(encryptedData, iv, authTag) : req.body;
        const patient = await prisma.user.update({
            where: {
                id: req.user.id,
                role: Role.PATIENT
            },
            data: decryptedData,
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
            data: patient
        });
    });
    getPatientMedicalRecords = catchAsync(async (req, res) => {
        const records = await prisma.medicalRecord.findMany({
            where: {
                patientId: req.user.id
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        // Encrypt sensitive data if needed
        const responseData = req.query.encrypted ? records.map(record => ({
            ...record,
            content: encryptData(record.content),
            title: encryptData(record.title)
        })) : records;
        res.status(200).json({
            status: 'success',
            data: responseData
        });
    });
    addMedicalRecord = catchAsync(async (req, res) => {
        const { iv, authTag, encryptedData } = req.body;
        const decryptedData = req.body.encrypted ? decryptData(encryptedData, iv, authTag) : req.body;
        const record = await prisma.medicalRecord.create({
            data: {
                ...decryptedData,
                patientId: req.user.id,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });
        res.status(201).json({
            status: 'success',
            data: record
        });
    });
    getPatientHealthMetrics = catchAsync(async (req, res) => {
        const metrics = await prisma.healthMetric.findMany({
            where: {
                patientId: req.user.id
            },
            orderBy: {
                timestamp: 'desc'
            }
        });
        // Encrypt sensitive data if needed
        const responseData = req.query.encrypted ? metrics.map(metric => ({
            ...metric,
            value: encryptData(metric.value.toString()),
            metadata: metric.metadata ? encryptData(JSON.stringify(metric.metadata)) : null
        })) : metrics;
        res.status(200).json({
            status: 'success',
            data: responseData
        });
    });
    addHealthMetric = catchAsync(async (req, res) => {
        const { iv, authTag, encryptedData } = req.body;
        const decryptedData = req.body.encrypted ? decryptData(encryptedData, iv, authTag) : req.body;
        const metric = await prisma.healthMetric.create({
            data: {
                ...decryptedData,
                patientId: req.user.id,
                timestamp: new Date(),
                type: decryptedData.type
            }
        });
        res.status(201).json({
            status: 'success',
            data: metric
        });
    });
    getPatientProviders = catchAsync(async (req, res) => {
        const relationships = await prisma.patientProvider.findMany({
            where: {
                patientId: req.user.id
            },
            include: {
                doctor: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        role: true,
                        specialty: true
                    }
                }
            }
        });
        const providers = relationships.map(rel => ({
            ...rel.doctor,
            metadata: rel.metadata
        }));
        // Encrypt sensitive data if needed
        const responseData = req.query.encrypted ? providers.map(provider => ({
            ...provider,
            email: encryptData(provider.email),
            metadata: provider.metadata ? encryptData(JSON.stringify(provider.metadata)) : null
        })) : providers;
        res.status(200).json({
            status: 'success',
            data: responseData
        });
    });
    addProviderRelationship = catchAsync(async (req, res) => {
        const { providerId } = req.body;
        const provider = await prisma.user.findFirst({
            where: {
                id: providerId,
                role: Role.PROVIDER
            }
        });
        if (!provider) {
            throw new AppError('Provider not found', 404);
        }
        const relationship = await prisma.patientProvider.create({
            data: {
                patientId: req.user.id,
                doctorId: providerId,
                metadata: {}
            }
        });
        res.status(201).json({
            status: 'success',
            data: {
                providerId,
                patientId: req.user.id
            }
        });
    });
}
export const patientController = new PatientController();
//# sourceMappingURL=patient.controller.js.map