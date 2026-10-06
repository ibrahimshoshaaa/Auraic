import { createSign } from "node:crypto";

type Credentials = { project_id: string; client_email: string; private_key: string };
export type PushMessage = { title: string; body: string; data: Record<string, string>; tag: string };
let cached: { key: string; token: string; expiresAt: number } | undefined;

export function pushConfigured() { return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON); }

export function invalidDeviceToken(payload: unknown): boolean {
  const value = payload as { error?: { details?: { errorCode?: string }[] } };
  return value?.error?.details?.some(detail => detail.errorCode === "UNREGISTERED") ?? false;
}

async function accessToken(credentials: Credentials, key: string) {
  if (cached?.key === key && cached.expiresAt > Date.now() + 60000) return cached.token;
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
    iss: credentials.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600,
  })}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(credentials.private_key, "base64url");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", signal: AbortSignal.timeout(10000),
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
  });
  const result = await response.json();
  if (!response.ok || typeof result.access_token !== "string") throw new Error("FCM authorization failed");
  cached = { key, token: result.access_token, expiresAt: Date.now() + Number(result.expires_in || 3600) * 1000 };
  return cached.token;
}

export async function sendPush(token: string, message: PushMessage): Promise<"sent" | "invalid"> {
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!key) throw new Error("FCM is not configured");
  const credentials = JSON.parse(key) as Credentials;
  if (!/^[a-z0-9-]+$/.test(credentials.project_id) || !credentials.client_email || !credentials.private_key) {
    throw new Error("Invalid FCM credentials");
  }
  const bearer = await accessToken(credentials, key);
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${credentials.project_id}/messages:send`, {
    method: "POST", signal: AbortSignal.timeout(10000),
    headers: { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message: { token,
      notification: { title: message.title, body: message.body }, data: message.data,
      android: { priority: "HIGH", ttl: "86400s", notification: {
        tag: message.tag, icon: "ic_stat_auraic", color: "#3F3A60", sound: "default",
      } },
    } }),
  });
  if (response.ok) return "sent";
  const result: unknown = await response.json().catch(() => null);
  if (invalidDeviceToken(result)) return "invalid";
  if (response.status === 401) cached = undefined;
  // Never include tokens, credentials or customer data in an error/log.
  throw new Error(`FCM send failed (${response.status})`);
}
