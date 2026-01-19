import NextAuth, { DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      profileId: string | null;
      profileCode: string | null;
      permissions: string[];
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    email: string;
    name: string;
    profileId: string | null;
    profileCode: string | null;
    permissions: string[];
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        console.log('🔐 Authorize called with:', { email: credentials?.email });
        
        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Missing credentials');
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
            include: {
              profile: {
                include: {
                  permissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          });

          console.log('👤 User found:', user ? `${user.email} (ID: ${user.id})` : 'Not found');

          if (!user || !user.isActive) {
            console.log('❌ User not found or inactive');
            return null;
          }

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          );

          console.log('🔑 Password valid:', isValid);

          if (!isValid) {
            console.log('❌ Invalid password');
            return null;
          }

          const permissions =
            user.profile?.permissions.map((p: any) => p.permission.code) || [];

          console.log('✅ Login successful for:', user.email);
          console.log('📋 Permissions:', permissions.length);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            profileId: user.profileId,
            profileCode: user.profile?.code || null,
            permissions,
          };
        } catch (error: any) {
          console.error('💥 Authorize error:', error.message);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.profileId = user.profileId;
        token.profileCode = user.profileCode;
        token.permissions = user.permissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.profileId = token.profileId as string | null;
        session.user.profileCode = token.profileCode as string | null;
        session.user.permissions = token.permissions as string[];
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
});
