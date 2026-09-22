import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app.js';
import { logger } from './utils/logger.js';
import { authService } from './services/authService.js';

const port = process.env.PORT || 3001;
const app = createApp();

async function start() {
  try {
    await authService.register({
      email: 'demo@centavo.app',
      password: 'centavo123',
      name: 'Usuario Demo',
    });
    logger.info('Usuario de prueba demo@centavo.app inicializado correctamente');
  } catch (err) {
    // Ya existe o inicializado
  }

  app.listen(port, () => {
    logger.info(`Auth Service iniciado correctamente en el puerto ${port}`);
  });
}

start();

