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

        // Validate Session ID format (simple check)
        if (!session.user.id.match(/^[0-9a-fA-F]{24}$/)) {
            // If ID is not a valid ObjectId (e.g. it's a UUID from Google), return empty or handle it.
            // This happens if the user session hasn't updated yet.
            console.warn(`Invalid MongoDB ObjectId for user: ${session.user.id}. Likely stale session.`);
            return NextResponse.json([]);
        }

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
