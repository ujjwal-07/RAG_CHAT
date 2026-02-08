import { HfInference } from "@huggingface/inference";

const hf = new HfInference(process.env.HF_ACCESS_TOKEN);

export async function getEmbeddings(text: string): Promise<number[]> {
    try {
        const result = await hf.featureExtraction({
            model: "sentence-transformers/all-MiniLM-L6-v2",
            inputs: text,
        });

        if (Array.isArray(result)) {
            if (result.length > 0 && Array.isArray(result[0])) {
                const first = result[0];
                if (Array.isArray(first)) return first as number[];
            }
            return result as number[];
        }
        return [];
    } catch (error) {
        console.error("Error generating embeddings:", error);
        throw error;
    }
}
