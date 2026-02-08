import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/db";
import { Chat } from "@/db/schema";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chatId } = await params;
    const { title } = await req.json();

    if (!title || title.trim().length === 0) {
        return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    try {
        await connectDB();

        const chat = await Chat.findOneAndUpdate(
            { _id: chatId, userId: session.user.id },
            { title: title.substring(0, 100) }, // Limit title length
            { new: true }
        );

        if (!chat) {
            return NextResponse.json({ error: "Chat not found" }, { status: 404 });
        }

        return NextResponse.json(chat);
    } catch (error) {
        console.error("Error updating chat:", error);
        return NextResponse.json({ error: "Failed to update chat" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chatId } = await params;

    try {
        await connectDB();

        const chat = await Chat.findOneAndDelete({ _id: chatId, userId: session.user.id });

        if (!chat) {
            return NextResponse.json({ error: "Chat not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Chat deleted" });
    } catch (error) {
        console.error("Error deleting chat:", error);
        return NextResponse.json({ error: "Failed to delete chat" }, { status: 500 });
    }
}
