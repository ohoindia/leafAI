import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = new URL('../', import.meta.url);
const input = dotenv.parse(fs.readFileSync(new URL('.env', root)));
const keys = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_SSL', 'DB_SSL_CA',
  'OPENAI_API_KEY', 'OPENAI_VISION_MODEL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET',
  'UPLOAD_ENCRYPTION_KEY', 'ALLOWED_ORIGINS', 'UPLOAD_BUCKET'];
const Variables = Object.fromEntries(keys.filter(key => input[key] !== undefined).map(key => [key, input[key]]));
Object.assign(Variables, { NODE_ENV: 'production', DB_CONNECTION_LIMIT: '2', MAX_UPLOAD_BYTES: '4194304', TRUST_PROXY: '0' });
const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'OPENAI_API_KEY', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'UPLOAD_ENCRYPTION_KEY', 'UPLOAD_BUCKET'];
const missing = required.filter(key => !Variables[key]);
if (missing.length) throw new Error(`Set these values in server/.env first: ${missing.join(', ')}`);
if (Variables.DB_SSL === 'true' && !Variables.DB_SSL_CA) throw new Error('DB_SSL_CA is required when DB_SSL=true.');
if (Variables.JWT_ACCESS_SECRET.length < 32 || Variables.JWT_REFRESH_SECRET.length < 32 || !/^[a-f\d]{64}$/i.test(Variables.UPLOAD_ENCRYPTION_KEY)) throw new Error('JWT secrets must be at least 32 characters; UPLOAD_ENCRYPTION_KEY must be 64 hexadecimal characters.');
const bytes = Object.entries(Variables).reduce((sum, [key, value]) => sum + Buffer.byteLength(key) + Buffer.byteLength(value), 0);
if (bytes > 4096) throw new Error('Lambda environment exceeds 4 KB. Use a smaller appropriate CA certificate or the optional Secrets Manager deployment.');
const output = new URL('lambda-environment.json', root);
fs.writeFileSync(output, JSON.stringify({ Variables }, null, 2), { mode: 0o600 });
console.log(`Created ${fileURLToPath(output)}; contents are secret and ignored by Git. Values were not printed.`);
