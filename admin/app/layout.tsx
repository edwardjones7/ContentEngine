import './globals.css';
import Link from 'next/link';
import { MODE } from '@/lib/mode.mjs';

export const metadata = {
  title: 'Elenos / Content',
  description: 'Elenos content engine — admin.elenos.ai',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav>
          <Link className="brand" href="/content">Elenos <span>/ Content</span></Link>
          <Link className="tab" href="/content">Ideas</Link>
          <Link className="tab" href="/content/queue">Queue</Link>
          <Link className="tab" href="/blog">Published</Link>
          <span className="sp" />
          <span className="mode">{MODE === 'live' ? '● live (claude)' : '○ offline'}</span>
        </nav>
        <div className="wrap">{children}</div>
      </body>
    </html>
  );
}
