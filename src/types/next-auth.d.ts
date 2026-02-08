import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
    interface Session {
        user: {
            theme?: string
        } & DefaultSession["user"]
    }

    interface User {
        theme?: string
    }
}
