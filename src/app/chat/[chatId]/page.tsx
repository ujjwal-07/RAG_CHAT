import ChatInterface from "@/components/chat-interface";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/db";
import { Chat } from "@/db/schema";

export default async function ChatPage({ params }: { params: Promise<{ chatId: string }> }) {
    const session = await auth();
    if (!session?.user) {
        redirect("/login");
    }

    const { chatId } = await params;

    try {
        await connectDB();

        const chat = await Chat.findOne({ _id: chatId, userId: session.user.id });

        if (!chat) redirect("/");

        const formattedMessages = chat.messages.map((msg: any) => ({
            id: msg._id.toString(),
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            createdAt: msg.createdAt?.toISOString()
        }));

        return <ChatInterface initialChatId={chatId} initialMessages={formattedMessages} user={session.user} />;
    } catch (error) {
        redirect("/"); // Redirect if chat not found or valid
    }
}
