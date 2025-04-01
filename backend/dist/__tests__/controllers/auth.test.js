import request from 'supertest';
import app from '../../app.js';
import prisma from '../../lib/prisma.js';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
describe('Auth Controller', () => {
    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', async () => {
            const userData = {
                name: 'Test User',
                email: 'test@example.com',
                password: 'Password123!',
                role: Role.PATIENT,
                username: 'testuser'
            };
            const response = await request(app)
                .post('/api/auth/register')
                .send(userData);
            expect(response.status).toBe(201);
            expect(response.body.data).toHaveProperty('user');
            expect(response.body.data).toHaveProperty('token');
            expect(response.body.data.user.email).toBe(userData.email);
        });
        it('should not register a user with existing email', async () => {
            // Create a user first
            await prisma.user.create({
                data: {
                    name: 'Existing User',
                    email: 'existing@example.com',
                    password: await bcrypt.hash('Password123!', 10),
                    role: Role.PATIENT,
                    username: 'existinguser'
                }
            });
            const userData = {
                name: 'Test User',
                email: 'existing@example.com',
                password: 'Password123!',
                role: Role.PATIENT,
                username: 'testuser'
            };
            const response = await request(app)
                .post('/api/auth/register')
                .send(userData);
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
    });
    describe('POST /api/auth/login', () => {
        beforeEach(async () => {
            // Create a test user before each test
            await prisma.user.create({
                data: {
                    name: 'Test User',
                    email: 'test@example.com',
                    password: await bcrypt.hash('Password123!', 10),
                    role: Role.PATIENT,
                    username: 'testuser'
                }
            });
        });
        it('should login successfully with correct credentials', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'Password123!'
            };
            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData);
            expect(response.status).toBe(200);
            expect(response.body.data).toHaveProperty('token');
            expect(response.body.data).toHaveProperty('user');
        });
        it('should not login with incorrect password', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'WrongPassword123!'
            };
            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData);
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
        });
    });
    describe('GET /api/auth/validate', () => {
        let authToken;
        beforeEach(async () => {
            // Create a test user and get token
            const user = await prisma.user.create({
                data: {
                    name: 'Test User',
                    email: 'test@example.com',
                    password: await bcrypt.hash('Password123!', 10),
                    role: Role.PATIENT,
                    username: 'testuser'
                }
            });
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                email: 'test@example.com',
                password: 'Password123!'
            });
            authToken = loginResponse.body.data.token;
        });
        it('should validate a valid token', async () => {
            const response = await request(app)
                .get('/api/auth/validate')
                .set('Authorization', `Bearer ${authToken}`);
            expect(response.status).toBe(200);
            expect(response.body.data).toHaveProperty('isValid', true);
        });
        it('should reject an invalid token', async () => {
            const response = await request(app)
                .get('/api/auth/validate')
                .set('Authorization', 'Bearer invalid-token');
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
        });
    });
});
//# sourceMappingURL=auth.test.js.map