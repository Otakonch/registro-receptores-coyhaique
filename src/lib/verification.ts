import crypto from "crypto";
import { db } from "@/lib/db";

export type TokenPurpose = "password-reset";

const TTL_MS: Record<TokenPurpose, number> = {
  "password-reset": 60 * 60 * 1000,
};

function identifierFor(purpose: TokenPurpose, email: string) {
  return `${purpose}:${email.toLowerCase().trim()}`;
}

export function generateTokenValue(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createVerificationToken(purpose: TokenPurpose, email: string) {
  const normalized = email.toLowerCase().trim();
  const identifier = identifierFor(purpose, normalized);
  const token = generateTokenValue();
  const expires = new Date(Date.now() + TTL_MS[purpose]);

  await db.verificationToken.deleteMany({ where: { identifier } });

  await db.verificationToken.create({
    data: { identifier, token, expires },
  });

  return { token, expires };
}

export async function consumeVerificationToken(purpose: TokenPurpose, token: string) {
  const record = await db.verificationToken.findUnique({ where: { token } });
  if (!record) return null;

  const prefix = `${purpose}:`;
  if (!record.identifier.startsWith(prefix)) return null;
  if (record.expires < new Date()) {
    await db.verificationToken.delete({ where: { token } });
    return null;
  }

  const email = record.identifier.slice(prefix.length);

  await db.verificationToken.delete({ where: { token } });

  return { email };
}

export function buildAuthUrl(path: string, token: string) {
  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  return `${base}${path}?token=${encodeURIComponent(token)}`;
}
