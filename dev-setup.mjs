/**
 * dev-setup.mjs
 * Orden correcto:
 *  1. Inicia Next.js (npm run dev) en puerto 3000
 *  2. Espera que el puerto 3000 esté escuchando
 *  3. Inicia tunnelmole y captura la URL pública
 *  4. Actualiza NEXTAUTH_URL en .env.local
 *  5. Reinicia Next.js con la URL correcta
 */
import { spawn }          from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { createConnection } from "net";
import { fileURLToPath }  from "url";
import { dirname, join }  from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath   = join(__dirname, ".env.local");

const C = {
  green: "\x1b[32m", cyan: "\x1b[36m", yellow: "\x1b[33m",
  red: "\x1b[31m", reset: "\x1b[0m", bold: "\x1b[1m",
};
const log = (m) => console.log(`${C.cyan}[setup]${C.reset} ${m}`);
const ok  = (m) => console.log(`${C.green}✔${C.reset}  ${m}`);
const err = (m) => console.error(`${C.red}✘${C.reset}  ${m}`);

// ── Utilidad: esperar a que el puerto TCP esté disponible ─────────────────────
function waitForPort(port, timeout = 60_000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function attempt() {
      const sock = createConnection({ port, host: "127.0.0.1" });
      sock.on("connect", () => { sock.destroy(); resolve(); });
      sock.on("error", () => {
        sock.destroy();
        if (Date.now() - start > timeout) {
          reject(new Error(`Puerto ${port} no disponible después de ${timeout / 1000}s`));
        } else {
          setTimeout(attempt, 500);
        }
      });
    }
    attempt();
  });
}

// ── Utilidad: iniciar proceso y devolver el objeto child ──────────────────────
function startProcess(cmd, args, opts = {}) {
  return spawn(cmd, args, { cwd: __dirname, shell: true, ...opts });
}

// ── Utilidad: actualizar NEXTAUTH_URL en .env.local ───────────────────────────
function updateEnvUrl(url) {
  let env = readFileSync(envPath, "utf8");
  if (/^NEXTAUTH_URL=/m.test(env)) {
    env = env.replace(/^NEXTAUTH_URL=.*/m, `NEXTAUTH_URL="${url}"`);
  } else {
    env += `\nNEXTAUTH_URL="${url}"\n`;
  }
  writeFileSync(envPath, env, "utf8");
}

// ── PASO 0: liberar el puerto 3000 si hay un proceso anterior ────────────────
log("Verificando si el puerto 3000 está en uso...");
try {
  // Buscar PID usando el puerto 3000 y matarlo (Windows)
  const findPid = spawn(
    "cmd", ["/c", `for /f "tokens=5" %a in ('netstat -aon ^| findstr :3000') do taskkill /PID %a /F`],
    { cwd: __dirname, shell: false, stdio: "pipe" }
  );
  await new Promise((r) => findPid.on("close", r));
  await new Promise((r) => setTimeout(r, 800)); // pausa para que el puerto quede libre
  ok("Puerto 3000 liberado (o ya estaba libre).");
} catch { /* ignorar errores — el puerto puede no haber estado en uso */ }

// ── PASO 1: arrancar Next.js ──────────────────────────────────────────────────
log("Iniciando Next.js (primera vez, sin URL de tunnelmole aún)...");
let nextProc = startProcess("npm", ["run", "dev"], { stdio: "inherit" });

nextProc.on("error", (e) => { err(`Error al iniciar Next.js: ${e.message}`); process.exit(1); });

// ── PASO 2: esperar puerto 3000 ────────────────────────────────────────────────
log("Esperando que Next.js esté listo en el puerto 3000...");
try {
  await waitForPort(3000, 90_000);
} catch (e) {
  err(e.message);
  nextProc.kill();
  process.exit(1);
}
ok("Next.js listo en puerto 3000.");

// ── PASO 3: arrancar tunnelmole ────────────────────────────────────────────────
log("Iniciando tunnelmole...");
const tmProc = startProcess("npx", ["tunnelmole", "3000"],
  { stdio: ["ignore", "pipe", "pipe"] });

const tunnelmoleUrl = await new Promise((resolve, reject) => {
  const TIMEOUT = 45_000;
  const timer = setTimeout(() => reject(new Error("Tiempo agotado esperando URL de tunnelmole")), TIMEOUT);

  function scan(data) {
    const text = data.toString();
    process.stdout.write(`${C.yellow}[tunnelmole]${C.reset} ${text}`);
    const match = text.match(/https?:\/\/[\w.-]+tunnelmole\.net\S*/);
    if (match) {
      clearTimeout(timer);
      resolve(match[0].replace(/[/\s]+$/, ""));
    }
  }

  tmProc.stdout.on("data", scan);
  tmProc.stderr.on("data", scan);
  tmProc.on("close", (code) => {
    clearTimeout(timer);
    reject(new Error(`Tunnelmole terminó inesperadamente (código ${code})`));
  });
});

ok(`URL pública obtenida: ${C.bold}${tunnelmoleUrl}${C.reset}`);

// ── PASO 4: actualizar .env.local ─────────────────────────────────────────────
try {
  updateEnvUrl(tunnelmoleUrl);
  ok(`.env.local actualizado → NEXTAUTH_URL="${tunnelmoleUrl}"`);
} catch (e) {
  err(`No se pudo actualizar .env.local: ${e.message}`);
}

// ── PASO 5: reiniciar Next.js con la URL correcta ─────────────────────────────
console.log(`\n${C.cyan}══════════════════════════════════════════${C.reset}`);
log("Reiniciando Next.js con la nueva NEXTAUTH_URL...");
console.log(`${C.cyan}══════════════════════════════════════════${C.reset}\n`);

nextProc.kill("SIGTERM");
await new Promise((r) => setTimeout(r, 1500)); // pequeña pausa para liberar el puerto

nextProc = startProcess("npm", ["run", "dev"], { stdio: "inherit" });
nextProc.on("error", (e) => { err(`Error al reiniciar Next.js: ${e.message}`); });

// ── Cierre limpio ──────────────────────────────────────────────────────────────
function shutdown() {
  log("Deteniendo servicios...");
  nextProc.kill();
  tmProc.kill();
  process.exit(0);
}
process.on("SIGINT",  shutdown);
process.on("SIGTERM", shutdown);

nextProc.on("close", (code) => {
  log(`Next.js terminó (código ${code}).`);
  tmProc.kill();
  process.exit(code ?? 0);
});
