'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ICONS: Record<string, React.ReactNode> = {
  orbit: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M19.6 8.2c1.9 3 1.7 6.3-.6 8.6-3.1 3.1-9 2.4-13.2-1.7S.6 5.6 3.7 2.5c2.3-2.3 5.6-2.5 8.6-.6" transform="rotate(20 12 12) scale(.92) translate(1 1)" />
    </svg>
  ),
  board: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <rect x="3" y="4" width="5" height="16" rx="1.5" />
      <rect x="10" y="4" width="5" height="11" rx="1.5" />
      <rect x="17" y="4" width="4" height="7" rx="1.5" />
    </svg>
  ),
  queue: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  ),
  published: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h0a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55h0a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v0a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z" />
    </svg>
  ),
};

const NAV = [
  { href: '/orbit', label: 'Orbit', icon: 'orbit', hint: 'Chat & research' },
  { href: '/content', label: 'Board', icon: 'board', hint: 'Pipeline' },
  { href: '/content/queue', label: 'Queue', icon: 'queue', hint: 'Up next' },
  { href: '/blog', label: 'Published', icon: 'published', hint: 'Live posts' },
];

export default function Sidebar({ modeLabel }: { modeLabel: string }) {
  const pathname = usePathname() || '/';

  // Longest matching prefix wins, so /content/queue lights Queue, not Board.
  const active = [...NAV, { href: '/settings' }]
    .filter((n) => pathname === n.href || pathname.startsWith(n.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <aside className="side">
      <Link className="brand" href="/content">
        <span className="brand-dot" />
        Elenos <span className="brand-sub">/ Orbit</span>
      </Link>

      <div className="side-sec">Workspace</div>
      <nav className="side-nav">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={`side-link${active === n.href ? ' active' : ''}`}>
            <span className="ic">{ICONS[n.icon]}</span>
            <span className="lbl">
              {n.label}
              <span className="hint">{n.hint}</span>
            </span>
          </Link>
        ))}
      </nav>

      <div className="side-foot">
        <Link href="/settings" className={`side-link${active === '/settings' ? ' active' : ''}`}>
          <span className="ic">{ICONS.settings}</span>
          <span className="lbl">
            Settings
            <span className="hint">{modeLabel}</span>
          </span>
        </Link>
      </div>
    </aside>
  );
}
