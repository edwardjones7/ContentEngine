// Lightweight provider flag. Kept as a module so pages can show which engine
// is live; resolution lives in settings.mjs (free = Gemini, paid = Claude).
import { activeProvider } from './settings.mjs';

export const provider = () => activeProvider();
export const isLive = () => activeProvider().kind !== 'offline';
