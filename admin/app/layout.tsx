import './globals.css';
import Link from 'next/link';
import { provider } from '@/lib/mode.mjs';

export const metadata = {
  title: 'Elenos / Orbit',
  description: 'Orbit — the Elenos content engine (admin.elenos.ai)',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav>
          <Link className="brand" href="/content">Elenos <span>/ Orbit</span></Link>
          <Link className="tab" href="/orbit">Orbit</Link>
          <Link className="tab" href="/content">Board</Link>
          <Link className="tab" href="/content/queue">Queue</Link>
          <Link className="tab" href="/blog">Published</Link>
          <span className="sp" />
          <Link className="mode" href="/settings">{provider().label} · settings</Link>
        </nav>
        <div className="wrap">{children}</div>
      </body>
    </html>
  );
}
