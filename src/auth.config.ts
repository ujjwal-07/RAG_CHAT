import type { NextAuthConfig } from "next-auth"

export const authConfig = {
    pages: {
        signIn: "/login",
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user
            const isAuthPage = nextUrl.pathname === "/login"

            // Allow auth pages
            if (isAuthPage) {
                if (isLoggedIn) return Response.redirect(new URL("/", nextUrl))
                return true
            }

            // Allow API routes and static assets (handled by matcher in middleware, but good to double check)
            if (nextUrl.pathname.startsWith("/api") || nextUrl.pathname.startsWith("/_next") || nextUrl.pathname.includes(".")) {
                return true
            }

            // Protect other routes
            if (!isLoggedIn) {
                return false // Redirect to login
            }
            return true
        },
        async jwt({ token, user, trigger, session }: { token: any; user?: any; trigger?: string; session?: any }) {
            if (user) {
                token.id = user.id;
                token.theme = user.theme;
                token.name = user.name;
            }
            if (trigger === "update" && session) {
                token.name = session.user.name;
                token.theme = session.user.theme;
            }
            return token
        },
        async session({ session, token }: { session: any, token: any }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.theme = token.theme as string;
                session.user.name = token.name as string;
                // @ts-ignore
                session.user.provider = token.provider as string;
            }
            return session
        },
    },

    providers: [], // Providers added in auth.ts
    session: {
        strategy: "jwt",
    },
    trustHost: true,
} satisfies NextAuthConfig
