'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { id, saveThread, getThread, deleteThread, getIdea, addIdea } from '@/lib/db.mjs';
import { acceptIdea, suggestIdeas, dismissIdea, fileThreadIdea } from '@/lib/service.mjs';

// Orbit pitches a few starter post ideas on its own.
export async function suggestIdeasAction() {
  await suggestIdeas(3);
  revalidatePath('/orbit');
  revalidatePath('/content');
}

export async function dismissIdeaAction(formData: FormData) {
  await dismissIdea(String(formData.get('ideaId')));
  revalidatePath('/orbit');
  revalidatePath('/content');
}

export async function createThreadAction(formData: FormData) {
  const title = String(formData.get('title') || '').trim() || 'New research thread';
  const now = new Date().toISOString();
  const thread = await saveThread({ id: id('th'), title, createdAt: now, updatedAt: now });
  revalidatePath('/orbit');
  redirect(`/orbit/${thread.id}`);
}

export async function deleteThreadAction(formData: FormData) {
  await deleteThread(String(formData.get('threadId')));
  revalidatePath('/orbit');
}

export async function renameThreadAction(formData: FormData) {
  const tid = String(formData.get('threadId'));
  const thread = await getThread(tid);
  if (!thread) return;
  thread.title = String(formData.get('title') || '').trim() || thread.title;
  await saveThread(thread);
  revalidatePath('/orbit');
  revalidatePath(`/orbit/${tid}`);
}

// Open (or resume) a research thread to riff on an idea before committing it
// to the pipeline. The thread page auto-sends a kickoff message via ?ideate=.
export async function ideateIdeaAction(formData: FormData) {
  const idea = await getIdea(String(formData.get('ideaId')));
  if (!idea) return;

  let thread = idea.threadId ? await getThread(idea.threadId) : null;
  if (!thread) {
    const now = new Date().toISOString();
    thread = await saveThread({ id: id('th'), title: `Ideate: ${idea.title}`, createdAt: now, updatedAt: now });
    await addIdea({ ...idea, threadId: thread.id });
    revalidatePath('/orbit');
    revalidatePath('/content');
  }
  redirect(`/orbit/${thread.id}?ideate=${encodeURIComponent(idea.id)}`);
}

// "File idea" on a proposal card in a thread — this is the only way an
// Orbit-proposed idea enters the pipeline. Plain args: the chat client calls
// it with the full proposal payload (hook, angle, script, evidence, …).
export async function fileIdeaAction(proposal: any): Promise<{ ok: boolean; ideaId?: string }> {
  const idea = await fileThreadIdea(proposal);
  if (!idea) return { ok: false };
  revalidatePath('/orbit');
  if (idea.threadId) revalidatePath(`/orbit/${idea.threadId}`);
  revalidatePath('/content');
  return { ok: true, ideaId: idea.id };
}

// A thread-spawned idea enters the pipeline exactly like a board idea.
export async function developIdeaAction(formData: FormData) {
  const piece = await acceptIdea(String(formData.get('ideaId')));
  revalidatePath('/content');
  redirect(`/content/${piece.id}/edit`);
}
