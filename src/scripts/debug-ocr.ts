
import { createWorker } from "tesseract.js";
import * as fs from 'fs';
import * as path from 'path';

async function testOCR() {
    const imagePath = path.join(process.cwd(), 'test_image_ocr.png');

    if (!fs.existsSync(imagePath)) {
        console.error(`Test image not found at ${imagePath}`);
        return;
    }

    const buffer = fs.readFileSync(imagePath);
    console.log(`Read file ${imagePath}, size: ${buffer.length}`);

    // Test 1: Current Configuration (CDN)
    console.log("\n--- Test 1: Current Configuration (CDN) ---");
    try {
        const worker = await createWorker("eng", 1, {
            workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@v5.0.0/dist/worker.min.js",
            logger: m => console.log(`[CDN] ${m.status}: ${m.progress}`),
            errorHandler: e => console.error('[CDN] Error:', e)
        });
        const ret = await worker.recognize(buffer);
        console.log("Result Text Length:", ret.data.text.length);
        console.log("Result Text Preview:", ret.data.text.substring(0, 100));
        await worker.terminate();
    } catch (e) {
        console.error("Test 1 Failed:", e);
    }

    // Test 2: Standard Configuration (Node default)
    console.log("\n--- Test 2: Standard Configuration (Default) ---");
    try {
        const worker = await createWorker("eng", 1, {
            logger: m => console.log(`[Std] ${m.status}: ${m.progress}`),
        });
        const ret = await worker.recognize(buffer);
        console.log("Result Text Length:", ret.data.text.length);
        console.log("Result Text Preview:", ret.data.text.substring(0, 100));
        await worker.terminate();
    } catch (e) {
        console.error("Test 2 Failed:", e);
    }
}

testOCR();
