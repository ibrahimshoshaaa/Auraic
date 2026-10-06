import { createHmac, timingSafeEqual } from "node:crypto";

export function credentialVersion(passwordHash: string, secret: string): string {
  return createHmac("sha256", secret).update(passwordHash).digest("hex");
}

export function credentialsMatch(version: unknown, passwordHash: string | null, secret: string): boolean {
  if (typeof version !== "string" || !/^[a-f0-9]{64}$/.test(version) || !passwordHash) return false;
  return timingSafeEqual(Buffer.from(version, "hex"), Buffer.from(credentialVersion(passwordHash, secret), "hex"));
}

export function validNewPassword(password: string): boolean {
  // bcrypt's limit is bytes, not JS characters (Arabic consumes multiple bytes).
  return password.length >= 12 && Buffer.byteLength(password, "utf8") <= 72;
}
