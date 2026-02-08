import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { connectDB } from "@/db"
import { User } from "@/db/schema"
import { authConfig } from "@/auth.config"

import Google from "next-auth/providers/google"

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    callbacks: {
        ...authConfig.callbacks,
        async signIn({ user, account }) {
            if (account?.provider === "google") {
                try {
                    const { email, name, image, id } = user;
                    if (!email) return false;

                    await connectDB();
                    const existingUser = await User.findOne({ email });

                    if (!existingUser) {
                        await User.create({
                            name: name,
                            email: email,
                            // image, // Schema doesn't have image field yet, maybe add it later?
                            provider: "google",
                            // Ensure other required fields are handled or optional
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
                // When signing in, user object is available.
                // We need to fetch the MongoDB _id if it's not already set correctly.
                try {
                    await connectDB();
                    const dbUser = await User.findOne({ email: user.email });
                    if (dbUser) {
                        token.id = dbUser._id.toString();
                        token.theme = dbUser.theme;
                        token.name = dbUser.name;
                        token.provider = dbUser.provider || (account?.provider === 'google' ? 'google' : 'credentials');
                    } else {
                        // Fallback if user creation failed or race condition (shouldn't happen with signIn callback)
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
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
        Credentials({
            credentials: {
                email: {},
                password: {},
                phoneNumber: {},
                otp: {},
                type: {} // 'email' or 'phone'
            },
            authorize: async (credentials) => {
                await connectDB();

                // Phone / OTP Login
                if (credentials?.type === 'phone') {
                    if (!credentials.phoneNumber || !credentials.otp) return null;

                    const user = await User.findOne({ phoneNumber: credentials.phoneNumber });
                    if (!user) return null;

                    // Verify OTP (In real prod, use a service. Here we check DB for mock/temp OTP)
                    if (user.otp !== credentials.otp || new Date() > user.otpExpires) {
                        return null;
                    }

                    // Clear OTP after successful login
                    await User.findByIdAndUpdate(user._id, { $unset: { otp: 1, otpExpires: 1 } });

                    return {
                        id: String(user._id),
                        email: user.email || user.phoneNumber, // Fallback if no email
                        name: user.name || "Mobile User",
                        theme: user.theme || "indigo",
                    };
                }

                // Email / Password Login
                if (!credentials?.email || !credentials?.password) return null

                const user = await User.findOne({ email: credentials.email });

                if (!user || user.provider !== 'credentials') return null // Prevent password login if user registered via Google/Phone only

                const passwordsMatch = await compare(credentials.password as string, user.password)

                if (!passwordsMatch) return null

                return {
                    id: String(user._id),
                    email: user.email,
                    name: user.name,
                    theme: user.theme || "indigo",
                }
            },
        }),
    ],
})
