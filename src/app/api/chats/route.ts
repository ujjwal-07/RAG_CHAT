import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/db";
import { Chat } from "@/db/schema";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await connectDB();

        // Fetch chats for the user, sorted by newest first
        const chats = await Chat.find({ userId: session.user.id })
            .sort({ createdAt: -1 })
            .select('_id title createdAt')
            .limit(20);

        return NextResponse.json(chats);
    } catch (error) {
        console.error("Error fetching chats:", error);
        return NextResponse.json({ error: "Failed to fetch chats" }, { status: 500 });
    }
}
