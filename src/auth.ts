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

        // Block unverified email accounts at the credentials gate.
        // We return null (instead of throwing) so the failure surfaces as a
        // standard CredentialsSignin. The login form then calls
        // /api/check-email to distinguish "unverified" from "wrong password".
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
      // OAuth providers are inherently email-verified by the IdP — allow through
      // and stamp emailVerified if missing so the credentials gate also clears.
      if (account?.provider && account.provider !== "credentials") {
        if (user?.email) {
          await prisma.user.update({
            where: { email: user.email.toLowerCase() },
            data: {
              emailVerified: new Date(),
              // Ensure name is populated from Google profile if missing.
              name: user.name ?? undefined,
            },
          });
        }
        return true;
      }
      return true;
    },
  },
});
