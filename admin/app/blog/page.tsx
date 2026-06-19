import Link from 'next/link';
import { getPublished } from '@/lib/db.mjs';

export const dynamic = 'force-dynamic';

export default function BlogList() {
  const posts = getPublished();
  return (
    <>
      <h1>Published</h1>
      <p className="lead">Live on elenos.ai (simulated). Accepted from the review queue.</p>
      {posts.length
        ? <div className="grid">{posts.map((p: any) => (
          <div className="card" key={p.slug}>
            <Link href={`/blog/${p.slug}`}><h3>{p.title}</h3></Link>
            <div className="meta">{p.dek}</div>
            <div className="src">/blog/{p.slug}</div>
          </div>))}</div>
        : <div className="empty">No posts published yet.</div>}
    </>
  );
}
