import { getPieces } from '@/lib/db.mjs';
import { PieceRow } from '../parts';

export const dynamic = 'force-dynamic';

export default function QueuePage() {
  const pieces = getPieces();
  return (
    <>
      <h1>Review queue</h1>
      <p className="lead">Every generated piece. Blogs publish only when you accept them.</p>
      {pieces.length
        ? <div className="grid">{pieces.map((p: any) => <PieceRow key={p.id} p={p} />)}</div>
        : <div className="empty">Nothing yet — generate a piece from Ideas.</div>}
    </>
  );
}
