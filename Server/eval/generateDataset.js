import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { GoogleGenerativeAI } from '@google/generative-ai';
import connectDB from '../config/mongodb.js';
import Document from '../models/DocumentModel.js';
import Chunk from '../models/ChunkModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly use GOOGLE_API_KEY
const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error('❌ GOOGLE_API_KEY is missing in environment variables.');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite' });

async function generateDataset() {
  await connectDB();

  console.log('🔍 Finding ready documents with chunks...');
  const documents = await Document.find({ status: 'ready', indexedChunks: { $gt: 0 } }).limit(5);

  if (documents.length === 0) {
    console.warn('⚠️ No ready documents found in the database. Please upload at least one PDF or DOCX first.');
    await mongoose.disconnect();
    process.exit(0);
  }

  const dataset = [];

  for (const doc of documents) {
    console.log(`\n📄 Processing document: ${doc.filename} (${doc._id})`);
    const chunks = await Chunk.find({ documentId: doc._id }).sort({ index: 1 });

    if (chunks.length === 0) continue;

    // Sample up to 5 diverse chunks per document
    const step = Math.max(1, Math.floor(chunks.length / 5));
    const sampleChunks = [];
    for (let i = 0; i < chunks.length && sampleChunks.length < 5; i += step) {
      sampleChunks.push(chunks[i]);
    }

    for (const chunk of sampleChunks) {
      try {
        const prompt = `You are creating an evaluation benchmark for a document RAG system.
Given the document passage below, generate 2 realistic, specific search questions that a user might ask whose answers are directly addressed by this passage.

Passage:
"""
${chunk.text.slice(0, 800)}
"""

Respond ONLY with valid JSON in this exact structure:
[
  { "question": "..." },
  { "question": "..." }
]`;

        const res = await model.generateContent(prompt);
        const text = res.response.text().trim();
        const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
        const parsed = JSON.parse(cleaned);

        for (const item of parsed) {
          if (item.question) {
            dataset.push({
              question: item.question,
              documentId: String(doc._id),
              userId: String(doc.userId),
              groundTruthChunkIndex: chunk.index,
              chunkSnippet: chunk.text.slice(0, 100),
            });
            console.log(`  ➕ Generated query: "${item.question.slice(0, 60)}..."`);
          }
        }
      } catch (err) {
        console.error(`  ❌ Failed to generate questions for chunk ${chunk.index}:`, err.message);
      }
    }
  }

  const outputPath = path.join(__dirname, 'dataset.json');
  await fs.writeFile(outputPath, JSON.stringify(dataset, null, 2), 'utf-8');
  console.log(`\n✅ Generated ${dataset.length} evaluation questions saved to: ${outputPath}`);

  await mongoose.disconnect();
}

generateDataset().catch((err) => {
  console.error('Dataset generation failed:', err);
  process.exit(1);
});
