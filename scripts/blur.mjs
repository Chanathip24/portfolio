// Writes src/content/blur.json: a tiny blurred preview (a few hundred bytes) for every image in public/mock,
// keyed by its public path. next/image shows it while the real image loads (placeholder="blur").
// Re-run after adding or changing images: npm run blur
import { readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const dir = new URL("../public/mock/", import.meta.url);
const out = {};
for (const f of (await readdir(dir)).sort()) {
  if (!/\.(svg|png|jpe?g|webp|avif)$/i.test(f)) continue;
  const buf = await sharp(fileURLToPath(new URL(f, dir)), { density: 72 }).resize(16).webp({ quality: 40 }).toBuffer();
  out[`/mock/${f}`] = `data:image/webp;base64,${buf.toString("base64")}`;
}
await writeFile(new URL("../src/content/blur.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
console.log(Object.entries(out).map(([k, v]) => `${k} ${v.length}B`).join("\n"));
