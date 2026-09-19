import { auth, signIn } from "@/auth";
import AppShell from "@/components/app-shell";

async function signInWithGoogle() {
  "use server";
  await signIn("google");
}

export default async function HomePage() {
  const session = await auth();
  const userEmail = session?.user?.email;

  if (!userEmail) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg p-6 text-ink">
        <div className="w-full max-w-sm rounded-3xl border border-hairline bg-card p-6 text-center">
          <h1 className="text-2xl font-semibold">Tilly Tracker</h1>
          <p className="mt-2 text-sm text-ink-soft">Melde dich mit einem freigeschalteten Google-Konto an.</p>
          <form action={signInWithGoogle}>
            <button className="mt-6 inline-flex rounded-full bg-ink px-5 py-3 text-sm font-medium text-white" type="submit">
              Mit Google anmelden
            </button>
          </form>
        </div>
      </main>
    );
  }

  return <AppShell userEmail={userEmail} />;
}
