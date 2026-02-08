import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/db";
import { Chat, Chunk } from "@/db/schema";
import { HfInference } from "@huggingface/inference";
import { getEmbeddings } from "@/lib/rag/embeddings";

const hf = new HfInference(process.env.HF_ACCESS_TOKEN);

function cosineSimilarity(a: number[], b: number[]) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chatId, message, fileId } = await req.json();

    if (!message) {
        return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    await connectDB();

    let currentChatId = chatId;
    let currentFileId = fileId;

    // Create new chat if not provided
    if (!currentChatId) {
        if (!currentFileId) {
            return NextResponse.json({ error: "File ID is required to start a chat" }, { status: 400 });
        }

        const newChat = await Chat.create({
            userId: session.user.id,
            fileId: currentFileId,
            title: message.substring(0, 50),
            messages: []
        });
        currentChatId = newChat._id;
    } else {
        // Verify owner and get fileId
        const chat = await Chat.findOne({ _id: currentChatId, userId: session.user.id });
        if (!chat) {
            return NextResponse.json({ error: "Chat not found" }, { status: 404 });
        }
        currentFileId = chat.fileId;
    }

    // Add user message
    await Chat.findByIdAndUpdate(currentChatId, {
        $push: { messages: { role: 'user', content: message } }
    });

    // Get embedding for query
    const queryEmbedding = await getEmbeddings(message);

    // Retrieve context
    let context = "";
    if (currentFileId && queryEmbedding.length > 0) {
        // Fetch all chunks for the file (Not efficient for large datasets, but ok for MVP/Local)
        const chunks = await Chunk.find({ fileId: currentFileId });

        const scoredChunks = chunks.map(chunk => ({
            content: chunk.content,
            score: cosineSimilarity(chunk.embedding, queryEmbedding)
        })).sort((a, b) => b.score - a.score).slice(0, 3);

        context = scoredChunks.map(c => c.content).join("\n\n");
    }

    // Generate response using LLM (Mistral)
    let responseText = "I could not find relevant information.";

    const systemPrompt = `You are a helpful assistant. Use the following context to answer the question. If the answer is not in the context, say so but if the asked question is related to context or any word present in the document than answer it if it is not just tell me you are supposed to answer based on the context and the data provided.`;
    const prompt = `Context:\n${context}\n\nQuestion: ${message}\nAnswer:`;

    if (context) {
        try {
            // Use chatCompletion for better compatibility with instruction models
            const response = await hf.chatCompletion({
                model: "Qwen/Qwen2.5-7B-Instruct",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Context:\n${context}\n\nQuestion: ${message}` }
                ],
                max_tokens: 500
            });
            responseText = response.choices[0].message.content || "I could not generate a response.";
        } catch (err) {
            console.error("LLM Error:", err);
            responseText = "Sorry, I am unable to generate a response at the moment.";
        }
    } else {
        try {
            const response = await hf.chatCompletion({
                model: "mistralai/Mistral-7B-Instruct-v0.3",
                messages: [
                    { role: "system", content: "You are a helpful assistant." },
                    { role: "user", content: message }
                ],
                max_tokens: 500
            });
            responseText = response.choices[0].message.content || "I could not generate a response.";
        } catch (err) {
            console.error("LLM Error:", err);
        }
    }

    // Store assistant message
    await Chat.findByIdAndUpdate(currentChatId, {
        $push: { messages: { role: 'assistant', content: responseText } }
    });

    return NextResponse.json({ message: responseText, chatId: currentChatId });
}
