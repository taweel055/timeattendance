import request from 'supertest';
import express from 'express';
import authRoutes from '../routes/auth';
import db from '../database';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Authentication Routes', () => {
  beforeEach(() => {
    try {
      db.prepare('DELETE FROM users WHERE username LIKE ?').run('test_%');
    } catch (error) {
    }
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'test_user_' + Date.now(),
        password: 'TestPassword123',
        role: 'employee'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('username', userData.username);
      expect(response.body).toHaveProperty('role', userData.role);
    });

    it('should reject registration with missing username', async () => {
      const userData = {
        password: 'TestPassword123',
        role: 'employee'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('details');
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        username: 'test_user_' + Date.now(),
        password: '123',
        role: 'employee'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('details');
    });

    it('should reject duplicate username registration', async () => {
      const userData = {
        username: 'test_duplicate_' + Date.now(),
        password: 'TestPassword123',
        role: 'employee'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Username already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      const userData = {
        username: 'test_login_user',
        password: 'TestPassword123',
        role: 'employee'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);
    });

    it('should login successfully with valid credentials', async () => {
      const loginData = {
        username: 'test_login_user',
        password: 'TestPassword123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('username', loginData.username);
    });

    it('should reject login with invalid username', async () => {
      const loginData = {
        username: 'nonexistent_user',
        password: 'TestPassword123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should reject login with invalid password', async () => {
      const loginData = {
        username: 'test_login_user',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should reject login with missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('details');
    });
  });
});
