import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { requireAuth } from '../modules/session/authMiddleware.js';

export const authRouter = Router();

// Endpoints públicos
authRouter.post('/register', (req, res) => authController.register(req, res));
authRouter.post('/login', (req, res) => authController.login(req, res));

// Endpoint de verificación de sesión (consume el módulo central)
authRouter.get('/verify', (req, res) => authController.verifySession(req, res));

// Endpoint de perfil protegido (pasa por el middleware que utiliza el módulo central)
authRouter.get('/me', requireAuth, (req, res) => authController.getMe(req, res));
