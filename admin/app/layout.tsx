import './globals.css';
import Sidebar from './sidebar';
import { provider } from '@/lib/mode.mjs';

export const metadata = {
  title: 'Elenos / Orbit',
  description: 'Orbit — the Elenos content engine (admin.elenos.ai)',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <Sidebar modeLabel={provider().label} />
          <main className="main">
            <div className="wrap">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
