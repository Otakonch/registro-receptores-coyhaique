import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { validateEmail } from "@/lib/utils";

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  authEnabled: boolean;
  user: string;
  pass: string;
};

export type SmtpValidationResult = {
  valid: boolean;
  errors: string[];
  config?: SmtpConfig;
};

const PLACEHOLDER_PATTERNS = [
  /CONTRASEÑA/i,
  /REEMPLAZAR/i,
  /app_password/i,
  /contraseña_o/i,
  /placeholder/i,
  /^tu_/i,
  /^pega_aqui/i,
];

export function isPlaceholderValue(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function isSmtpAuthEnabled(): boolean {
  return process.env.SMTP_AUTH !== "false";
}

export function getSmtpConfigFromEnv(): SmtpConfig {
  const authEnabled = isSmtpAuthEnabled();
  return {
    host: process.env.SMTP_HOST?.trim() ?? "",
    port: parseInt(process.env.SMTP_PORT ?? "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    authEnabled,
    user: process.env.SMTP_USER?.trim() ?? "",
    pass: process.env.SMTP_PASS ?? "",
  };
}

export function validateSmtpConfig(
  raw: Partial<SmtpConfig> = getSmtpConfigFromEnv()
): SmtpValidationResult {
  const errors: string[] = [];
  const host = raw.host?.trim() ?? "";
  const port = raw.port ?? parseInt(process.env.SMTP_PORT ?? "587", 10);
  const secure = raw.secure ?? process.env.SMTP_SECURE === "true";
  const authEnabled = raw.authEnabled ?? isSmtpAuthEnabled();
  const user = raw.user?.trim() ?? "";
  const pass = raw.pass ?? "";

  if (!host) errors.push("SMTP_HOST es obligatorio.");
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push("SMTP_PORT debe ser un número entre 1 y 65535.");
  }
  if (!user) errors.push("SMTP_USER es obligatorio (correo remitente, ej. no-reply@coyhaique.cl).");
  else if (!validateEmail(user)) errors.push("SMTP_USER debe ser un correo válido.");

  if (authEnabled) {
    if (!pass.trim()) errors.push("SMTP_PASS es obligatorio cuando SMTP_AUTH=true.");
    else if (isPlaceholderValue(pass)) {
      errors.push("SMTP_PASS sigue siendo un valor de ejemplo.");
    }
  }

  if (errors.length > 0) return { valid: false, errors };

  return {
    valid: true,
    errors: [],
    config: { host, port, secure, authEnabled, user, pass },
  };
}

export function createSmtpTransporter(config: SmtpConfig) {
  const options: SMTPTransport.Options = {
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: !config.secure && config.port === 587,
    tls: { minVersion: "TLSv1.2" },
  };

  if (config.authEnabled) {
    options.auth = { user: config.user, pass: config.pass };
  }

  return nodemailer.createTransport(options);
}

export function getSmtpFromAddress(user: string): string {
  return `"Municipalidad de Coyhaique" <${user}>`;
}
