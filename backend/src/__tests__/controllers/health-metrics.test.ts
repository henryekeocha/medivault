import request from 'supertest';
import app from '../../app.js';
import prisma from '../../lib/prisma.js';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { clerkClient } from '@clerk/clerk-sdk-node';

// Mock Clerk client
jest.mock('@clerk/clerk-sdk-node', () => ({
  clerkClient: {
    sessions: {
      getSession: jest.fn()
    },
    users: {
      getUser: jest.fn()
    }
  }
}));

describe('Health Metrics Controller', () => {
  let providerToken: string;
  let patientToken: string;
  let providerId: string;
  let patientId: string;
  let providerAuthId: string;
  let patientAuthId: string;

  beforeEach(async () => {
    // Mock auth IDs
    providerAuthId = 'provider_auth_id';
    patientAuthId = 'patient_auth_id';

    // Create a provider and patient user
    const provider = await prisma.user.create({
      data: {
        name: 'Test Provider',
        email: 'provider@example.com',
        password: await bcrypt.hash('Password123!', 10),
        role: Role.PROVIDER,
        username: 'testprovider',
        authId: providerAuthId // Add authId for Clerk integration
      }
    });

    const patient = await prisma.user.create({
      data: {
        name: 'Test Patient',
        email: 'patient@example.com',
        password: await bcrypt.hash('Password123!', 10),
        role: Role.PATIENT,
        username: 'testpatient',
        authId: patientAuthId // Add authId for Clerk integration
      }
    });

    providerId = provider.id;
    patientId = patient.id;

    // Set up tokens (these don't need to be real JWT tokens anymore)
    providerToken = `session_provider_${providerId}`;
    patientToken = `session_patient_${patientId}`;

    // Set up Clerk mocks
    (clerkClient.sessions.getSession as jest.Mock).mockImplementation((token) => {
      if (token === providerToken) {
        return Promise.resolve({ 
          status: 'active',
          userId: providerAuthId
        });
      } else if (token === patientToken) {
        return Promise.resolve({ 
          status: 'active',
          userId: patientAuthId
        });
      }
      return Promise.resolve(null);
    });

    (clerkClient.users.getUser as jest.Mock).mockImplementation((authId) => {
      if (authId === providerAuthId) {
        return Promise.resolve({ 
          id: providerAuthId,
          emailAddresses: [{ emailAddress: 'provider@example.com' }]
        });
      } else if (authId === patientAuthId) {
        return Promise.resolve({ 
          id: patientAuthId,
          emailAddresses: [{ emailAddress: 'patient@example.com' }]
        });
      }
      return Promise.resolve(null);
    });
  });

  describe('POST /api/health-metrics', () => {
    it('should create a new health metric', async () => {
      const metricData = {
        type: 'VITAL_SIGNS',
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
        type: 'VITAL_SIGNS',
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
          type: 'VITAL_SIGNS',
          value: 120,
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
    let metricId: string;

    beforeEach(async () => {
      // Create a test metric
      const metric = await prisma.healthMetric.create({
        data: {
          type: 'VITAL_SIGNS',
          value: 120,
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
    let metricId: string;

    beforeEach(async () => {
      // Create a test metric
      const metric = await prisma.healthMetric.create({
        data: {
          type: 'VITAL_SIGNS',
          value: 120,
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
    let metricId: string;

    beforeEach(async () => {
      // Create a test metric
      const metric = await prisma.healthMetric.create({
        data: {
          type: 'VITAL_SIGNS',
          value: 120,
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