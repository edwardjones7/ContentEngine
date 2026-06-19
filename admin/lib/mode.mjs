// Lightweight flag (no heavy imports) — offline unless a Claude key is present.
export const MODE = process.env.ANTHROPIC_API_KEY ? 'live' : 'offline';
