import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export async function chunkText(text: string): Promise<string[]> {
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });
    // createDocuments returns Document object with pageContent
    const output = await splitter.createDocuments([text]);
    return output.map((doc: any) => doc.pageContent);
}
