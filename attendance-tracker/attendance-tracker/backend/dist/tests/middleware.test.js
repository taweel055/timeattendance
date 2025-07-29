"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.get('/protected', auth_1.authenticateToken, (req, res) => {
    res.json({ message: 'Access granted', user: req.user });
});
app.get('/admin-only', auth_1.authenticateToken, auth_1.authorizeAdmin, (req, res) => {
    res.json({ message: 'Admin access granted' });
});
app.post('/test-auth-validation', validation_1.validateAuth.register, (req, res) => {
    res.json({ message: 'Validation passed' });
});
app.post('/test-employee-validation', validation_1.validateEmployee.create, (req, res) => {
    res.json({ message: 'Employee validation passed' });
});
describe('Middleware Tests', () => {
    const JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
    beforeAll(() => {
        process.env.JWT_SECRET = JWT_SECRET;
    });
    describe('Authentication Middleware', () => {
        it('should allow access with valid token', async () => {
            const token = jsonwebtoken_1.default.sign({ id: 1, username: 'testuser', role: 'employee' }, JWT_SECRET, { expiresIn: '1h' });
            const response = await (0, supertest_1.default)(app)
                .get('/protected')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);
            expect(response.body).toHaveProperty('message', 'Access granted');
            expect(response.body.user).toHaveProperty('username', 'testuser');
        });
        it('should reject access without token', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/protected')
                .expect(401);
            expect(response.body).toHaveProperty('error', 'Access token required');
        });
        it('should reject access with invalid token', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/protected')
                .set('Authorization', 'Bearer invalid-token')
                .expect(403);
            expect(response.body).toHaveProperty('error', 'Invalid or expired token');
        });
        it('should reject access with expired token', async () => {
            const expiredToken = jsonwebtoken_1.default.sign({ id: 1, username: 'testuser', role: 'employee' }, JWT_SECRET, { expiresIn: '-1h' } // Expired 1 hour ago
            );
            const response = await (0, supertest_1.default)(app)
                .get('/protected')
                .set('Authorization', `Bearer ${expiredToken}`)
                .expect(403);
            expect(response.body).toHaveProperty('error', 'Invalid or expired token');
        });
    });
    describe('Authorization Middleware', () => {
        it('should allow admin access for admin users', async () => {
            const adminToken = jsonwebtoken_1.default.sign({ id: 1, username: 'admin', role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
            const response = await (0, supertest_1.default)(app)
                .get('/admin-only')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);
            expect(response.body).toHaveProperty('message', 'Admin access granted');
        });
        it('should deny admin access for non-admin users', async () => {
            const employeeToken = jsonwebtoken_1.default.sign({ id: 2, username: 'employee', role: 'employee' }, JWT_SECRET, { expiresIn: '1h' });
            const response = await (0, supertest_1.default)(app)
                .get('/admin-only')
                .set('Authorization', `Bearer ${employeeToken}`)
                .expect(403);
            expect(response.body).toHaveProperty('error', 'Admin or manager access required');
        });
    });
    describe('Validation Middleware', () => {
        describe('Auth Validation', () => {
            it('should pass validation with valid registration data', async () => {
                const validData = {
                    username: 'newuser123',
                    password: 'SecurePassword123',
                    role: 'employee'
                };
                const response = await (0, supertest_1.default)(app)
                    .post('/test-auth-validation')
                    .send(validData)
                    .expect(200);
                expect(response.body).toHaveProperty('message', 'Validation passed');
            });
            it('should fail validation with missing username', async () => {
                const invalidData = {
                    password: 'SecurePassword123',
                    role: 'employee'
                };
                const response = await (0, supertest_1.default)(app)
                    .post('/test-auth-validation')
                    .send(invalidData)
                    .expect(400);
                expect(response.body).toHaveProperty('details');
                expect(response.body.details).toEqual(expect.arrayContaining([
                    expect.objectContaining({
                        field: 'username'
                    })
                ]));
            });
            it('should fail validation with weak password', async () => {
                const invalidData = {
                    username: 'newuser123',
                    password: '123',
                    role: 'employee'
                };
                const response = await (0, supertest_1.default)(app)
                    .post('/test-auth-validation')
                    .send(invalidData)
                    .expect(400);
                expect(response.body).toHaveProperty('details');
                expect(response.body.details).toEqual(expect.arrayContaining([
                    expect.objectContaining({
                        field: 'password'
                    })
                ]));
            });
        });
        describe('Employee Validation', () => {
            it('should pass validation with valid employee data', async () => {
                const validData = {
                    employee_id: 'EMP001',
                    name: 'John Doe',
                    email: 'john.doe@example.com',
                    department: 'Engineering',
                    position: 'Software Developer',
                    hourly_rate: 25.50,
                    hire_date: '2024-01-15'
                };
                const response = await (0, supertest_1.default)(app)
                    .post('/test-employee-validation')
                    .send(validData)
                    .expect(200);
                expect(response.body).toHaveProperty('message', 'Employee validation passed');
            });
            it('should fail validation with missing required fields', async () => {
                const invalidData = {
                    name: 'John Doe',
                    email: 'john.doe@example.com'
                };
                const response = await (0, supertest_1.default)(app)
                    .post('/test-employee-validation')
                    .send(invalidData)
                    .expect(400);
                expect(response.body).toHaveProperty('details');
                expect(response.body.details.length).toBeGreaterThan(0);
            });
            it('should fail validation with invalid email format', async () => {
                const invalidData = {
                    employee_id: 'EMP001',
                    name: 'John Doe',
                    email: 'invalid-email',
                    department: 'Engineering',
                    position: 'Software Developer',
                    hourly_rate: 25.50,
                    hire_date: '2024-01-15'
                };
                const response = await (0, supertest_1.default)(app)
                    .post('/test-employee-validation')
                    .send(invalidData)
                    .expect(400);
                expect(response.body).toHaveProperty('details');
                expect(response.body.details).toEqual(expect.arrayContaining([
                    expect.objectContaining({
                        field: 'email'
                    })
                ]));
            });
        });
    });
});
//# sourceMappingURL=middleware.test.js.map