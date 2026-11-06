import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..', '..');

// Try loading .env from current working directory or backend root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(backendRoot, '.env') });

const port = Number.parseInt(process.env.PORT || '5000', 10);
const parsedPort = Number.isInteger(port) && port > 0 && port <= 65535 ? port : 5000;

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : ['http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:8081', 'http://127.0.0.1:8081'];

function resolveDataPath() {
  const configured = process.env.DATA_FILE_PATH || './data/notes.json';
  if (path.isAbsolute(configured)) {
    return configured;
  }
  return path.resolve(backendRoot, configured);
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  port: parsedPort,
  host: process.env.HOST || '127.0.0.1',
  corsOrigins,
  dataFilePath: resolveDataPath(),
};
