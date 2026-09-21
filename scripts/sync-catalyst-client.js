// Syncs the Vite build output (dist/) into the Catalyst client folder (../client/).
// Run after `vite build --base=./` — see the `build:catalyst` / `deploy:catalyst` npm scripts.
//
// The Catalyst project root is the parent folder (it holds catalyst.json, whose
// client source is "client"). This wipes everything in ../client/ EXCEPT
// client-package.json (which Catalyst needs and which is not produced by the Vite
// build), then copies dist/* in its place.
import { rm, mkdir, cp, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(appRoot, 'dist');
const clientDir = resolve(appRoot, '..', 'client');

// Files in client/ that are NOT part of the Vite build and must survive the sync.
const PRESERVE = new Set(['client-package.json']);

async function main() {
  // Fail loudly if the build hasn't run.
  try {
    await readdir(distDir);
  } catch {
    console.error(`[sync-catalyst-client] dist/ not found at ${distDir} — run \`vite build\` first.`);
    process.exit(1);
  }

  await mkdir(clientDir, { recursive: true });

  // Clear stale build output, keep the preserved files.
  const existing = await readdir(clientDir);
  for (const entry of existing) {
    if (PRESERVE.has(entry)) continue;
    await rm(join(clientDir, entry), { recursive: true, force: true });
  }

  // Copy the fresh build in.
  for (const entry of await readdir(distDir)) {
    await cp(join(distDir, entry), join(clientDir, entry), { recursive: true });
  }

  if (!existing.includes('client-package.json')) {
    console.warn(`[sync-catalyst-client] Warning: ${clientDir} has no client-package.json — Catalyst deploy will fail without it.`);
  }

  console.log(`[sync-catalyst-client] Synced dist/ → ${clientDir} (preserved: ${[...PRESERVE].join(', ')})`);
}

main().catch((err) => {
  console.error('[sync-catalyst-client] Failed:', err);
  process.exit(1);
});
