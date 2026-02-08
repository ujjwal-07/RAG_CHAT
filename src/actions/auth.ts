'use server';

import { hash } from "bcryptjs";
import { connectDB } from "@/db";
import { User } from "@/db/schema";
import { redirect } from "next/navigation";

export async function registerUser(prevState: any, formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const name = formData.get("name") as string;

    if (!email || !password) {
        return { error: "Email and password are required" };
    }

    try {
        await connectDB();

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return { error: "User already exists" };
        }

        const hashedPassword = await hash(password, 10);

        await User.create({
            email,
            password: hashedPassword,
            name,
        });
    } catch (err) {
        console.error("Registration error:", err);
        return { error: "Failed to register user" };
    }


    redirect("/login");
}

export async function logout() {
    await import("@/lib/auth").then(m => m.signOut({ redirectTo: "/login" }));
}

export async function sendOtp(formData: FormData) {
    const phoneNumber = formData.get("phoneNumber") as string;

    if (!phoneNumber) return { error: "Phone number is required" };

    try {
        await connectDB();

        // Generate Mock OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        // Upsert user (create if not exists)
        let user = await User.findOne({ phoneNumber });
        if (!user) {
            user = await User.create({
                phoneNumber,
                provider: 'phone',
                name: 'Mobile User',
                email: `${phoneNumber}@mobile.temp`, // Dummy email to satisfy schema if required, or remove required constraint
                password: '', // No password
            });
        }

        user.otp = otp;
        user.otpExpires = otpExpires;
        await user.save();

        console.log(`[MOCK OTP] For ${phoneNumber}: ${otp}`); // For Dev

        return { success: true, message: "OTP sent (Check server console)" };
    } catch (error) {
        console.error("OTP Error:", error);
        return { error: "Failed to send OTP" };
    }
}

export async function updateProfile(formData: FormData) {
    const session = await import("@/lib/auth").then(m => m.auth());
    if (!session?.user?.id) return { error: "Unauthorized" };

    const name = formData.get("name") as string;
    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const theme = formData.get("theme") as string;

    try {
        await connectDB();

        const user = await User.findById(session.user.id);
        if (!user) return { error: "User not found" };

        const updateData: any = {};
        if (name) updateData.name = name;
        if (theme) updateData.theme = theme;

        if (newPassword) {
            if (!currentPassword) {
                return { error: "Current password is required to set a new password" };
            }

            // Only check password if user has a password (might be oauth/otp user)
            if (user.password) {
                const passwordsMatch = await import("bcryptjs").then(m => m.compare(currentPassword, user.password));
                if (!passwordsMatch) {
                    return { error: "Incorrect current password" };
                }
            }

            updateData.password = await import("bcryptjs").then(m => m.hash(newPassword, 10));
        }

        await User.findByIdAndUpdate(session.user.id, updateData);
        return { success: true };
    } catch (error) {
        console.error(error);
        return { error: "Failed to update profile" };
    }
}
