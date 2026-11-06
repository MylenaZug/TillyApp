import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Nur diese beiden Google-Konten duerfen sich anmelden.
const allowedEmails = (process.env.ALLOWED_GOOGLE_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// Ausserhalb von Production komplett am echten Auth-Flow vorbei: kein Google-OAuth
// noetig, um lokal zu entwickeln.
const isDev = process.env.NODE_ENV !== "production";
const devUserEmail = process.env.DEV_USER_EMAIL || "dev@localhost";

const nextAuth = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      return allowedEmails.includes(user.email.toLowerCase());
    },
    async session({ session }) {
      return session;
    },
  },
});

export const { handlers, signIn, signOut } = nextAuth;

// Nur die parameterlose Variante wird in diesem Projekt verwendet (Pages/Route Handlers),
// daher hier bewusst kein Passthrough der Middleware-Ueberladung von NextAuth.
export async function auth() {
  if (isDev) {
    return {
      user: { email: devUserEmail, name: "Dev User" },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }
  return nextAuth.auth();
}
