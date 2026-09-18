import { auth } from "@/auth";
import AppShell from "@/components/app-shell";

export default async function HomePage() {
  const session = await auth();
  const userEmail = session?.user?.email;

  if (!userEmail) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg p-6 text-ink">
        <div className="w-full max-w-sm rounded-3xl border border-hairline bg-card p-6 text-center">
          <h1 className="text-2xl font-semibold">Tilly Tracker</h1>
          <p className="mt-2 text-sm text-ink-soft">Melde dich mit einem freigeschalteten Google-Konto an.</p>
          <a className="mt-6 inline-flex rounded-full bg-ink px-5 py-3 text-sm font-medium text-white" href="/api/auth/signin/google">
            Mit Google anmelden
          </a>
        </div>
      </main>
    );
  }

  return <AppShell userEmail={userEmail} />;
}
