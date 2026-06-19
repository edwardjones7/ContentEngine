import Link from 'next/link';

export function PieceRow({ p }: { p: any }) {
  return (
    <div className="card">
      <div className="row">
        <div>
          <div className="row" style={{ gap: 8 }}>
            <Link href={`/content/${p.id}`}><h3 style={{ margin: 0 }}>{p.title}</h3></Link>
            <span className={`badge ${p.status}`}>{p.status}</span>
          </div>
          <div className="meta">{p.render?.slides?.length || 0} slides · {p.render?.theme}/{p.render?.bg} · /{p.slug}</div>
        </div>
        <span className="sp" />
        <Link className="btn" href={`/content/${p.id}`}>Review →</Link>
      </div>
    </div>
  );
}
