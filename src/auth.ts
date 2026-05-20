import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";
import authConfig from "@/auth.config";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }
  interface User {
    role: UserRole;
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  // Cast: @auth/prisma-adapter ships an older @auth/core type that doesn't
  // know about our custom `role` field — works at runtime.
  adapter: PrismaAdapter(prisma) as never,
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            // Auto-link Google accounts to an existing user with the same email.
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (creds) => {
        const parsed = credentialsSchema.safeParse(creds);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;

        // Suspended (e.g. fraud) and unverified accounts are rejected here.
        // We return null (not throw) so it surfaces as a standard
        // CredentialsSignin; the login form calls /api/check-email to tell
        // "blocked" / "unverified" / "wrong password" apart.
        if (user.blocked) return null;
        if (!user.emailVerified) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      // Reject suspended accounts regardless of provider.
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email.toLowerCase() },
          select: { blocked: true },
        });
        if (dbUser?.blocked) return false;
      }
      // OAuth providers are inherently email-verified by the IdP — allow through
      // and stamp emailVerified if missing so the credentials gate also clears.
      if (account?.provider && account.provider !== "credentials") {
        if (user?.email) {
          await prisma.user.update({
            where: { email: user.email.toLowerCase() },
            data: {
              emailVerified: new Date(),
              name: user.name ?? undefined,
            },
          });
        }
      }
      return true;
    },
  },
});
