// Render a piece's slides to PNGs on disk (cached under data/renders/<pieceId>),
// reusing the slide-system from ../slide-prototype.
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderCarousel } from '../../slide-prototype/api.mjs';
import { RENDER_DIR } from './store.mjs';

const fileName = (s) =>
  `${String(s.index).padStart(2, '0')}-${(s.label || s.type).toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;

export async function renderPieceSlides(piece, { seed = 0 } = {}) {
  const dir = resolve(RENDER_DIR, piece.id);
  if (existsSync(dir)) rmSync(dir, { recursive: true });
  mkdirSync(dir, { recursive: true });

  const { carousel, slides } = await renderCarousel(piece.spec, { seed });
  const files = slides.map((s) => {
    const name = fileName(s);
    writeFileSync(resolve(dir, name), s.png);
    return { index: s.index, label: s.label, type: s.type, layout: s.layout, file: name };
  });
  return { theme: carousel.theme, bg: carousel.bg, slides: files };
}
