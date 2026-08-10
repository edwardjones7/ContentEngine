import { ensureIdeas } from '@/lib/service.mjs';
import { getPieces } from '@/lib/db.mjs';
import { provider } from '@/lib/mode.mjs';
import { canRenderSlides } from '@/lib/render.mjs';
import { Board, type CardDTO } from './board';
import { SubmitButton } from './pending';
import { researchAction } from './actions';

export const dynamic = 'force-dynamic';

// Card DTOs pick fields explicitly — heavy piece payloads (spec, blog
// markdown, render QA) must not cross the client boundary.
function toIdeaCard(i: any): CardDTO {
  return {
    kind: 'idea', id: i.id, stage: 'idea',
    title: i.title, goal: i.goal || null, brand: i.brand || null, funnel: i.funnel || null, formats: [],
    source: i.source, angle: i.angle, hook: i.hook, hasScript: !!i.script,
    threadId: i.threadId || null, suggested: !!i.suggested,
  };
}

function toPieceCard(p: any): CardDTO {
  return {
    kind: 'piece', id: p.id, stage: p.status,
    title: p.title, goal: p.goal || null, brand: p.brand || null, funnel: p.funnel || null,
    formats: p.mediumsRequested || (p.builtAt ? ['carousel', 'blog'] : []),
    angle: p.concept?.angle,
    thumb: p.render?.slides?.[0]?.url ?? null,
    built: !!p.builtAt,
    hasBlog: !!p.blog,
    blogPublished: !!p.publishedAt,
    slug: p.slug,
    postAt: p.postAt || null,
    postedAt: p.postedAt || null,
  };
}

export default async function ContentPage() {
  const ideas = await ensureIdeas();
  const pieces = await getPieces();
  const accepted = new Set(pieces.map((p: any) => p.ideaId));

  const byStage = (s: string) => pieces.filter((p: any) => p.status === s).map(toPieceCard);
  const ready = byStage('ready').sort((a: CardDTO, b: CardDTO) =>
    (a.postAt || '9999') < (b.postAt || '9999') ? -1 : 1);

  const columns = {
    idea: ideas.filter((i: any) => !accepted.has(i.id)).map(toIdeaCard),
    production: byStage('production'),
    review: byStage('review'),
    ready,
    posted: byStage('posted'),
  };

  return (
    <>
      <h1>Content OS</h1>
      <p className="lead">Idea → Production → Review → Ready to Post → Posted. Chat with <a href="/orbit" style={{ color: 'var(--accent2)' }}>Orbit</a> to develop ideas, drag cards through the pipeline, and let AI do the heavy lifting at each stage.</p>
      <div className="row">
        <form action={researchAction}><SubmitButton busy="↻ researching…">↻ Refresh research</SubmitButton></form>
        <span className="src">{provider().kind === 'offline' ? 'offline: seeded ideas (add an API key in Settings to go live)' : `live research via ${provider().kind === 'free' ? 'Gemini + Google Search' : 'Claude + web search'}`}</span>
      </div>

      <Board columns={columns} canBuild={canRenderSlides()} />
    </>
  );
}
