import mammoth from "mammoth";
import { createWorker } from "tesseract.js";
import PDFParser from "pdf2json";

type FileType = "application/pdf" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document" | string;

export async function parseFile(fileBuffer: Buffer, fileType: FileType): Promise<string> {
    try {
        if (fileType === "application/pdf") {
            const pdfParser = new (PDFParser as any)(null, true);

            return new Promise((resolve, reject) => {
                pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
                pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
                    resolve(pdfParser.getRawTextContent());
                });
                pdfParser.parseBuffer(fileBuffer);
            });
        } else if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
            const result = await mammoth.extractRawText({ buffer: fileBuffer });
            return result.value;
        } else if (fileType.startsWith("image/")) {
            const { createRequire } = await import("module");
            // const path = await import("path"); // Already imported at top? No, let's check.
            // If path is not imported at top, we need it here.
            // But verify-parser.ts failed with syntax error. likely "Identifier 'path' has already been declared"
            // Let's check the file content.
            // It seems I added `const path = await import("path");` but it might be shadowing or duplicate.

            // Re-reading confirm :: line 23 was `const { createRequire } ...`
            // line 24 was `const path ...`
            // But wait, in previous steps I had `const path = await import("path")` inside the block.
            // If I see the file, I can know for sure.

            // Looking at the view_file output from step 514 (user will provide), I see:
            /* 
            22:         } else if (fileType.startsWith("image/")) {
            23:             const { createRequire } = await import("module");
            24:             const path = await import("path");
            */
            // The error `node:internal/modules/cjs/loader:1159` usually means module not found or syntax error.
            // The previous error output `ts/verify-parser.ts` suggests the error might be in verify-parser or parser.ts

            // Actually, `path` is used in line 26: `path.join(...)`.
            // If `path` is imported as `import * as path from 'path'` at top level?
            // "src/lib/rag/parser.ts" usually imports libraries at top.
            // Let's assume I need to fix the variable name shadowing or use the top level import if available.

            // Let's just shadow it safely or use a different name to be sure.
            const pathModule = await import("path");
            // @ts-ignore
            // Manually construct path to avoid Next.js bundling virtual paths
            const workerPath = pathModule.join(process.cwd(), "node_modules", "tesseract.js", "src", "worker-script", "node", "index.js");

            console.log(`Initializing Tesseract worker with path: ${workerPath}`);
            const worker = await createWorker("eng", 1, {
                workerPath,
                logger: m => console.log(m),
                errorHandler: e => console.error('Tesseract Worker Error:', e)
            });
            console.log("Tesseract worker initialized. Recognizing...");

            // Add timeout race to prevent infinite hanging
            const recognitionPromise = worker.recognize(fileBuffer);
            const timeoutPromise = new Promise<any>((_, reject) =>
                setTimeout(() => reject(new Error("OCR Validation timed out after 30s")), 30000)
            );

            try {
                const ret = await Promise.race([recognitionPromise, timeoutPromise]);
                console.log("Recognition complete. Text length:", ret.data.text.length);
                await worker.terminate();
                return ret.data.text;
            } catch (err) {
                console.error("OCR Failed or Timed out:", err);
                await worker.terminate(); // Ensure termination
                throw err;
            }
        }
    } catch (error) {
        console.error("DETAILED_PARSING_ERROR:", error);
        if (error instanceof Error) {
            console.error("STACK:", error.stack);
        }
        return "";
    }
    return "";
}
