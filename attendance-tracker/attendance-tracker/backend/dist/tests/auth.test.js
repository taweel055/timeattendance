"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../routes/auth"));
const database_1 = __importDefault(require("../database"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/api/auth', auth_1.default);
describe('Authentication Routes', () => {
    beforeEach(() => {
        try {
            database_1.default.prepare('DELETE FROM users WHERE username LIKE ?').run('test_%');
        }
        catch (error) {
        }
    });
    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', async () => {
            const userData = {
                username: 'test_user_' + Date.now(),
                password: 'TestPassword123',
                role: 'employee'
            };
            const response = await (0, supertest_1.default)(app)
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
            const response = await (0, supertest_1.default)(app)
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
            const response = await (0, supertest_1.default)(app)
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
            await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);
            const response = await (0, supertest_1.default)(app)
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
            await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send(userData);
        });
        it('should login successfully with valid credentials', async () => {
            const loginData = {
                username: 'test_login_user',
                password: 'TestPassword123'
            };
            const response = await (0, supertest_1.default)(app)
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
            const response = await (0, supertest_1.default)(app)
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
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send(loginData)
                .expect(401);
            expect(response.body).toHaveProperty('error', 'Invalid credentials');
        });
        it('should reject login with missing credentials', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({})
                .expect(400);
            expect(response.body).toHaveProperty('details');
        });
    });
});
//# sourceMappingURL=auth.test.js.map