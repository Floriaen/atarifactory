import path from 'path';
import dotenv from 'dotenv';
import app from './index.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import logger from './utils/logger.js';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info('Server running on port', { port: PORT, url: `http://localhost:${PORT}` });
}); 