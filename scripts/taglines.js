/**
 * Fetches the one-line taglines names.color.pizza publishes for every name in
 * color-name-list and writes them to data/taglines.json as { name: tagline }.
 *
 *   node scripts/taglines.js
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const source = 'https://names.color.pizza/descriptions.json';
const target = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../data/taglines.json'
);

const response = await fetch(source);
if (!response.ok) {
  throw new Error(`Could not fetch ${source}: HTTP ${response.status}`);
}

const entries = await response.json();
if (!Array.isArray(entries) || !entries.length) {
  throw new Error(`${source} did not return a list of taglines`);
}

const taglines = entries
  .filter(entry => entry.name && entry.description)
  .map(entry => [entry.name, entry.description.trim()])
  .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

// one tagline per line, sorted by name, so a sync's diff shows only what changed
const lines = taglines.map(
  ([name, tagline]) => `${JSON.stringify(name)}:${JSON.stringify(tagline)}`
);

await fs.mkdir(path.dirname(target), { recursive: true });
await fs.writeFile(target, `{\n${lines.join(',\n')}\n}\n`);

console.log(
  `Wrote ${taglines.length} taglines to ${path.relative(process.cwd(), target)}`
);
