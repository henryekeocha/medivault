import request from 'supertest';
import { app } from '../../app.js';
import { prisma } from '../../lib/prisma.js';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
describe('Health Metrics Controller', () => {
    let providerToken;
    let patientToken;
    let providerId;
    let patientId;
    beforeEach(async () => {
        // Create a provider and patient user
        const provider = await prisma.user.create({
            data: {
                name: 'Test Provider',
                email: 'provider@example.com',
                password: await bcrypt.hash('Password123!', 10),
                role: Role.PROVIDER,
                username: 'testprovider'
            }
        });
        const patient = await prisma.user.create({
            data: {
                name: 'Test Patient',
                email: 'patient@example.com',
                password: await bcrypt.hash('Password123!', 10),
                role: Role.PATIENT,
                username: 'testpatient'
            }
        });
        providerId = provider.id;
        patientId = patient.id;
        // Generate tokens
        providerToken = jwt.sign({ id: provider.id }, process.env.JWT_SECRET);
        patientToken = jwt.sign({ id: patient.id }, process.env.JWT_SECRET);
    });
    describe('POST /api/health-metrics', () => {
        it('should create a new health metric', async () => {
            const metricData = {
                type: 'BLOOD_PRESSURE',
                value: '120/80',
                unit: 'mmHg',
                notes: 'Regular checkup',
                patientId: patientId,
                metadata: { systolic: 120, diastolic: 80 }
            };
            const response = await request(app)
                .post('/api/health-metrics')
                .set('Authorization', `Bearer ${providerToken}`)
                .send(metricData);
            expect(response.status).toBe(201);
            expect(response.body.data).toHaveProperty('id');
            expect(response.body.data.type).toBe(metricData.type);
            expect(response.body.data.value).toBe(metricData.value);
        });
        it('should not create a metric without proper authorization', async () => {
            const metricData = {
                type: 'BLOOD_PRESSURE',
                value: '120/80',
                unit: 'mmHg',
                patientId: patientId
            };
            const response = await request(app)
                .post('/api/health-metrics')
                .send(metricData);
            expect(response.status).toBe(401);
        });
    });
    describe('GET /api/health-metrics', () => {
        beforeEach(async () => {
            // Create some test metrics
            await prisma.healthMetric.create({
                data: {
                    type: 'BLOOD_PRESSURE',
                    value: '120/80',
                    unit: 'mmHg',
                    patientId: patientId,
                    providerId: providerId,
                    timestamp: new Date()
                }
            });
        });
        it('should get metrics for authenticated patient', async () => {
            const response = await request(app)
                .get('/api/health-metrics')
                .set('Authorization', `Bearer ${patientToken}`);
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
        });
        it('should get metrics for authenticated provider', async () => {
            const response = await request(app)
                .get('/api/health-metrics')
                .set('Authorization', `Bearer ${providerToken}`);
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.data)).toBe(true);
        });
    });
    describe('GET /api/health-metrics/:id', () => {
        let metricId;
        beforeEach(async () => {
            // Create a test metric
            const metric = await prisma.healthMetric.create({
                data: {
                    type: 'BLOOD_PRESSURE',
                    value: '120/80',
                    unit: 'mmHg',
                    patientId: patientId,
                    providerId: providerId,
                    timestamp: new Date()
                }
            });
            metricId = metric.id;
        });
        it('should get a specific metric', async () => {
            const response = await request(app)
                .get(`/api/health-metrics/${metricId}`)
                .set('Authorization', `Bearer ${providerToken}`);
            expect(response.status).toBe(200);
            expect(response.body.data.id).toBe(metricId);
        });
        it('should return 404 for non-existent metric', async () => {
            const response = await request(app)
                .get('/api/health-metrics/non-existent-id')
                .set('Authorization', `Bearer ${providerToken}`);
            expect(response.status).toBe(404);
        });
    });
    describe('PUT /api/health-metrics/:id', () => {
        let metricId;
        beforeEach(async () => {
            // Create a test metric
            const metric = await prisma.healthMetric.create({
                data: {
                    type: 'BLOOD_PRESSURE',
                    value: '120/80',
                    unit: 'mmHg',
                    patientId: patientId,
                    providerId: providerId,
                    timestamp: new Date()
                }
            });
            metricId = metric.id;
        });
        it('should update a metric', async () => {
            const updateData = {
                value: '130/85',
                notes: 'Updated reading'
            };
            const response = await request(app)
                .put(`/api/health-metrics/${metricId}`)
                .set('Authorization', `Bearer ${providerToken}`)
                .send(updateData);
            expect(response.status).toBe(200);
            expect(response.body.data.value).toBe(updateData.value);
            expect(response.body.data.notes).toBe(updateData.notes);
        });
    });
    describe('DELETE /api/health-metrics/:id', () => {
        let metricId;
        beforeEach(async () => {
            // Create a test metric
            const metric = await prisma.healthMetric.create({
                data: {
                    type: 'BLOOD_PRESSURE',
                    value: '120/80',
                    unit: 'mmHg',
                    patientId: patientId,
                    providerId: providerId,
                    timestamp: new Date()
                }
            });
            metricId = metric.id;
        });
        it('should delete a metric', async () => {
            const response = await request(app)
                .delete(`/api/health-metrics/${metricId}`)
                .set('Authorization', `Bearer ${providerToken}`);
            expect(response.status).toBe(200);
            // Verify deletion
            const deletedMetric = await prisma.healthMetric.findUnique({
                where: { id: metricId }
            });
            expect(deletedMetric).toBeNull();
        });
    });
});
//# sourceMappingURL=health-metrics.test.js.map