#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const RECORDINGS_DIR = path.join(ROOT, 'recordings');
const TRACKING_FILE = path.join(ROOT, 'tests', '.recordings-tracking.log');

const dryRun = process.argv.includes('--dry-run');

if (!fs.existsSync(TRACKING_FILE)) {
  console.error(`[recordings] tracking file not found at ${TRACKING_FILE}`);
  console.error('[recordings] run `npm test` first to populate it.');
  process.exit(1);
}

const content = fs.readFileSync(TRACKING_FILE, 'utf8').trim();
if (!content) {
  console.error('[recordings] tracking file is empty — refusing to delete anything.');
  console.error('[recordings] run `npm test` first.');
  process.exit(1);
}

// recordingId -> Set of "entryId|order" used during the last test run.
const usedEntries = new Map();
const usedSuiteDirs = new Set();
for (const line of content.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  const [recId, entryId, order] = trimmed.split('\t');
  if (!recId || !entryId) continue;
  if (!usedEntries.has(recId)) usedEntries.set(recId, new Set());
  usedEntries.get(recId).add(`${entryId}|${order ?? '0'}`);
  const [suiteDir] = recId.split('/');
  if (suiteDir) usedSuiteDirs.add(suiteDir);
}

if (!fs.existsSync(RECORDINGS_DIR)) {
  console.log('[recordings] no recordings directory.');
  process.exit(0);
}

const action = (label) => (dryRun ? `would ${label}` : `${label}ing`);

let removedDirs = 0;
let prunedEntries = 0;
let keptDirs = 0;

for (const suiteEntry of fs.readdirSync(RECORDINGS_DIR, { withFileTypes: true })) {
  if (!suiteEntry.isDirectory()) continue;
  const suitePath = path.join(RECORDINGS_DIR, suiteEntry.name);

  if (!usedSuiteDirs.has(suiteEntry.name)) {
    console.log(`[recordings] ${action('remov')} unused suite: ${suiteEntry.name}`);
    if (!dryRun) fs.rmSync(suitePath, { recursive: true, force: true });
    removedDirs++;
    continue;
  }

  for (const testEntry of fs.readdirSync(suitePath, { withFileTypes: true })) {
    if (!testEntry.isDirectory()) continue;
    const recId = `${suiteEntry.name}/${testEntry.name}`;
    const testPath = path.join(suitePath, testEntry.name);

    const entriesUsed = usedEntries.get(recId);
    if (!entriesUsed) {
      console.log(`[recordings] ${action('remov')} unused test: ${recId}`);
      if (!dryRun) fs.rmSync(testPath, { recursive: true, force: true });
      removedDirs++;
      continue;
    }

    const harPath = path.join(testPath, 'recording.har');
    if (!fs.existsSync(harPath)) {
      keptDirs++;
      continue;
    }

    const har = JSON.parse(fs.readFileSync(harPath, 'utf8'));
    const before = har.log.entries.length;
    const filtered = har.log.entries.filter((entry) =>
      entriesUsed.has(`${entry._id}|${entry._order}`),
    );

    if (filtered.length === 0) {
      console.log(`[recordings] ${action('remov')} test with no used entries: ${recId}`);
      if (!dryRun) fs.rmSync(testPath, { recursive: true, force: true });
      removedDirs++;
    } else if (filtered.length < before) {
      const stale = before - filtered.length;
      console.log(`[recordings] ${action('prun')} ${stale} stale entries from ${recId}`);
      if (!dryRun) {
        har.log.entries = filtered;
        fs.writeFileSync(harPath, JSON.stringify(har, null, 2) + '\n');
      }
      prunedEntries += stale;
      keptDirs++;
    } else {
      keptDirs++;
    }
  }
}

console.log(
  `[recordings] ${dryRun ? 'would remove' : 'removed'} ${removedDirs} dirs, ` +
    `${dryRun ? 'would prune' : 'pruned'} ${prunedEntries} stale entries, ` +
    `kept ${keptDirs}.`,
);
