import "./load-env.mjs";
import nodemailer from "nodemailer";

const PLACEHOLDER_PATTERNS = [
  /CONTRASEÑA/i,
  /REEMPLAZAR/i,
  /app_password/i,
  /contraseña_o/i,
  /placeholder/i,
];

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email.trim());
}

function isPlaceholder(value) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function getConfig() {
  const authEnabled = process.env.SMTP_AUTH !== "false";
  return {
    host: process.env.SMTP_HOST?.trim() ?? "",
    port: parseInt(process.env.SMTP_PORT ?? "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    authEnabled,
    user: process.env.SMTP_USER?.trim() ?? "",
    pass: process.env.SMTP_PASS ?? "",
  };
}

function validateConfig(config) {
  const errors = [];

  if (!config.host) errors.push("SMTP_HOST es obligatorio.");
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
    errors.push("SMTP_PORT debe ser un número entre 1 y 65535.");
  }
  if (!config.user) errors.push("SMTP_USER es obligatorio.");
  else if (!validateEmail(config.user)) errors.push("SMTP_USER debe ser un correo válido.");
  if (config.authEnabled) {
    if (!config.pass.trim()) errors.push("SMTP_PASS es obligatorio cuando SMTP_AUTH=true.");
    else if (isPlaceholder(config.pass)) {
      errors.push("SMTP_PASS sigue siendo un valor de ejemplo.");
    }
  }

  return errors;
}

const args = process.argv.slice(2);
const sendIdx = args.indexOf("--send");
const sendTest = sendIdx !== -1;
let toArg =
  args.find((arg) => arg.startsWith("--to="))?.slice(5) ||
  process.env.SMTP_TEST_TO;

if (!toArg && sendTest) {
  const positional = args.slice(sendIdx + 1).find((arg) => !arg.startsWith("--"));
  if (positional) toArg = positional;
}

const config = getConfig();
const errors = validateConfig(config);

console.log("=== Validación SMTP ===");
console.log(`Host:   ${config.host || "(vacío)"}`);
console.log(`Puerto: ${config.port}`);
console.log(`TLS:    ${config.secure ? "SSL directo (465)" : "STARTTLS (587)"}`);
console.log(`Auth:   ${config.authEnabled ? "sí" : "no (relay interno)"}`);
console.log(`Usuario:${config.user || "(vacío)"}`);
console.log(`Clave:  ${config.pass ? "********" : "(vacía)"}`);

if (errors.length > 0) {
  console.error("\nErrores de configuración:");
  for (const error of errors) console.error(`  - ${error}`);
  console.error("\nEdita las variables SMTP en el archivo .env");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: config.host,
  port: config.port,
  secure: config.secure,
  requireTLS: !config.secure && config.port === 587,
  tls: { minVersion: "TLSv1.2" },
  connectionTimeout: 15_000,
  greetingTimeout: 15_000,
  socketTimeout: 30_000,
  ...(config.authEnabled ? { auth: { user: config.user, pass: config.pass } } : {}),
});

try {
  console.log("\nVerificando conexión con el servidor SMTP...");
  await transporter.verify();
  console.log("Conexión SMTP verificada correctamente.");
} catch (error) {
  console.error("\nNo se pudo conectar al servidor SMTP:");
  console.error(`  ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}

if (!sendTest) {
  console.log("\nPara enviar un correo de prueba:");
  console.log("  npm run smtp:send -- mauricio.aranedas@gmail.com");
  console.log("  node scripts/test-smtp.mjs --send mauricio.aranedas@gmail.com");
  process.exit(0);
}

const destination = toArg || config.user;

if (!validateEmail(destination)) {
  console.error("\nCorreo de destino inválido. Usa --to=correo@ejemplo.cl");
  process.exit(1);
}

try {
  console.log(`\nEnviando correo de prueba a ${destination}...`);
  await transporter.sendMail({
    from: `"Municipalidad de Coyhaique" <${config.user}>`,
    to: destination,
    subject: "Prueba SMTP — Registro de Receptores",
    html: "<p>Correo de prueba enviado correctamente desde el sistema municipal.</p>",
  });
  console.log("Correo de prueba enviado.");
} catch (error) {
  console.error("\nLa conexión fue válida, pero falló el envío:");
  const message = error instanceof Error ? error.message : String(error);
  console.error(`  ${message}`);
  if (/550|relay|authentication/i.test(message)) {
    console.error("\nEl servidor SMTP no permite enviar a correos externos sin autenticación.");
    console.error("Pide a TI una de estas opciones:");
    console.error("  1) Credenciales SMTP (Outlook: smtp.office365.com:587 + SMTP_AUTH=true)");
    console.error("  2) Whitelist de la IP del servidor para relay sin clave");
    console.error("  3) Cuenta de servicio relay con usuario y contraseña");
  }
  process.exit(1);
}
