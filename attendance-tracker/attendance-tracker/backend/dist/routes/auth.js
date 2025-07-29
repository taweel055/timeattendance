"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = __importDefault(require("../database"));
const validation_1 = require("../middleware/validation");
const router = express_1.default.Router();
// Register
router.post('/register', validation_1.validateAuth.register, async (req, res) => {
    try {
        const { username, password, role = 'employee' } = req.body;
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        // Insert user
        const stmt = database_1.default.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
        const result = stmt.run(username, hashedPassword, role);
        res.status(201).json({
            id: result.lastInsertRowid,
            username,
            role,
            message: 'User registered successfully'
        });
        return;
    }
    catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            res.status(400).json({ error: 'Username already exists' });
            return;
        }
        else {
            res.status(500).json({ error: 'Registration failed' });
            return;
        }
    }
});
// Login
router.post('/login', validation_1.validateAuth.login, async (req, res) => {
    try {
        const { username, password } = req.body;
        // Find user
        const user = database_1.default.prepare('SELECT * FROM users WHERE username = ?').get(username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Check password
        const validPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Generate token
        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ error: 'JWT secret not configured' });
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
        // Get employee info if exists
        const employee = database_1.default.prepare('SELECT * FROM employees WHERE user_id = ?').get(user.id);
        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                employee: employee
            }
        });
        return;
    }
    catch (error) {
        res.status(500).json({ error: 'Login failed' });
        return;
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map