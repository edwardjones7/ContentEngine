import { NextResponse, type NextRequest } from 'next/server';

// AUTH GATE (stub). In admin.elenos.ai this delegates to the existing admin auth
// (session/middleware) that already protects the lead-gen tool. Locally it's a
// pass-through; set ADMIN_GATE=1 to simulate a redirect for unauthenticated users.
export function proxy(req: NextRequest) {
  if (process.env.ADMIN_GATE === '1') {
    const authed = req.cookies.get('elenos_admin')?.value === '1';
    if (!authed) return NextResponse.redirect(new URL('/', req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/content/:path*'] };
