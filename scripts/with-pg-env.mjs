import "./load-pg-env.mjs";
import { spawnSync } from "child_process";

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error("Uso: node scripts/with-pg-env.mjs <comando> [args...]");
  process.exit(1);
}

const result = spawnSync(command, args, {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 1);
