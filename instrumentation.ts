export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { sqlite } = await import("./db/client");
  const { runMigrations } = await import("./db/migrate");
  runMigrations(sqlite);
}
