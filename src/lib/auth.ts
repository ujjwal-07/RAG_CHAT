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
                    if (!email) return false;

                    await connectDB();
                    const existingUser = await User.findOne({ email });

                    if (!existingUser) {
                        await User.create({
                            name: name,
                            email: email,
                            // image,
                            provider: "google",
                        });
                    }
                    return true;
                } catch (error) {
                    console.log("Error checking if user exists: ", error);
                    return false;
                }
            }
            return true;
        },
        async jwt({ token, user, trigger, session, account }) {
            if (user) {
                try {
                    await connectDB();
                    const dbUser = await User.findOne({ email: user.email });
                    if (dbUser) {
                        token.id = dbUser._id.toString();
                        token.theme = dbUser.theme;
                        token.name = dbUser.name;
                        token.provider = dbUser.provider || (account?.provider === 'google' ? 'google' : 'credentials');
                    } else {
                        token.id = user.id;
                        token.provider = account?.provider;
                    }
                } catch (error) {
                    console.error("Error fetching user in JWT callback:", error);
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
