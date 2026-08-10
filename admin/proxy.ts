import { NextResponse, type NextRequest } from 'next/server';

// AUTH GATE. Hobby-plan Vercel can't protect production deployments, so the app
// gates itself: set ADMIN_PASSWORD on the host and every route requires HTTP
// Basic credentials. With no ADMIN_PASSWORD set (local dev) it's a pass-through.
// In admin.elenos.ai this is replaced by the existing admin session auth.

// Constant-time compare so the gate doesn't leak the secret through response timing.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function proxy(req: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return NextResponse.next(); // unset → open (local dev)

  const header = req.headers.get('authorization') || '';
  if (header.startsWith('Basic ')) {
    try {
      const decoded = atob(header.slice(6));
      const password = decoded.slice(decoded.indexOf(':') + 1);
      if (safeEqual(password, expected)) return NextResponse.next();
    } catch {
      /* malformed header falls through to the challenge */
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Orbit", charset="UTF-8"',
      'Cache-Control': 'no-store',
    },
  });
}

// Everything except Next's static assets — the board, Orbit, the API route,
// rendered slide PNGs and the blog all sit behind the gate.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
