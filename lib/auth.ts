import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

const COOKIE = 'kk_sesi';
const OWNER_COOKIE = 'kk_pemilik';

type Session = { licenseId: string; code: string; exp: number };
type OwnerSession = { owner: true; exp: number };

function secret() {
  return process.env.SESSION_SECRET || 'dev-kelaskita-session-secret-change-me';
}
function sign(payload: string) {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}
function encode(value: object) {
  const payload = Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${payload}.${sign(payload)}`;
}
function decode<T>(token?: string): T | null {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const got = Buffer.from(sig);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
  try {
    const obj = JSON.parse(Buffer.from(payload, 'base64url').toString()) as T & { exp?: number };
    if (obj.exp && obj.exp < Date.now()) return null;
    return obj;
  } catch { return null; }
}

export async function setSession(licenseId: string, code: string) {
  const store = await cookies();
  store.set(COOKIE, encode({ licenseId, code, exp: Date.now() + 1000 * 60 * 60 * 24 * 14 }), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 14,
  });
}
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return decode<Session>(store.get(COOKIE)?.value);
}
export async function clearSession() { const store = await cookies(); store.delete(COOKIE); }

export async function setOwnerSession() {
  const store = await cookies();
  store.set(OWNER_COOKIE, encode({ owner: true, exp: Date.now() + 1000 * 60 * 60 * 8 }), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8,
  });
}
export async function getOwnerSession(): Promise<OwnerSession | null> {
  const store = await cookies();
  return decode<OwnerSession>(store.get(OWNER_COOKIE)?.value);
}
export async function clearOwnerSession() { const store = await cookies(); store.delete(OWNER_COOKIE); }
