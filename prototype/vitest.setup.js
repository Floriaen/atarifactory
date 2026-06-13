// Ensure .env files are loaded for Vitest runs (repo root + server/.env fallback)
import dotenv from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverEnvPath = path.join(__dirname, 'server', '.env');

if (existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath, override: false });
}
