// Prove the rendered PNGs are post-ready: no AI provenance, no camera/editor
// metadata. We parse the PNG chunk structure directly (more honest than
// trusting a tool) and flag anything that isn't pure pixel data.
//
// A Chromium screenshot contains only: IHDR, (optional) standard ancillary
// chunks, IDAT, IEND. The AI-detection vectors live in TEXT/metadata chunks
// (iTXt/tEXt/zTXt carrying C2PA/XMP) or a JUMBF/`caBX` C2PA box — none of which
// a render produces. If any show up, this script shouts.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outRoot = resolve(here, 'out');

// Chunk types that carry metadata / provenance we never want on a social asset.
const META_CHUNKS = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf', 'caBX']);
// Raw byte markers that betray AI provenance or an editor, regardless of chunking.
const BAD_MARKERS = ['c2pa', 'jumbf', 'OpenAI', 'DALL', 'firefly', 'Adobe', 'xmp:'];

function pngChunks(buf) {
  const chunks = [];
  let p = 8; // skip signature
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    chunks.push(type);
    p += 12 + len;
    if (type === 'IEND') break;
  }
  return chunks;
}

function scanFile(file) {
  const buf = readFileSync(file);
  const isPng = buf.length > 8 && buf.readUInt32BE(0) === 0x89504e47;
  const chunks = isPng ? pngChunks(buf) : [];
  const metaChunks = chunks.filter((c) => META_CHUNKS.has(c));
  const ascii = buf.toString('latin1');
  const markers = BAD_MARKERS.filter((m) => ascii.includes(m));
  return { isPng, chunks, metaChunks, markers, clean: metaChunks.length === 0 && markers.length === 0 };
}

if (!existsSync(outRoot)) {
  console.error('No out/ directory. Run `node render.mjs` first.');
  process.exit(1);
}

function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (e.name.endsWith('.png')) yield full;
  }
}

let total = 0;
let dirty = 0;
for (const file of walk(outRoot)) {
  total++;
  const r = scanFile(file);
  const rel = relative(here, file);
  if (r.clean) {
    console.log(`  ✓ CLEAN  ${rel}  [${r.chunks.join(', ')}]`);
  } else {
    dirty++;
    console.log(`  ✗ DIRTY  ${rel}`);
    if (r.metaChunks.length) console.log(`        metadata chunks: ${r.metaChunks.join(', ')}`);
    if (r.markers.length) console.log(`        markers: ${r.markers.join(', ')}`);
  }
}

console.log(
  `\n${total} file(s) scanned — ${total - dirty} clean, ${dirty} dirty.` +
    (dirty === 0 ? '  No AI metadata. Post-ready. ✅' : '  ⚠️  Strip before posting.')
);
process.exit(dirty === 0 ? 0 : 1);
