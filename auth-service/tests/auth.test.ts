import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { defaultUserRepository } from '../src/repositories/userRepository.js';
import { sanitizeObject } from '../src/utils/logger.js';
import { sessionValidator } from '../src/modules/session/sessionValidator.js';
import { comparePassword, BCRYPT_SALT_ROUNDS } from '../src/utils/password.js';

const app = createApp();

describe('Auth Service - Reglas de Seguridad y Flujos de Autenticación', () => {
  beforeEach(async () => {
    await defaultUserRepository.clear();
  });

  describe('Directiva: Hashing de Contraseñas (bcrypt 12 rondas)', () => {
    it('debe utilizar 12 rondas de costo y almacenar la contraseña hasheada, nunca en texto plano', async () => {
      expect(BCRYPT_SALT_ROUNDS).toBe(12);

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'luciano@example.com',
          password: 'Password123!',
          name: 'Luciano Developer'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.user.password).toBeUndefined();
      expect(res.body.data.user.passwordHash).toBeUndefined();

      const storedUser = await defaultUserRepository.findByEmail('luciano@example.com');
      expect(storedUser).toBeDefined();
      expect(storedUser!.passwordHash).not.toBe('Password123!');
      expect(storedUser!.passwordHash.startsWith('$2')).toBe(true);

      // Verificar que el hash sea válido contra la contraseña ingresada
      const isValid = await comparePassword('Password123!', storedUser!.passwordHash);
      expect(isValid).toBe(true);
    });
  });

  describe('Directiva: Logging seguro y sanitización', () => {
    it('debe enmascarar contraseñas, tokens y hashes en cualquier estructura de datos', () => {
      const payload = {
        email: 'test@example.com',
        password: 'superSecretPassword',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy',
        nested: {
          passwordHash: '$2a$12$e8r038...',
          authorization: 'Bearer eyJhbGciOiJIUzI1Ni...',
          refreshToken: 'refresh-token-value'
        }
      };

      const sanitized = sanitizeObject(payload) as any;
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.nested.passwordHash).toBe('[REDACTED]');
      expect(sanitized.nested.authorization).toBe('[REDACTED]');
      expect(sanitized.nested.refreshToken).toBe('[REDACTED]');
      expect(sanitized.email).toBe('test@example.com');
    });
  });

  describe('POST /api/auth/register', () => {
    it('debe registrar un usuario exitosamente y devolver token y safe user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'maria@example.com',
          password: 'MiPasswordSegura123',
          name: 'Maria Perez'
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Usuario registrado exitosamente');
      expect(res.body.data.user).toMatchObject({
        email: 'maria@example.com',
        name: 'Maria Perez',
        isActive: true
      });
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it('debe rechazar registro si el correo ya existe (409 Conflict)', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicado@example.com',
          password: 'Password123!',
          name: 'Usuario 1'
        });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicado@example.com',
          password: 'OtraPassword123!',
          name: 'Usuario 2'
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('debe rechazar registros con datos inválidos (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'no-es-email',
          password: 'corta',
          name: 'A'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'login.test@example.com',
          password: 'PasswordValida123!',
          name: 'Login Test'
        });
    });

    it('debe iniciar sesión con credenciales correctas', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login.test@example.com',
          password: 'PasswordValida123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe('login.test@example.com');
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it('debe rechazar contraseña errónea con 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login.test@example.com',
          password: 'PasswordIncorrecta'
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('debe rechazar email no existente con 401 genérico', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'inexistente@example.com',
          password: 'Password123!'
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('Directiva: Validación central de sesión (sessionValidator) y GET /api/auth/verify', () => {
    let validToken: string;
    let userId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'session.test@example.com',
          password: 'MiPassword123!',
          name: 'Session Test'
        });

      validToken = res.body.data.token;
      userId = res.body.data.user.id;
    });

    it('debe validar la sesión exitosamente a través del módulo central con header Bearer', async () => {
      const res = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.session).toMatchObject({
        userId,
        email: 'session.test@example.com',
        name: 'Session Test',
        isActive: true
      });
    });

    it('debe validar la sesión invocando directamente a sessionValidator', async () => {
      const validation = await sessionValidator.validateSession(`Bearer ${validToken}`);
      expect(validation.valid).toBe(true);
      expect(validation.user.userId).toBe(userId);
    });

    it('debe rechazar cuando no se proporciona header Authorization (401)', async () => {
      const res = await request(app).get('/api/auth/verify');
      expect(res.status).toBe(401);
      expect(res.body.valid).toBe(false);
      expect(res.body.error.code).toBe('MISSING_TOKEN');
    });

    it('debe rechazar token manipulado o con firma errónea (401)', async () => {
      const fakeToken = jwt.sign({ userId: 'fake', email: 'fake@example.com' }, 'wrong-secret');
      const res = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${fakeToken}`);

      expect(res.status).toBe(401);
      expect(res.body.valid).toBe(false);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    it('debe rechazar token expirado (401)', async () => {
      const expiredToken = jwt.sign(
        { userId, email: 'session.test@example.com' },
        process.env.JWT_SECRET || 'centavo-default-secret-key-change-in-prod',
        { expiresIn: '-1s' }
      );

      const res = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.valid).toBe(false);
      expect(res.body.error.code).toBe('SESSION_EXPIRED');
    });
  });

  describe('GET /api/auth/me (Ruta protegida con requireAuth)', () => {
    it('debe retornar el perfil del usuario autenticado', async () => {
      const reg = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'me.test@example.com',
          password: 'PasswordMe123!',
          name: 'Me Profile'
        });

      const token = reg.body.data.token;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('me.test@example.com');
      expect(res.body.user.name).toBe('Me Profile');
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('debe devolver 401 si no se envía token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('MISSING_TOKEN');
    });
  });

  describe('GET /health', () => {
    it('debe devolver status ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('auth-service');
    });
  });
});
