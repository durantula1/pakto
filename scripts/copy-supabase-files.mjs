// One-off: copies every file from Supabase Storage to FILES_DIR/<bucket>/<path> (docs/production-migration-plan.md, phase 3).
// Safe to run again: files already on disk are skipped.
//   node --env-file=.env.local scripts/copy-supabase-files.mjs
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

const BUCKETS = ["change-attachments", "decision-signatures", "organization-logos", "order-files"];
const root = path.resolve(process.env.FILES_DIR || ".data/files");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let copied = 0;
let skipped = 0;
for (const bucket of BUCKETS) {
  const folders = [""];
  while (folders.length) {
    const folder = folders.pop();
    const { data, error } = await supabase.storage.from(bucket).list(folder, { limit: 1000 });
    if (error) {
      if (/not found/i.test(error.message)) break;
      throw error;
    }
    for (const item of data) {
      const key = folder ? `${folder}/${item.name}` : item.name;
      if (!item.id) { folders.push(key); continue; }
      const target = path.join(root, bucket, key);
      if (existsSync(target)) { skipped += 1; continue; }
      const { data: blob, error: downloadError } = await supabase.storage.from(bucket).download(key);
      if (downloadError) throw downloadError;
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, Buffer.from(await blob.arrayBuffer()));
      copied += 1;
      console.log(`${bucket}/${key}`);
    }
  }
}
console.log(`Copied ${copied}, already there ${skipped}, into ${root}`);
