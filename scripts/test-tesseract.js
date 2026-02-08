const { createWorker } = require('tesseract.js');
const fs = require('fs');
const path = require('path');

async function testTesseract() {
    console.log("Initializing worker...");
    try {
        const worker = await createWorker('eng');
        console.log("Worker initialized successfully.");
        await worker.terminate();
        console.log("Worker terminated.");
    } catch (error) {
        console.error("Tesseract Error:", error);
    }
}

testTesseract();
