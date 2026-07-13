'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { id, saveThread, getThread } from '@/lib/db.mjs';
import { acceptIdea, suggestIdeas, dismissIdea } from '@/lib/service.mjs';

// Orbit pitches a few starter post ideas on its own.
export async function suggestIdeasAction() {
  await suggestIdeas(3);
  revalidatePath('/orbit');
  revalidatePath('/content');
}

export async function dismissIdeaAction(formData: FormData) {
  dismissIdea(String(formData.get('ideaId')));
  revalidatePath('/orbit');
  revalidatePath('/content');
}

export async function createThreadAction(formData: FormData) {
  const title = String(formData.get('title') || '').trim() || 'New research thread';
  const now = new Date().toISOString();
  const thread = saveThread({ id: id('th'), title, createdAt: now, updatedAt: now });
  revalidatePath('/orbit');
  redirect(`/orbit/${thread.id}`);
}

export async function renameThreadAction(formData: FormData) {
  const tid = String(formData.get('threadId'));
  const thread = getThread(tid);
  if (!thread) return;
  thread.title = String(formData.get('title') || '').trim() || thread.title;
  saveThread(thread);
  revalidatePath('/orbit');
  revalidatePath(`/orbit/${tid}`);
}

// A thread-spawned idea enters the pipeline exactly like a board idea.
export async function developIdeaAction(formData: FormData) {
  const piece = acceptIdea(String(formData.get('ideaId')));
  revalidatePath('/content');
  redirect(`/content/${piece.id}/edit`);
}
