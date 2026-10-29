export async function register() {
  // Node-spezifischer Code liegt in einer eigenen Datei (offizielles Next-Muster), damit er
  // nicht für die Edge-Runtime gebündelt wird.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runStartupMigrations } = await import("./instrumentation-node");
    runStartupMigrations();
  }
}
