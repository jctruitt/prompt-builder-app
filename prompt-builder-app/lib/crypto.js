import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = join(__dirname, '..', '.env');

function loadEncryptionKey() {
  // Try environment variable first
  if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length === 64) {
    return Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  }

  // Try loading from .env file
  if (existsSync(ENV_PATH)) {
    const envContent = readFileSync(ENV_PATH, 'utf-8');
    const match = envContent.match(/^ENCRYPTION_KEY=([a-f0-9]{64})$/m);
    if (match) {
      return Buffer.from(match[1], 'hex');
    }
  }

  // Generate a new key and save to .env
  const newKey = randomBytes(32).toString('hex');
  const sessionSecret = randomBytes(32).toString('hex');
  let envContent = '';

  if (existsSync(ENV_PATH)) {
    envContent = readFileSync(ENV_PATH, 'utf-8');
  }

  if (!envContent.includes('ENCRYPTION_KEY=')) {
    envContent += `\nENCRYPTION_KEY=${newKey}\n`;
  }
  if (!envContent.includes('SESSION_SECRET=')) {
    envContent += `SESSION_SECRET=${sessionSecret}\n`;
  }

  writeFileSync(ENV_PATH, envContent.trim() + '\n');
  console.log('Generated new ENCRYPTION_KEY and SESSION_SECRET in .env file');
  console.log('IMPORTANT: Keep this .env file secure. If lost, stored API keys cannot be recovered.');

  return Buffer.from(newKey, 'hex');
}

const ENCRYPTION_KEY = loadEncryptionKey();

export function encrypt(plaintext) {
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return { encrypted, iv: iv.toString('hex'), authTag };
}

export function decrypt(encrypted, ivHex, authTagHex) {
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function loadSessionSecret() {
  if (process.env.SESSION_SECRET) {
    return process.env.SESSION_SECRET;
  }

  if (existsSync(ENV_PATH)) {
    const envContent = readFileSync(ENV_PATH, 'utf-8');
    const match = envContent.match(/^SESSION_SECRET=(.+)$/m);
    if (match) {
      return match[1].trim();
    }
  }

  return 'dev-secret-change-in-production';
}
