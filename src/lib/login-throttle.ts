import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { db } from "@/lib/db";

const windowMs = 15 * 60 * 1000;
function key(scope: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must contain at least 32 characters");
  return createHmac("sha256", secret).update(scope).digest("hex");
}

// Reserve attempts BEFORE bcrypt. PostgreSQL serializes concurrent upserts on
// this key, including the first request and expired-window resets.
async function reserve(scope: string, limit: number): Promise<boolean> {
  const hashed = key(scope);
  const now = new Date();
  const cutoff = new Date(now.getTime() - windowMs);
  const rows = await db.$queryRaw<{ failures: number }[]>`
    INSERT INTO "LoginThrottle" ("key", "failures", "windowStart", "updatedAt")
    VALUES (${hashed}, 1, ${now}, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "failures" = CASE WHEN "LoginThrottle"."windowStart" <= ${cutoff}
        THEN 1 ELSE LEAST("LoginThrottle"."failures" + 1, ${limit + 1}) END,
      "windowStart" = CASE WHEN "LoginThrottle"."windowStart" <= ${cutoff}
        THEN ${now} ELSE "LoginThrottle"."windowStart" END,
      "blockedUntil" = NULL, "updatedAt" = ${now}
    RETURNING "failures"`;
  // Bound retention; no emails or raw IP addresses are stored.
  await db.loginThrottle.deleteMany({ where: { windowStart: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } });
  return rows[0].failures <= limit;
}

export async function allowLoginAttempt(email: string, headers: Pick<Headers, "get">): Promise<boolean> {
  // Only trust the forwarding header injected by our Vercel deployment.
  // Other hosts share a fallback bucket until a trusted proxy is configured.
  const candidate = process.env.VERCEL === "1" ? headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() : undefined;
  const address = candidate && isIP(candidate) ? candidate : "untrusted-proxy";
  if (!await reserve(`login-ip:${address}`, 50)) return false;
  return reserve(`login-account:${email.trim().toLowerCase()}`, 10);
}

export async function clearLoginFailures(email: string): Promise<void> {
  await db.loginThrottle.deleteMany({ where: { key: key(`login-account:${email.trim().toLowerCase()}`) } });
}

export async function allowPasswordConfirmation(userId: string): Promise<boolean> {
  return reserve(`password-confirmation:${userId}`, 5);
}
