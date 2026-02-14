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
    let previousMessages: any[] = [];

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
        // Load previous messages for context (limit to last 6 for brevity)
        previousMessages = chat.messages.slice(-6).map((msg: any) => ({
            role: msg.role,
            content: msg.content
        }));
    }

    // Add user message to DB
    await Chat.findByIdAndUpdate(currentChatId, {
        $push: { messages: { role: 'user', content: message } }
    });

    // Get embedding for query
    const queryEmbedding = await getEmbeddings(message);

    // Retrieve context
    let context = "";

    // Debug logging
    const fs = await import('fs');
    const path = await import('path');
    const logPath = path.join(process.cwd(), 'public', 'chat_debug.log');
    const log = (msg: string) => {
        try { fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`); } catch (e) { }
    };

    log(`Processing message: "${message}" | ChatID: ${currentChatId} | FileID: ${currentFileId}`);

    if (currentFileId) {
        // Fetch all chunks for the file
        const chunks = await Chunk.find({ fileId: currentFileId });
        log(`Found ${chunks.length} chunks for file ${currentFileId}`);

        if (queryEmbedding.length > 0) {
            const scoredChunks = chunks.map(chunk => ({
                content: chunk.content,
                score: cosineSimilarity(chunk.embedding, queryEmbedding)
            })).sort((a, b) => b.score - a.score).slice(0, 3);

            log(`Top 3 chunks scores: ${scoredChunks.map(c => c.score.toFixed(4)).join(', ')}`);

            const lowerCaseMessage = message.toLowerCase();
            const isContextQuery = lowerCaseMessage.includes("upload") ||
                lowerCaseMessage.includes("file") ||
                lowerCaseMessage.includes("document") ||
                lowerCaseMessage.includes("picture") ||
                lowerCaseMessage.includes("image") ||
                lowerCaseMessage.includes("what is this") ||
                lowerCaseMessage.includes("summarize") ||
                lowerCaseMessage.includes("summary");

            const threshold = isContextQuery ? 0.05 : 0.25;

            if (scoredChunks.length > 0 && scoredChunks[0].score > threshold) {
                context = scoredChunks.map(c => c.content).join("\n\n");
                log(`Context found via Vector Search. Length: ${context.length}`);
            } else if (lowerCaseMessage.includes("summarize") || lowerCaseMessage.includes("summary") || lowerCaseMessage.includes("what is this")) {
                // Fallback: If asking for summary but vector search failed (e.g. "summarize" keyword not in text),
                // just grab the first few chunks of the document to give an overview.
                log("Vector search failed for summary/overview. Falling back to first 3 chunks.");
                // Assuming chunks are inserted in order. If not, might need to sort by some index if available.
                // For now, take first 3 from the DB fetch (which usually preserves insertion order for capped/simple collections, or we rely on chance)
                // Better: Chunk schema should probably have an index/sequence number, but for now we slice the raw list.
                const firstChunks = chunks.slice(0, 3);
                context = firstChunks.map(c => c.content).join("\n\n");
            } else {
                log(`No relevant context found (score ${scoredChunks[0]?.score} < ${threshold}).`);
            }
        }
    }

    // Generate response using LLM (Mistral/Qwen)
    let responseText = "I could not find relevant information.";
    let contextFound = false;

    const systemPrompt = `You are a helpful assistant powered by RAG (Retrieval Augmented Generation).
    1. Use the provided "Context" to answer the user's question.
    2. If the answer is not in the context, but the user is asking about the document (e.g. "summarize", "what is this"), use the provided context to give the best possible answer.
    3. If the user refers to previous messages (e.g. "what did I just say?"), refer to the conversation history.
    4. If the question is completely unrelated to the document or history (e.g. "who is the president of US"), you can answer generally but mention you are focused on the document.`;

    // Construct messages array with history
    const llmMessages = [
        { role: "system", content: systemPrompt },
        ...previousMessages, // Inject history
        { role: "user", content: `Context:\n${context || "No specific context found from document search."}\n\nQuestion: ${message}` }
    ];

    if (context) {
        contextFound = true;
        log("Sending request to LLM with context...");
        try {
            // Use chatCompletion for better compatibility with instruction models
            const response = await hf.chatCompletion({
                model: "Qwen/Qwen2.5-7B-Instruct",
                messages: llmMessages,
                max_tokens: 500
            });
            responseText = response.choices[0].message.content || "I could not generate a response.";
        } catch (err) {
            console.error("LLM Error:", err);
            log(`LLM Error (Context): ${err}`);
            responseText = "Sorry, I am unable to generate a response at the moment.";
        }
    } else {
        log("Sending request to LLM WITHOUT context...");
        try {
            const response = await hf.chatCompletion({
                model: "Qwen/Qwen2.5-7B-Instruct", // Switch to same model as RAG for consistency
                messages: [
                    { role: "system", content: "You are a helpful assistant designed to answer questions about uploaded documents. The user's query did not match any content in the uploaded file.\n\nRules:\n1. If the user's message is a greeting (e.g., 'hi', 'hello') or a pleasantry (e.g., 'thanks'), answer politely and ask them to ask a question about the document.\n2. If the user asks a general question (e.g., 'who is the president?', 'what is 2+2?', 'is modi good?'), REFUSE to answer. State clearly: \"I can only answer questions strictly related to the uploaded document.\"\n3. Do not attempt to answer general knowledge questions." },
                    { role: "user", content: message }
                ],
                max_tokens: 500
            });
            responseText = response.choices[0].message.content || "I could not generate a response.";
        } catch (err) {
            console.error("LLM Error:", err);
            log(`LLM Error (No Context): ${err}`);
            responseText = "I'm having trouble connecting to the AI services right now. Please try again later.";
        }
    }

    log("Response generated successfully.");

    // Store assistant message
    await Chat.findByIdAndUpdate(currentChatId, {
        $push: { messages: { role: 'assistant', content: responseText } }
    });

    return NextResponse.json({ message: responseText, chatId: currentChatId, contextFound });
}
