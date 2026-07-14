'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { acceptIdea, updateConcept, buildPiece, regeneratePiece, regenerateMedium, saveMedium, publishPiece, saveBlog, refreshIdeas, editPieceSlide, ALL_MEDIUMS } from '@/lib/service.mjs';

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

export async function updateConceptAction(formData: FormData) {
  const pid = String(formData.get('pieceId'));
  updateConcept(pid, {
    title: String(formData.get('title') || ''),
    angle: String(formData.get('angle') || ''),
    hook: String(formData.get('hook') || ''),
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
  }
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
