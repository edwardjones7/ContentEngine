// Board vocabulary (stages + goal tags). Zero imports — safe to pull into
// db.mjs, service.mjs, and client components without cycles.

export const PIECE_STAGES = ['production', 'review', 'ready', 'posted'];
export const BOARD_STAGES = ['idea', ...PIECE_STAGES];
export const STAGE_LABEL = { idea: 'Idea', production: 'Production', review: 'Review', ready: 'Ready to Post', posted: 'Posted' };

// Goal = the business job of a post. One per card, AI-suggested at ideation.
export const GOALS = ['leads', 'authority', 'nurture', 'story', 'values'];
export const GOAL_LABEL = { leads: 'Leads', authority: 'Authority', nurture: 'Nurture', story: 'Story', values: 'Values' };

const LEGACY_STATUS = { building: 'production', draft: 'review', published: 'posted' };

export function normalizeStatus(s) {
  if (LEGACY_STATUS[s]) return LEGACY_STATUS[s];
  return PIECE_STAGES.includes(s) ? s : 'production';
}

export function normalizeGoal(g) {
  const goal = String(g || '').toLowerCase().trim();
  return GOALS.includes(goal) ? goal : null;
}
