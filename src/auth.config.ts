import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@prisma/client";

// Edge-safe NextAuth config: no DB adapter, no bcrypt — used by middleware.
// The jwt/session callbacks live here (not in auth.ts) so middleware also
// receives the populated session.user.role on every request.
const authConfig = {
  pages: { signIn: "/login", error: "/login" },
  providers: [],
  session: {
    strategy: "jwt",
    // Absolute session lifetime: 1 hour. Combined with the client-side
    // IdleTimeout component, an idle session is invalidated both client-
    // and server-side.
    maxAge: 60 * 60,
    // Re-issue the token on access if it's older than 15 min — keeps an
    // actively-navigating user signed in past the 1-hour mark.
    updateAge: 15 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: UserRole }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? (token.sub as string);
        session.user.role = (token.role as UserRole) ?? "CUSTOMER";
      }
      return session;
    },
    authorized({ auth: session, request }) {
      const { pathname } = request.nextUrl;
      const isAdminPath = pathname.startsWith("/admin");
      const isCustomerPath = pathname.startsWith("/dashboard");
      const isAuthPath = pathname === "/login" || pathname === "/signup";

      const role = session?.user?.role as UserRole | undefined;

      if (isAdminPath) {
        if (!session?.user) return false;
        return role === "ADMIN";
      }
      if (isCustomerPath) return !!session?.user;
      if (isAuthPath && session?.user) {
        const url = role === "ADMIN" ? "/admin" : "/dashboard";
        return Response.redirect(new URL(url, request.url));
      }
      return true;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
