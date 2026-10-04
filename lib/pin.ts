import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

export function hashPin(pin: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(pin, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPin(pin: string, stored: string) {
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;
  const hash = scryptSync(pin, salt, 64);
  const saved = Buffer.from(key, 'hex');
  return saved.length === hash.length && timingSafeEqual(saved, hash);
}
