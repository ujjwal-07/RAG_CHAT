'use server';

import { connectDB } from "@/db";
import { User } from "@/db/schema";
import { redirect } from "next/navigation";

export async function logout() {
    await import("@/lib/auth").then(m => m.signOut({ redirectTo: "/login" }));
}

export async function updateProfile(formData: FormData) {
    const session = await import("@/lib/auth").then(m => m.auth());
    if (!session?.user?.id) return { error: "Unauthorized" };

    const name = formData.get("name") as string;
    const theme = formData.get("theme") as string;

    try {
        await connectDB();

        const user = await User.findById(session.user.id);
        if (!user) return { error: "User not found" };

        const updateData: any = {};
        if (name) updateData.name = name;
        if (theme) updateData.theme = theme;

        await User.findByIdAndUpdate(session.user.id, updateData);
        return { success: true };
    } catch (error) {
        console.error(error);
        return { error: "Failed to update profile" };
    }
}
