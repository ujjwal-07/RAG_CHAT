import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { connectDB } from "@/db"
import { User } from "@/db/schema"
import { authConfig } from "@/auth.config"

import Google from "next-auth/providers/google"

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
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
