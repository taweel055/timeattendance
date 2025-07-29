"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const database_1 = __importDefault(require("../database"));
(0, globals_1.beforeAll)(() => {
    console.log('Setting up test database...');
});
(0, globals_1.afterAll)(() => {
    console.log('Cleaning up test database...');
    if (database_1.default) {
        database_1.default.close();
    }
});
(0, globals_1.beforeEach)(() => {
});
(0, globals_1.afterEach)(() => {
});
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.PORT = '5001';
//# sourceMappingURL=setup.js.map