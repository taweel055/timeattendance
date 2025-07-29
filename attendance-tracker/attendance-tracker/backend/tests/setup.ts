import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import db from '../database';

beforeAll(() => {
  console.log('Setting up test database...');
});

afterAll(() => {
  console.log('Cleaning up test database...');
  if (db) {
    db.close();
  }
});

beforeEach(() => {
});

afterEach(() => {
});

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.PORT = '5001';
