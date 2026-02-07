import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock environment before importing authService
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '1h';

// Mock dependencies
jest.mock('../models/userModel', () => ({
  findUserByEmail: jest.fn(),
  createUser: jest.fn(),
  toPublicUser: jest.fn((user) => ({
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
    subscription_status: user.subscription_status ?? 'inactive',
    current_period_end: null,
    stripe_customer_id: null,
    stripe_connect_account_id: null,
    stripe_connect_onboarded_at: null,
    created_at: user.created_at,
    updated_at: user.updated_at
  }))
}));

import { registerUser, loginUser, verifyToken } from '../services/authService';
import * as userModel from '../models/userModel';

const mockFindUserByEmail = userModel.findUserByEmail as jest.MockedFunction<typeof userModel.findUserByEmail>;
const mockCreateUser = userModel.createUser as jest.MockedFunction<typeof userModel.createUser>;

const mockUser = {
  id: 1,
  email: 'test@example.com',
  password_hash: '',
  first_name: 'Test',
  last_name: 'User',
  role: 'student' as const,
  subscription_status: 'inactive' as const,
  current_period_end: null,
  stripe_customer_id: null,
  stripe_connect_account_id: null,
  stripe_connect_onboarded_at: null,
  created_at: new Date(),
  updated_at: new Date()
};

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    it('should register a new user and return token', async () => {
      mockFindUserByEmail.mockResolvedValue(null);
      mockCreateUser.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        first_name: mockUser.first_name,
        last_name: mockUser.last_name,
        role: mockUser.role,
        subscription_status: 'inactive',
        current_period_end: null,
        stripe_customer_id: null,
        stripe_connect_account_id: null,
        stripe_connect_onboarded_at: null,
        created_at: mockUser.created_at,
        updated_at: mockUser.updated_at
      });

      const result = await registerUser({
        email: 'test@example.com',
        password: 'Password123',
        first_name: 'Test',
        last_name: 'User',
        role: 'student'
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(mockCreateUser).toHaveBeenCalledTimes(1);
    });

    it('should throw if email already exists', async () => {
      mockFindUserByEmail.mockResolvedValue(mockUser);

      await expect(
        registerUser({
          email: 'test@example.com',
          password: 'Password123',
          first_name: 'Test',
          last_name: 'User',
          role: 'student'
        })
      ).rejects.toThrow('Email already in use');
    });

    it('should hash the password before storing', async () => {
      mockFindUserByEmail.mockResolvedValue(null);
      mockCreateUser.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        first_name: mockUser.first_name,
        last_name: mockUser.last_name,
        role: mockUser.role,
        subscription_status: 'inactive',
        current_period_end: null,
        stripe_customer_id: null,
        stripe_connect_account_id: null,
        stripe_connect_onboarded_at: null,
        created_at: mockUser.created_at,
        updated_at: mockUser.updated_at
      });

      await registerUser({
        email: 'test@example.com',
        password: 'Password123',
        first_name: 'Test',
        last_name: 'User',
        role: 'student'
      });

      const callArgs = mockCreateUser.mock.calls[0][0];
      expect(callArgs.password_hash).toBeDefined();
      expect(callArgs.password_hash).not.toBe('Password123');
      const isValid = await bcrypt.compare('Password123', callArgs.password_hash);
      expect(isValid).toBe(true);
    });
  });

  describe('loginUser', () => {
    it('should return user and token for valid credentials', async () => {
      const hash = await bcrypt.hash('Password123', 10);
      mockFindUserByEmail.mockResolvedValue({ ...mockUser, password_hash: hash });

      const result = await loginUser('test@example.com', 'Password123');

      expect(result.user.email).toBe('test@example.com');
      expect(result.token).toBeDefined();
    });

    it('should throw for non-existent email', async () => {
      mockFindUserByEmail.mockResolvedValue(null);

      await expect(loginUser('nobody@example.com', 'Password123')).rejects.toThrow(
        'Invalid credentials'
      );
    });

    it('should throw for wrong password', async () => {
      const hash = await bcrypt.hash('CorrectPassword', 10);
      mockFindUserByEmail.mockResolvedValue({ ...mockUser, password_hash: hash });

      await expect(loginUser('test@example.com', 'WrongPassword')).rejects.toThrow(
        'Invalid credentials'
      );
    });

    it('should throw for empty email', async () => {
      await expect(loginUser('', 'Password123')).rejects.toThrow('Invalid credentials');
    });
  });

  describe('verifyToken', () => {
    it('should decode a valid token', () => {
      const token = jwt.sign(
        { sub: 1, email: 'test@example.com', role: 'student' },
        'test-secret-key'
      );

      const payload = verifyToken(token);

      expect(payload.sub).toBe(1);
      expect(payload.email).toBe('test@example.com');
      expect(payload.role).toBe('student');
    });

    it('should throw for an invalid token', () => {
      expect(() => verifyToken('invalid-token')).toThrow();
    });

    it('should throw for an expired token', () => {
      const token = jwt.sign(
        { sub: 1, email: 'test@example.com', role: 'student' },
        'test-secret-key',
        { expiresIn: '0s' }
      );

      expect(() => verifyToken(token)).toThrow();
    });
  });
});
