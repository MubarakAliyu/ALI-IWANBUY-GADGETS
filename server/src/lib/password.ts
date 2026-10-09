/**
 * Passwords (overview §6.4): bcrypt at cost 12. Nothing outside this module ever sees a plaintext password
 * beyond the request that carried it, and a hash is never logged or returned.
 */

import bcrypt from "bcryptjs";

const COST = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
