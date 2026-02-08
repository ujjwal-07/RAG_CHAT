import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseFile } from "@/lib/rag/parser";
import { chunkText } from "@/lib/rag/chunker";
import { getEmbeddings } from "@/lib/rag/embeddings";
import { connectDB } from "@/db";
import { File as FileModel, Chunk } from "@/db/schema";
import * as fs from 'fs';
import * as path from 'path';

export async function POST(req: NextRequest) {
    console.log("Upload request received");
    const logPath = path.join(process.cwd(), 'public', 'upload_debug.log');

    // Ensure directory exists
    const logDir = path.dirname(logPath);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    const log = (msg: string) => {
        const timestamp = new Date().toISOString();
        try {
            fs.appendFileSync(logPath, `[${timestamp}] ${msg}\n`);
        } catch (e) {
            console.error("Failed to write to log file:", e);
        }
    };

    log("----- NEW UPLOAD REQUEST -----");

    try {
        log("Checking auth...");
        const session = await auth();
        if (!session?.user?.id) {
            log("Unauthorized access attempt");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        log(`User authorized: ${session.user.id}`);

        log("Reading form data...");
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            log("No file uploaded");
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }
        log(`File received: ${file.name}, type: ${file.type}, size: ${file.size}`);

        const allowedTypes = [
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!allowedTypes.includes(file.type)) {
            log(`Invalid file type: ${file.type}`);
            return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
        }

        log("Connecting to DB...");
        try {
            await connectDB();
            log("Connected to DB");
        } catch (dbErr: any) {
            log(`DB Connection failed: ${dbErr.message}`);
            throw dbErr;
        }

        log("Reading file buffer...");
        const buffer = Buffer.from(await file.arrayBuffer());
        log(`File buffer created, size: ${buffer.length}`);

        log(`Parsing file with type ${file.type}...`);
        let text = "";
        try {
            text = await parseFile(buffer, file.type);
            log(`File parsed, text length: ${text ? text.length : 0}`);
        } catch (parseErr: any) {
            log(`Parsing failed: ${parseErr.message}`);
            throw parseErr;
        }

        if (!text || !text.trim()) {
            log("No text extracted from file");
            return NextResponse.json({ error: "No text was found in the document. Please try a clearer image or document." }, { status: 400 });
        }

        // Store file metadata
        log("Creating file record in MongoDB...");
        const fileRecord = await FileModel.create({
            userId: session.user.id,
            name: file.name,
            type: file.type,
            url: "",
            size: file.size,
        });
        log(`File record created: ${fileRecord._id}`);

        log("Chunking text...");
        const textChunks = await chunkText(text);
        log(`Text chunked, chunks: ${textChunks.length}`);

        // Generate embeddings and store
        log("Generating embeddings...");
        for (let i = 0; i < textChunks.length; i++) {
            const chunk = textChunks[i];
            try {
                // log(`Embedding chunk ${i + 1}/${textChunks.length}...`);
                const embedding = await getEmbeddings(chunk);
                if (embedding.length > 0) {
                    await Chunk.create({
                        fileId: fileRecord._id,
                        content: chunk,
                        embedding,
                    });
                }
            } catch (e: any) {
                log(`Error creating embedding for chunk ${i}: ${e.message}`);
                console.error("Error creating embedding for chunk", e);
            }
        }
        log("Chunks stored. Upload processing complete.");

        return NextResponse.json({ message: "Completed you can ask your questions now", fileId: fileRecord._id });

    } catch (error: any) {
        log(`FATAL Upload error: ${error.message}\nStack: ${error.stack}`);
        console.error("Upload error details:", error);
        return NextResponse.json({ error: "Failed to process file" }, { status: 500 });
    }
}
