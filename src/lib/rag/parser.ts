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
            const worker = await createWorker('eng');
            const ret = await worker.recognize(fileBuffer);
            await worker.terminate();
            return ret.data.text;
        }
    } catch (error) {
        console.error("Error parsing file:", error);
        // throw new Error("Failed to parse file content");
        return "";
    }
    return "";
}
