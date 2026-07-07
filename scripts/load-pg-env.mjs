import "./load-env.mjs";

function buildDatabaseUrl() {
  const host = process.env.PG_HOST ?? "localhost";
  const port = process.env.PG_PORT ?? "5432";
  const database = process.env.PG_DATABASE ?? "postgres";
  const user = process.env.PG_USER ?? "postgres";
  const password = encodeURIComponent(process.env.PG_PASSWORD ?? "");

  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}

const databaseUrl = buildDatabaseUrl();
process.env.DATABASE_URL = databaseUrl;
process.env.DIRECT_URL = databaseUrl;
