// Auth Module Tests - Max 200 lines
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../modules/database/models/User');
const config = require('../config');

describe('Authentication Module', () => {
  let server;
  let testUser;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(config.database.uri + '_test', config.database.options);
    server = await app.start();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    server.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    
    testUser = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      phone: '+27123456789'
    };
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(server)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should award welcome bonus LD Coins', async () => {
      const response = await request(server)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(response.body.data.user.loyalty.ldCoins).toBe(100);
    });

    it('should not register duplicate email', async () => {
      await request(server)
        .post('/api/v1/auth/register')
        .send(testUser);

      const response = await request(server)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate password requirements', async () => {
      const response = await request(server)
        .post('/api/v1/auth/register')
        .send({ ...testUser, password: 'weak' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await request(server)
        .post('/api/v1/auth/register')
        .send(testUser);
    });

    it('should login with valid credentials', async () => {
      const response = await request(server)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it('should reject invalid password', async () => {
      const response = await request(server)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject non-existent user', async () => {
      const response = await request(server)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should track login attempts and lock account', async () => {
      // Make 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await request(server)
          .post('/api/v1/auth/login')
          .send({
            email: testUser.email,
            password: 'wrongpassword'
          });
      }

      // Next attempt should be locked
      const response = await request(server)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('locked');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let authToken;
    let refreshToken;

    beforeEach(async () => {
      await request(server)
        .post('/api/v1/auth/register')
        .send(testUser);

      const loginResponse = await request(server)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      authToken = loginResponse.body.data.token;
      refreshToken = loginResponse.headers['set-cookie']
        .find(cookie => cookie.startsWith('refreshToken='));
    });

    it('should refresh token with valid refresh token', async () => {
      const response = await request(server)
        .post('/api/v1/auth/refresh')
        .set('Cookie', refreshToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.token).not.toBe(authToken);
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(server)
        .post('/api/v1/auth/refresh')
        .set('Cookie', 'refreshToken=invalid');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    beforeEach(async () => {
      await request(server)
        .post('/api/v1/auth/register')
        .send(testUser);
    });

    it('should send password reset email', async () => {
      const response = await request(server)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testUser.email });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reset email sent');
    });

    it('should not reveal if email exists', async () => {
      const response = await request(server)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});