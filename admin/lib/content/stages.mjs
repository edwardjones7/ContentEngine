// Board vocabulary (stages + goal tags). Zero imports — safe to pull into
// db.mjs, service.mjs, and client components without cycles.

export const PIECE_STAGES = ['production', 'review', 'ready', 'posted'];
export const BOARD_STAGES = ['idea', ...PIECE_STAGES];
export const STAGE_LABEL = { idea: 'Idea', production: 'Production', review: 'Review', ready: 'Ready to Post', posted: 'Posted' };

// Goal = the business job of a post. One per card, AI-suggested at ideation.
export const GOALS = ['leads', 'authority', 'nurture', 'story', 'values'];
export const GOAL_LABEL = { leads: 'Leads', authority: 'Authority', nurture: 'Nurture', story: 'Story', values: 'Values' };

// Brand = which property the post is destined for.
export const BRANDS = ['elenos', 'edjones'];
export const BRAND_LABEL = { elenos: 'elenos.ai', edjones: 'edjonesai' };

// Funnel stage the post targets: top / middle / bottom of funnel.
export const FUNNELS = ['tof', 'mof', 'bof'];
export const FUNNEL_LABEL = { tof: 'TOF', mof: 'MOF', bof: 'BOF' };

const LEGACY_STATUS = { building: 'production', draft: 'review', published: 'posted' };

export function normalizeStatus(s) {
  if (LEGACY_STATUS[s]) return LEGACY_STATUS[s];
  return PIECE_STAGES.includes(s) ? s : 'production';
}

export function normalizeGoal(g) {
  const goal = String(g || '').toLowerCase().trim();
  return GOALS.includes(goal) ? goal : null;
}

export function normalizeBrand(b) {
  const brand = String(b || '').toLowerCase().trim().replace(/\.ai$/, '').replace(/^edjonesai$/, 'edjones');
  return BRANDS.includes(brand) ? brand : null;
}

export function normalizeFunnel(f) {
  const funnel = String(f || '').toLowerCase().replace(/[.\s]/g, '');
  const alias = { top: 'tof', topoffunnel: 'tof', middle: 'mof', middleoffunnel: 'mof', bottom: 'bof', bottomoffunnel: 'bof' };
  const v = alias[funnel] || funnel;
  return FUNNELS.includes(v) ? v : null;
}

// The three card tag dimensions, used by the generic tag picker/setter.
export const TAG_FIELDS = {
  goal: { values: GOALS, labels: GOAL_LABEL, normalize: normalizeGoal },
  brand: { values: BRANDS, labels: BRAND_LABEL, normalize: normalizeBrand },
  funnel: { values: FUNNELS, labels: FUNNEL_LABEL, normalize: normalizeFunnel },
};
