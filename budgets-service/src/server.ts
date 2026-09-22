import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app.js';
import { logger } from './utils/logger.js';

const port = process.env.PORT || 3003;
const app = createApp();

app.listen(port, () => {
  logger.info(`Budgets Service iniciado correctamente en el puerto ${port}`);
});
