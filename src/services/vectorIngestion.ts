import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';
let serverAiInstance: any = null;
async function getServerAi() {
  if (serverAiInstance) return serverAiInstance;
  const { GoogleGenAI } = await import('@google/genai');
  serverAiInstance = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
  return serverAiInstance;
}

async function getPdfParser() {
  const { createRequire } = await import('module');
  const req = createRequire(import.meta.url);
  return req('pdf-parse');
}

/**
 * Parses and indexes a legal document into Firestore as vector chunks.
 */
export async function ingestLegalDocument(fileBuffer: Buffer, fileName: string, metadata: Record<string, any>) {
  // 1. Extract text
  let text = "";
  if (fileName.endsWith('.pdf')) {
    const pdfParse = await getPdfParser();
    const data = await pdfParse(fileBuffer);
    text = data.text;
  } else {
    text = fileBuffer.toString('utf-8');
  }

  // 2. Chunking
  const chunks = text.match(/[^.!?]+[.!?]+/g) || [text];

  // 3. Generate embeddings and store in Firestore
  const chunksCollection = collection(db, 'vector_chunks');
  for (const chunk of chunks) {
    const trimmedChunk = chunk.trim();
    if (trimmedChunk.length < 50) continue; // Skip very short chunks

    const ai = await getServerAi();
    const embeddingResult = await ai.models.embedContent({
      model: "gemini-embedding-2-preview",
      contents: trimmedChunk,
    });
    
    if (embeddingResult.embeddings && embeddingResult.embeddings.length > 0) {
      await addDoc(chunksCollection, {
        text: trimmedChunk,
        embedding: embeddingResult.embeddings[0].values,
        metadata: { ...metadata, fileName },
        createdAt: new Date()
      });
    }
  }
}
