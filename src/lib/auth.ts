import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { connectDB } from "@/db";
import { User } from "@/db/schema";
import { authConfig } from "@/auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
    ],
    callbacks: {
        ...authConfig.callbacks,
        async signIn({ user, account }) {
            if (account?.provider === "google") {
                try {
                    const { email, name, image } = user;
                    console.log(`[Auth] Google signIn attempt: ${email}`);
                    if (!email) return false;

                    await connectDB();
                    const existingUser = await User.findOne({ email });
                    console.log(`[Auth] User exists: ${!!existingUser}`);

                    if (!existingUser) {
                        console.log(`[Auth] Creating new user...`);
                        await User.create({
                            name: name,
                            email: email,
                            // image,
                            provider: "google",
                        });
                        console.log(`[Auth] User created successfully.`);
                    }
                    return true;
                } catch (error) {
                    console.error("[Auth] Error in signIn callback:", error);
                    return false;
                }
            }
            return true;
        },
        async jwt({ token, user, trigger, session, account }) {
            if (user) {
                try {
                    console.log(`[Auth] JWT callback for user: ${user.email}`);
                    await connectDB();

                    // Optimization: If we just signed in, we might not need to fetch again immediately if we passed data, 
                    // but for safety and consistency we fetch to get the _id and role/theme correctly.
                    const dbUser = await User.findOne({ email: user.email });

                    if (dbUser) {
                        token.id = dbUser._id.toString();
                        token.theme = dbUser.theme;
                        token.name = dbUser.name;
                        token.provider = dbUser.provider || (account?.provider === 'google' ? 'google' : 'credentials');
                    } else {
                        // Fallback if DB fetch fails but user object exists (shouldn't happen if signIn worked)
                        token.id = user.id;
                        token.provider = account?.provider;
                    }
                } catch (error) {
                    console.error("[Auth] Error in JWT callback:", error);
                    token.id = user.id;
                }
            }
            if (trigger === "update" && session) {
                token.name = session.user.name;
                token.theme = session.user.theme;
            }
            return token;
        },
    },
});
