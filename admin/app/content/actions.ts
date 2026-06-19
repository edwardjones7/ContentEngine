'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { generatePiece, regeneratePiece, publishPiece, saveBlog, refreshIdeas } from '@/lib/service.mjs';

export async function researchAction() {
  await refreshIdeas();
  revalidatePath('/content');
}

export async function generateAction(formData: FormData) {
  const piece = await generatePiece(String(formData.get('ideaId')));
  revalidatePath('/content');
  revalidatePath('/content/queue');
  redirect(`/content/${piece.id}`);
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
  revalidatePath('/blog');
  if (p) revalidatePath(`/blog/${p.slug}`);
}

export async function saveAction(formData: FormData) {
  const pid = String(formData.get('pieceId'));
  saveBlog(pid, { title: String(formData.get('title') || ''), markdown: String(formData.get('markdown') || '') });
  revalidatePath(`/content/${pid}`);
}
