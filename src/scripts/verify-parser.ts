
import { parseFile } from "../lib/rag/parser";
import * as fs from 'fs';
import * as path from 'path';

async function verifyParser() {
    const imagePath = path.join(process.cwd(), 'test_image_ocr.png');

    // Create dummy image if needed for test structure, but we need real one for OCR
    // We will assume the user or I will put one there. 
    // Actually, I should probably check if previous cleanup removed it.
    // I previously ran `del test_image_ocr.png ...` so it is GONE.
    // I need to use a buffer or restore the image.

    // Let's just create a dummy buffer that mimics an image structure enough to trigger the parser logic 
    // up to the point of worker initialization, or better yet, restore the image.

    if (!fs.existsSync(imagePath)) {
        console.log("Image not found, creating a dummy buffer for path testing...");
        // This might fail OCR but hopefully AFTER worker init 
    }

    try {
        let buffer;
        if (fs.existsSync(imagePath)) {
            buffer = fs.readFileSync(imagePath);
        } else {
            // Minimal PNG signature
            buffer = Buffer.from('89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C63000100000500010D0A2D0B0000000049454E44AE426082', 'hex');
        }

        console.log("Calling parseFile...");
        const text = await parseFile(buffer, "image/png");
        console.log("parseFile returned.");
        console.log("Text length:", text.length);
    } catch (error: any) {
        console.error("verifyParser failed:");
        console.error(error);
        if (error.code) console.error("Error Code:", error.code);
    }
}

verifyParser();
