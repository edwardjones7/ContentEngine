'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { id, saveThread, getThread, getIdea, addIdea } from '@/lib/db.mjs';
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

// Open (or resume) a research thread to riff on an idea before committing it
// to the pipeline. The thread page auto-sends a kickoff message via ?ideate=.
export async function ideateIdeaAction(formData: FormData) {
  const idea = getIdea(String(formData.get('ideaId')));
  if (!idea) return;

  let thread = idea.threadId ? getThread(idea.threadId) : null;
  if (!thread) {
    const now = new Date().toISOString();
    thread = saveThread({ id: id('th'), title: `Ideate: ${idea.title}`, createdAt: now, updatedAt: now });
    addIdea({ ...idea, threadId: thread.id });
    revalidatePath('/orbit');
    revalidatePath('/content');
  }
  redirect(`/orbit/${thread.id}?ideate=${encodeURIComponent(idea.id)}`);
}

// A thread-spawned idea enters the pipeline exactly like a board idea.
export async function developIdeaAction(formData: FormData) {
  const piece = acceptIdea(String(formData.get('ideaId')));
  revalidatePath('/content');
  redirect(`/content/${piece.id}/edit`);
}
