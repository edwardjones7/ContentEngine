import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublishedBySlug } from '@/lib/db.mjs';
import { mdToHtml } from '@/lib/md.mjs';

export const dynamic = 'force-dynamic';

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post: any = getPublishedBySlug(slug);
  if (!post) notFound();
  return (
    <>
      <div className="row"><Link className="src" href="/blog">← all posts</Link></div>
      <article className="article" dangerouslySetInnerHTML={{ __html: mdToHtml(post.markdown) }} />
    </>
  );
}
