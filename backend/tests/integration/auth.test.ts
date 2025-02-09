import { describe, it, beforeAll, afterAll, expect } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';
import { AppDataSource } from '../../src/config/database.js';
import { User } from '../../src/entities/User.js';
import { UserRole } from '../../src/entities/User.js';
import bcrypt from 'bcryptjs';

describe('Authentication', () => {
  beforeAll(async () => {
    // Initialize database connection
    await AppDataSource.initialize();
    
    // Clear users table
    const userRepository = AppDataSource.getRepository(User);
    await userRepository.clear();

    // Create test user
    const testUser = new User();
    testUser.email = 'test@example.com';
    testUser.username = 'testuser';
    testUser.password = await bcrypt.hash('Test123!@#', 12);
    testUser.role = UserRole.Patient;

    await userRepository.save(testUser);
  });

  afterAll(async () => {
    const userRepository = AppDataSource.getRepository(User);
    await userRepository.clear();
    await AppDataSource.destroy();
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test123!@#',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.data.user).toHaveProperty('email', 'test@example.com');
    });

    it('should not login with invalid password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('status', 'fail');
    });
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'newuser@example.com',
          username: 'newuser',
          password: 'NewUser123!@#',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.user).toHaveProperty('email', 'newuser@example.com');
      expect(res.body).toHaveProperty('token');
    });

    it('should not register with existing email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          username: 'anotheruser',
          password: 'Test123!@#',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('status', 'fail');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let token: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test123!@#',
        });

      token = res.body.token;
    });

    it('should get current user profile with valid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user).toHaveProperty('email', 'test@example.com');
    });

    it('should not get profile without token', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('status', 'fail');
    });
  });
}); 