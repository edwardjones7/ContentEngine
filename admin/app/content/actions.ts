'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { acceptIdea, updateConcept, buildPiece, regeneratePiece, rebuildCarousel, regenerateMedium, saveMedium, publishPiece, saveBlog, refreshIdeas, createIdea, editPieceSlide, setPieceStage, setTag, setPostDate, deletePiece, ALL_MEDIUMS } from '@/lib/service.mjs';

export async function researchAction() {
  await refreshIdeas();
  revalidatePath('/content');
}

// Stage 1 → 2: accept an idea, then go refine the concept before building.
export async function acceptAction(formData: FormData) {
  const piece = acceptIdea(String(formData.get('ideaId')));
  revalidatePath('/content');
  redirect(`/content/${piece.id}/edit`);
}

export async function addIdeaAction(formData: FormData) {
  createIdea({
    title: String(formData.get('title') || ''),
    angle: String(formData.get('angle') || ''),
    hook: String(formData.get('hook') || ''),
    script: String(formData.get('script') || ''),
    goal: String(formData.get('goal') || ''),
    brand: String(formData.get('brand') || ''),
    funnel: String(formData.get('funnel') || ''),
  });
  revalidatePath('/content');
}

export async function deletePieceAction(formData: FormData) {
  deletePiece(String(formData.get('pieceId')));
  revalidatePath('/content');
  revalidatePath('/content/queue');
}

// Board drag handler. Plain args (not a form) — the client board calls it
// directly and owns navigation, so no redirect here.
export async function moveCardAction(kind: 'idea' | 'piece', id: string, toStage: string): Promise<{ ok: boolean; error?: string }> {
  if (kind === 'idea') {
    if (toStage !== 'production') return { ok: false, error: 'Ideas can only move to Production' };
    try { acceptIdea(id); } catch (e) { return { ok: false, error: (e as Error).message }; }
  } else {
    const res = setPieceStage(id, toStage);
    if (!res.ok) return res;
  }
  revalidatePath('/content');
  revalidatePath('/content/queue');
  return { ok: true };
}

// Sets one tag dimension (goal / brand / funnel) on an idea or piece.
export async function setTagAction(formData: FormData) {
  const kind = String(formData.get('kind')) as 'idea' | 'piece';
  const id = String(formData.get('id'));
  setTag(kind, id, String(formData.get('field')), String(formData.get('value') || ''));
  revalidatePath('/content');
  if (kind === 'piece') revalidatePath(`/content/${id}`);
}

export async function setPostDateAction(formData: FormData) {
  setPostDate(String(formData.get('pieceId')), String(formData.get('postAt') || ''));
  revalidatePath('/content');
}

// Build button on a Production card: full build, stay on the board.
export async function buildCardAction(formData: FormData) {
  await buildPiece(String(formData.get('pieceId')), { mediums: ALL_MEDIUMS });
  revalidatePath('/content');
  revalidatePath('/content/queue');
}

export async function updateConceptAction(formData: FormData) {
  const pid = String(formData.get('pieceId'));
  updateConcept(pid, {
    title: String(formData.get('title') || ''),
    angle: String(formData.get('angle') || ''),
    hook: String(formData.get('hook') || ''),
    script: String(formData.get('script') || ''),
  });
  revalidatePath(`/content/${pid}/edit`);
  revalidatePath('/content');
}

// Stage 2 → 3: run brief + the selected mediums, then land on Review.
export async function buildAction(formData: FormData) {
  const pid = String(formData.get('pieceId'));
  const picked = formData.getAll('mediums').map(String);
  await buildPiece(pid, { mediums: picked.length ? picked : ALL_MEDIUMS });
  revalidatePath('/content');
  revalidatePath('/content/queue');
  redirect(`/content/${pid}`);
}

export async function regenerateMediumAction(formData: FormData) {
  const pid = String(formData.get('pieceId'));
  await regenerateMedium(pid, String(formData.get('medium')));
  revalidatePath(`/content/${pid}`);
}

export async function saveMediumAction(formData: FormData) {
  const pid = String(formData.get('pieceId'));
  const medium = String(formData.get('medium'));
  if (medium === 'caption') {
    saveMedium(pid, medium, {
      text: String(formData.get('text') || ''),
      hashtags: String(formData.get('hashtags') || '').split(/[\s,#]+/).filter(Boolean).slice(0, 10),
    });
  } else if (medium === 'xthread') {
    const tweets = formData.getAll('tweet').map((t) => ({ text: String(t) })).filter((t) => t.text.trim());
    saveMedium(pid, medium, { tweets });
  } else if (medium === 'linkedin') {
    saveMedium(pid, medium, { text: String(formData.get('text') || '') });
  } else if (medium === 'video') {
    const beats = formData.getAll('beat').map((b, i) => ({
      beat: String(b),
      onScreenText: String(formData.getAll('onScreenText')[i] || ''),
    })).filter((b) => b.beat.trim());
    saveMedium(pid, medium, { hook: String(formData.get('hook') || ''), beats, cta: String(formData.get('cta') || '') });
  } else if (medium === 'youtube') {
    const sections = formData.getAll('heading').map((h, i) => ({
      heading: String(h),
      talking: String(formData.getAll('talking')[i] || ''),
    })).filter((s) => s.heading.trim() || s.talking.trim());
    saveMedium(pid, medium, {
      title: String(formData.get('title') || ''),
      description: String(formData.get('description') || ''),
      tags: String(formData.get('tags') || '').split(/[,\n]+/).map((t) => t.trim()).filter(Boolean).slice(0, 15),
      script: {
        hook: String(formData.get('hook') || ''),
        sections,
        outro: String(formData.get('outro') || ''),
      },
    });
  }
  revalidatePath(`/content/${pid}`);
}

export async function rebuildCarouselAction(formData: FormData) {
  const pid = String(formData.get('pieceId'));
  await rebuildCarousel(pid);
  revalidatePath(`/content/${pid}`);
}

export async function editSlideAction(formData: FormData) {
  const pid = String(formData.get('pieceId'));
  await editPieceSlide(pid, Number(formData.get('index')), String(formData.get('instruction') || ''));
  revalidatePath(`/content/${pid}`);
}

export async function regenerateAction(formData: FormData) {
  const pid = String(formData.get('pieceId'));
  await regeneratePiece(pid);
  revalidatePath(`/content/${pid}`);
}

export async function publishAction(formData: FormData) {
  const pid = String(formData.get('pieceId'));
  const p = publishPiece(pid);
  revalidatePath(`/content/${pid}`);
  revalidatePath('/content');
  revalidatePath('/blog');
  if (p) revalidatePath(`/blog/${p.slug}`);
}

export async function saveAction(formData: FormData) {
  const pid = String(formData.get('pieceId'));
  saveBlog(pid, { title: String(formData.get('title') || ''), markdown: String(formData.get('markdown') || '') });
  revalidatePath(`/content/${pid}`);
}
