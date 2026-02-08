import { parseFile } from "../src/lib/rag/parser";
import * as fs from 'fs';
import * as path from 'path';

async function run() {
    const filePath = process.argv[2];
    if (!filePath) {
        console.error("Please provide a file path");
        process.exit(1);
    }

    console.log(`Reading file: ${filePath}`);
    const buffer = fs.readFileSync(filePath);
    const type = "image/png"; // Assuming image for now

    console.log("Parsing...");
    try {
        const text = await parseFile(buffer, type);
        console.log("Result Text:", text);
    } catch (e) {
        console.error("Script Error:", e);
    }
}

run();
