import { getRagCacheFromDB, saveRagCacheToDB } from './indexedDb';
import { db, auth } from './firebase';
import { collection, getDocs } from 'firebase/firestore';

interface VectorDocument {
  text: string;
  embedding: number[];
  metadata: Record<string, any>;
}

const vectorIndex: VectorDocument[] = [];
let isIndexLoaded = false;

// Server-side lazy initialization of Gemini AI instance
let serverAiInstance: any = null;
async function getServerAi() {
  if (serverAiInstance) return serverAiInstance;
  if (typeof window === 'undefined') {
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
  return null;
}

// Load index from Firestore on demand
async function ensureIndexLoaded() {
  if (isIndexLoaded) return;
  try {
    const snapshot = await getDocs(collection(db, 'vector_chunks'));
    snapshot.forEach(doc => {
      const data = doc.data();
      vectorIndex.push({
        text: data.text,
        embedding: data.embedding,
        metadata: data.metadata
      });
    });
    isIndexLoaded = true;
  } catch (error) {
    console.error('Failed to load vector index in ragService.ts. Details:', error);
  }
}

/**
 * Generates an embedding for the given text using Gemini's embedding model (server-side only).
 */
async function getEmbedding(text: string): Promise<number[]> {
  const ai = await getServerAi();
  if (!ai) {
    throw new Error('Embeddings cannot be computed in the browser directly; proxy via backend endpoint.');
  }
  const result = await ai.models.embedContent({
    model: "gemini-embedding-2-preview",
    contents: text,
  });
  if (!result.embeddings || result.embeddings.length === 0) {
    throw new Error("No embedding returned");
  }
  return result.embeddings[0].values!;
}

/**
 * Chunks and indexes a legal document for RAG.
 */
export async function indexLegalDocument(text: string, metadata: Record<string, any>) {
  // Simple chunking - in a real app, this would be more sophisticated
  const chunks = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  for (const chunk of chunks) {
    const embedding = await getEmbedding(chunk.trim());
    vectorIndex.push({
      text: chunk.trim(),
      embedding,
      metadata
    });
  }
}

/**
 * Performs a cosine similarity search against the local vector index.
 */
export async function searchLegalDocuments(query: string, topK: number = 3): Promise<VectorDocument[]> {
  // If running in browser, proxy through backend API to preserve server-side API key isolation
  if (typeof window !== 'undefined') {
    try {
      const cachedResults = await getRagCacheFromDB(query);
      if (cachedResults && cachedResults.length > 0) return cachedResults;
    } catch (e) {
      // cache miss
    }

    try {
      let authHeader = '';
      if (auth?.currentUser) {
        authHeader = await auth.currentUser.getIdToken().catch(() => '');
      }
      const res = await fetch('/api/rag-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: `Bearer ${authHeader}` } : {}),
        },
        body: JSON.stringify({ query, topK }),
      });

      if (!res.ok) {
        console.warn('Backend RAG search endpoint returned status:', res.status);
        return [];
      }

      const results = await res.json();
      if (Array.isArray(results)) {
        await saveRagCacheToDB(query, results).catch(() => {});
        return results;
      }
      return [];
    } catch (err) {
      console.warn('Browser RAG search failed:', err);
      return [];
    }
  }

  // Server-side execution
  await ensureIndexLoaded();
  
  // Check cache
  const cachedResults = await getRagCacheFromDB(query);
  if (cachedResults) return cachedResults;

  try {
    const queryEmbedding = await getEmbedding(query);
    
    const similarities = vectorIndex.map(doc => ({
      doc,
      similarity: cosineSimilarity(queryEmbedding, doc.embedding)
    }));
    
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    const results = similarities.slice(0, topK).map(s => s.doc);
    
    // Save to cache
    await saveRagCacheToDB(query, results);
    
    return results;
  } catch (err) {
    console.warn('Server RAG vector search error:', err);
    return [];
  }
}
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

import { cleanLegalArtifacts, cleanRagChunk, formatRagResultsToEssay } from '../utils/legalProseFormatter';

export { cleanLegalArtifacts, cleanRagChunk, formatRagResultsToEssay };

/**
 * Formats a list of vector search documents into clean, elegant narrative legal prose.
 */
export function formatRagDocumentCollection(
  docs: VectorDocument[],
  options: { title?: string; language?: 'om' | 'am' | 'en' } = {}
): string {
  return formatRagResultsToEssay(docs, options);
}

/**
 * Sanitizes an individual vector document by stripping asterisks and internal labels.
 */
export function cleanVectorDocument(doc: VectorDocument): VectorDocument {
  return {
    ...doc,
    text: cleanRagChunk(doc.text),
  };
}
