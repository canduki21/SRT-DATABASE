#!/usr/bin/env node
/**
 * Pre-compute sentence embeddings for all titled papers.
 * Uses Xenova/all-MiniLM-L6-v2 (384-dim, same model served in browser).
 * Output: src/data/embeddings.json  { [paperId]: number[] }
 */
import { pipeline } from '@xenova/transformers'
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const papersPath = resolve(__dirname, '../src/data/papers.json')
const outPath    = resolve(__dirname, '../src/data/embeddings.json')

const papers = JSON.parse(readFileSync(papersPath, 'utf-8'))
const titled = papers.filter(p => p.title)

console.log(`Computing embeddings for ${titled.length} papers...`)

const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
  quantized: true,
})

const embeddings = {}
for (let i = 0; i < titled.length; i++) {
  const p = titled[i]
  const text = [
    p.title ?? '',
    p.authors ?? '',
    (p.keywords ?? []).slice(0, 10).join(' '),
  ].join(' ').trim()

  const out = await extractor(text, { pooling: 'mean', normalize: true })
  // Round to 5 decimal places to keep file size manageable
  embeddings[p.id] = Array.from(out.data).map(v => Math.round(v * 1e5) / 1e5)

  if ((i + 1) % 10 === 0 || i === titled.length - 1) {
    process.stdout.write(`\r  ${i + 1}/${titled.length}`)
  }
}

writeFileSync(outPath, JSON.stringify(embeddings))
const kb = Math.round(readFileSync(outPath).length / 1024)
console.log(`\nSaved ${Object.keys(embeddings).length} embeddings to embeddings.json (${kb} KB)`)
