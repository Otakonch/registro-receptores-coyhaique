export type PgConfig = {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
};

export function getPgConfig(): PgConfig {
  return {
    host: process.env.PG_HOST ?? "localhost",
    port: Number(process.env.PG_PORT ?? "5432"),
    database: process.env.PG_DATABASE ?? "postgres",
    user: process.env.PG_USER ?? "postgres",
    password: process.env.PG_PASSWORD ?? "",
  };
}

export function buildDatabaseUrl(config: PgConfig = getPgConfig()): string {
  const { host, port, database, user, password } = config;
  return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}
