// The hybrid art-direction layer. The carousel author (or, in production, Claude)
// proposes archetype + emphasis + an optional layout per slide; artDirect()
// enforces the guardrails deterministically:
//   - one accent theme + one background per carousel (coherence)
//   - no two ADJACENT slides share a layout (kills the "all the same" feel)
//   - prefer layouts not yet used in the carousel (spread the variety)
// Same carousel slug => same result, so renders stay reproducible.
import { LAYOUTS_FOR } from './layouts.mjs';
import { THEME_NAMES, BACKGROUNDS, pickTheme, pickBackground } from './themes.mjs';
import { mulberry32, hashStr } from './util.mjs';

export function artDirect(carousel, seedExtra = 0) {
  const slug = carousel.slug || 'carousel';
  const themeName = THEME_NAMES.includes(carousel.theme) ? carousel.theme : pickTheme(slug);
  const bg = BACKGROUNDS.includes(carousel.bg) ? carousel.bg : pickBackground(slug);
  const rnd = mulberry32((hashStr(slug) + seedExtra) >>> 0);

  const used = new Set();
  let prev = null;

  const slides = carousel.slides.map((s) => {
    const archetype = s.type || 'body';
    const allowed = LAYOUTS_FOR[archetype] || LAYOUTS_FOR.body;

    // honor an explicit, valid, non-repeating author choice; otherwise pick.
    let layout = allowed.includes(s.layout) && s.layout !== prev ? s.layout : null;
    if (!layout) {
      let pool = allowed.filter((l) => l !== prev);
      const fresh = pool.filter((l) => !used.has(l));
      if (fresh.length) pool = fresh;
      if (!pool.length) pool = allowed;
      layout = pool[Math.floor(rnd() * pool.length)];
    }

    used.add(layout);
    prev = layout;
    return { ...s, layout, _theme: themeName, _bg: BACKGROUNDS.includes(s.bg) ? s.bg : bg };
  });

  return { ...carousel, theme: themeName, bg, slides };
}
