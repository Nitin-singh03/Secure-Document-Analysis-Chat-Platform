import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import connectDB from '../config/mongodb.js';
import { generateEmbedding } from '../vectorUtils.js';
import { retrieveChunks } from '../retrieval.js';
import { exactRetrieveChunks } from './exactSearch.js';
import Chunk from '../models/ChunkModel.js';
import Document from '../models/DocumentModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runEval() {
  await connectDB();

  const datasetPath = path.join(__dirname, 'dataset.json');
  let dataset = [];

  try {
    const raw = await fs.readFile(datasetPath, 'utf-8');
    dataset = JSON.parse(raw);
  } catch {
    console.log('⚠️ dataset.json not found. Creating a baseline dataset from DB chunks...');
    const chunks = await Chunk.find().limit(10);
    if (chunks.length === 0) {
      console.error('❌ No chunks in database to evaluate. Upload a document first.');
      await mongoose.disconnect();
      process.exit(1);
    }
    for (const c of chunks) {
      const words = c.text.split(/\s+/).slice(0, 8).join(' ');
      dataset.push({
        question: `What information is mentioned about: ${words}?`,
        documentId: String(c.documentId),
        userId: String(c.userId),
        groundTruthChunkIndex: c.index,
      });
    }
  }

  if (dataset.length === 0) {
    console.error('❌ Dataset is empty.');
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`\n🚀 Running RAG Retrieval Evaluation on ${dataset.length} queries...\n`);

  let totalRecall1 = 0;
  let totalRecall3 = 0;
  let totalMrr = 0;
  let totalAnnTime = 0;
  let totalExactTime = 0;
  const k = 3;

  const rows = [];

  for (let i = 0; i < dataset.length; i++) {
    const item = dataset[i];
    const { question, documentId, userId } = item;

    // 1. Generate query embedding
    const queryEmbedding = await generateEmbedding(question);

    // 2. Exact Search (Ground Truth)
    const tExact0 = performance.now();
    const exactResults = await exactRetrieveChunks({
      documentId,
      userId,
      queryEmbedding,
      topK: k,
    });
    const exactTime = performance.now() - tExact0;
    totalExactTime += exactTime;

    // 3. Atlas Vector Search (ANN)
    const tAnn0 = performance.now();
    const annResults = await retrieveChunks({
      documentId,
      userId,
      queryEmbedding,
      topK: k,
    });
    const annTime = performance.now() - tAnn0;
    totalAnnTime += annTime;

    // Calculate Recall@k: fraction of exact top-k chunks present in ANN top-k chunks
    const exactIndices = new Set(exactResults.map((r) => r.index));
    const annIndices = annResults.map((r) => r.index);

    let hits = 0;
    for (const idx of annIndices) {
      if (exactIndices.has(idx)) hits++;
    }
    const recallK = exactResults.length > 0 ? hits / exactResults.length : 1;

    // Recall@1
    const topExactIndex = exactResults[0]?.index;
    const recall1 = annResults.length > 0 && annResults[0]?.index === topExactIndex ? 1 : 0;
    totalRecall1 += recall1;
    totalRecall3 += recallK;

    // Reciprocal Rank of the #1 exact match within ANN results
    const rank = annIndices.findIndex((idx) => idx === topExactIndex);
    const rr = rank >= 0 ? 1 / (rank + 1) : 0;
    totalMrr += rr;

    rows.push({
      Query: question.length > 35 ? question.slice(0, 32) + '...' : question,
      'Exact Top-3': exactResults.map((r) => r.index).join(','),
      'ANN Top-3': annResults.map((r) => r.index).join(','),
      'Recall@3': (recallK * 100).toFixed(0) + '%',
      'ANN Latency': `${annTime.toFixed(1)}ms`,
    });
  }

  const avgRecall1 = (totalRecall1 / dataset.length) * 100;
  const avgRecall3 = (totalRecall3 / dataset.length) * 100;
  const mrr = totalMrr / dataset.length;
  const avgAnnLatency = totalAnnTime / dataset.length;
  const avgExactLatency = totalExactTime / dataset.length;

  console.table(rows);

  console.log('\n======================================================');
  console.log('               RAG EVALUATION RESULTS (v1-baseline)   ');
  console.log('======================================================');
  console.log(` Queries Evaluated       : ${dataset.length}`);
  console.log(` Top-k                   : ${k}`);
  console.log(` Recall@1                : ${avgRecall1.toFixed(1)}%`);
  console.log(` Recall@3                : ${avgRecall3.toFixed(1)}%`);
  console.log(` Mean Reciprocal Rank    : ${mrr.toFixed(3)}`);
  console.log(` Avg Atlas ANN Latency   : ${avgAnnLatency.toFixed(2)} ms`);
  console.log(` Avg Exact Scan Latency  : ${avgExactLatency.toFixed(2)} ms`);
  console.log('======================================================\n');

  // Markdown output
  console.log('| Metric | Result | Description |');
  console.log('| :--- | :--- | :--- |');
  console.log(`| **Queries Evaluated** | ${dataset.length} | Test dataset query count |`);
  console.log(`| **Recall@1** | ${avgRecall1.toFixed(1)}% | Exact top match retrieved at rank 1 |`);
  console.log(`| **Recall@3** | ${avgRecall3.toFixed(1)}% | Exact top-3 chunks found in Atlas ANN top-3 |`);
  console.log(`| **MRR** | ${mrr.toFixed(3)} | Mean Reciprocal Rank against exact search |`);
  console.log(`| **Atlas ANN Latency** | ${avgAnnLatency.toFixed(2)} ms | Average Atlas $vectorSearch query time |`);
  console.log(`| **Exact Scan Latency** | ${avgExactLatency.toFixed(2)} ms | In-memory brute-force cosine scan time |`);

  await mongoose.disconnect();
}

runEval().catch((err) => {
  console.error('Evaluation run failed:', err);
  process.exit(1);
});
