"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import "@/lib/zod-messages";

import { getDatabase } from "@/db";
import { changeOrders, internalNotes } from "@/db/schema";
import { can } from "@/lib/authz/permissions";
import { requireProjectCapability } from "@/lib/authz/project-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";

export type NoteState = { error?: string; ok?: number };

const body = z.string().trim().min(1, "Бележката е празна.").max(4000, "Бележката е твърде дълга.");

async function notesAccess(projectId: string) {
  const context = await requireTenantContext();
  const member = await requireProjectCapability(context, projectId, "view");
  if (!can(member, "notes.view")) throw new Error("Нямаш право да виждаш вътрешните бележки.");
  return { context, member };
}

function refresh(projectId: string, changeOrderId: string | null) {
  revalidatePath(`/app/projects/${projectId}`);
  if (changeOrderId) revalidatePath(`/app/offers/${changeOrderId}`);
}

export async function addNoteAction(_: NoteState, formData: FormData): Promise<NoteState> {
  const parsed = z.object({ projectId: z.uuid(), changeOrderId: z.union([z.literal(""), z.uuid()]).optional(), body }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  try {
    const { context } = await notesAccess(parsed.data.projectId);
    const changeOrderId = parsed.data.changeOrderId || null;
    if (changeOrderId) {
      const [document] = await getDatabase().select({ id: changeOrders.id }).from(changeOrders)
        .where(and(eq(changeOrders.id, changeOrderId), eq(changeOrders.projectId, parsed.data.projectId), eq(changeOrders.organizationId, context.organizationId))).limit(1);
      if (!document) return { error: "Не намерихме тази оферта или промяна." };
    }
    await getDatabase().insert(internalNotes).values({ organizationId: context.organizationId, projectId: parsed.data.projectId, changeOrderId, authorId: context.userId, body: parsed.data.body });
    refresh(parsed.data.projectId, changeOrderId);
    return { ok: Date.now() };
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : "Бележката не беше записана." };
  }
}

async function ownedNote(noteId: string) {
  const context = await requireTenantContext();
  const [note] = await getDatabase().select().from(internalNotes)
    .where(and(eq(internalNotes.id, noteId), eq(internalNotes.organizationId, context.organizationId), isNull(internalNotes.deletedAt))).limit(1);
  if (!note) throw new Error("Бележката не е намерена.");
  const { member } = await notesAccess(note.projectId);
  return { context, member, note };
}

/** Only the author edits; the author or the owner deletes. Anyone who sees notes can pin. */
export async function updateNoteAction(_: NoteState, formData: FormData): Promise<NoteState> {
  const parsed = z.object({ noteId: z.uuid(), body }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  try {
    const { context, note } = await ownedNote(parsed.data.noteId);
    if (note.authorId !== context.userId) return { error: "Само авторът може да редактира бележката." };
    await getDatabase().update(internalNotes).set({ body: parsed.data.body, updatedAt: new Date() }).where(eq(internalNotes.id, note.id));
    refresh(note.projectId, note.changeOrderId);
    return { ok: Date.now() };
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : "Бележката не беше запазена." };
  }
}

export async function deleteNoteAction(formData: FormData) {
  const { noteId } = z.object({ noteId: z.uuid() }).parse(Object.fromEntries(formData));
  try {
    const { context, member, note } = await ownedNote(noteId);
    if (note.authorId !== context.userId && member.role !== "owner") return { error: "Само авторът или собственикът може да изтрие бележката." };
    await getDatabase().update(internalNotes).set({ deletedAt: new Date() }).where(eq(internalNotes.id, note.id));
    refresh(note.projectId, note.changeOrderId);
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : "Бележката не беше изтрита." };
  }
}

export async function togglePinAction(formData: FormData) {
  const { noteId } = z.object({ noteId: z.uuid() }).parse(Object.fromEntries(formData));
  try {
    const { note } = await ownedNote(noteId);
    await getDatabase().update(internalNotes).set({ pinned: !note.pinned }).where(eq(internalNotes.id, note.id));
    refresh(note.projectId, note.changeOrderId);
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : "Действието не беше завършено." };
  }
}
