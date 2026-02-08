'use server';

import { connectDB } from "@/db";
import { Chat } from "@/db/schema";
import { auth } from "@/lib/auth";

export async function deleteLastMessage(chatId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    try {
        await connectDB();
        const chat = await Chat.findOne({ _id: chatId, userId: session.user.id });

        if (!chat || chat.messages.length === 0) return { success: true };

        const lastMessage = chat.messages[chat.messages.length - 1];

        // Only delete if the last message is from 'user' (meaning assistant didn't reply yet)
        if (lastMessage.role === 'user') {
            await Chat.findByIdAndUpdate(chatId, {
                $pop: { messages: 1 }
            });
        }

        return { success: true };
    } catch (error) {
        console.error("Failed to delete last message:", error);
        return { error: "Failed to cleanup message" };
    }
}
