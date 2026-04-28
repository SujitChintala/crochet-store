import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

const ITERATIONS = 120000;
const KEY_LENGTH = 64;
const DIGEST = "sha512";
const HASH_PREFIX = "pbkdf2";

export function hashPassword(password: string) {
  const normalized = password.trim();

  if (!normalized) {
    throw new Error("Password is required.");
  }

  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(normalized, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString("hex");
  return `${HASH_PREFIX}$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const normalized = password.trim();
  const parts = storedHash.split("$");

  if (parts.length !== 3 || parts[0] !== HASH_PREFIX) {
    return false;
  }

  const [, salt, hash] = parts;
  const derived = pbkdf2Sync(normalized, salt, ITERATIONS, KEY_LENGTH, DIGEST);
  const expected = Buffer.from(hash, "hex");

  if (derived.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(derived, expected);
}
