import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const derive = promisify(scrypt);
export function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = (await derive(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${hash.toString('hex')}`;
}
export async function verifyPassword(
  password: string,
  encoded: string,
): Promise<boolean> {
  const [algorithm, salt, hex] = encoded.split('$');
  if (algorithm !== 'scrypt' || !salt || !hex || !/^[a-f0-9]{128}$/.test(hex))
    return false;
  const actual = (await derive(password, salt, 64)) as Buffer;
  return timingSafeEqual(actual, Buffer.from(hex, 'hex'));
}
