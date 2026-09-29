import "server-only";

import { NotesPanel } from "@/components/notes/notes-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { ListPagination } from "@/components/workspace/list-filters";
import { lastPage, pageOffset } from "@/lib/pagination";
import { countNotes, listNotes, NOTES_PAGE_SIZE, type NoteItem } from "@/modules/notes/queries";

export type NotesLoad = { total: Promise<number>; rows: Promise<NoteItem[]> };

/**
 * Starts the notes count and the requested page together, so the tab costs one round trip.
 * Call it early (with the page's other reads); `total` also feeds the tab's count badge.
 */
export function loadNotes(organizationId: string, scope: { projectId: string; changeOrderId?: string }, page: number): NotesLoad {
  const total = countNotes(organizationId, scope);
  const rows = listNotes(organizationId, scope, { limit: NOTES_PAGE_SIZE, offset: pageOffset(page, NOTES_PAGE_SIZE) });
  // The page may bail out (not found, no access) before the tab awaits these; don't leave rejections unhandled.
  total.catch(() => {});
  rows.catch(() => {});
  return { total, rows };
}

/**
 * The notes tab of a project or document page, streamed on its own so the page shows before
 * the notes load. `notes` comes from `loadNotes`, started with the page's own reads.
 */
export async function NotesSection({ organizationId, projectId, changeOrderId, notes: load, page, path, legacy = [], currentUserId, isOwner }: {
  organizationId: string;
  projectId: string;
  changeOrderId?: string;
  notes: NotesLoad;
  page: number;
  /** Page the pagination links point at; they keep the notes tab open. */
  path: string;
  legacy?: Array<{ revisionNumber: number; text: string }>;
  currentUserId: string;
  isOwner: boolean;
}) {
  const [count, requested] = await Promise.all([load.total, load.rows]);
  // A page past the end (a note was deleted, an old link) is read again as the last page.
  const pages = lastPage(count, NOTES_PAGE_SIZE);
  const current = Math.min(page, pages);
  const notes = current === page ? requested : await listNotes(organizationId, { projectId, changeOrderId }, { limit: NOTES_PAGE_SIZE, offset: pageOffset(current, NOTES_PAGE_SIZE) });
  return (
    <NotesPanel
      projectId={projectId}
      changeOrderId={changeOrderId}
      notes={notes}
      // The old per-version notes are the oldest, so they close the last page.
      legacy={current === pages ? legacy : []}
      currentUserId={currentUserId}
      isOwner={isOwner}
      pagination={count > NOTES_PAGE_SIZE ? <ListPagination path={path} params={{ tab: "notes" }} page={current} total={count} pageSize={NOTES_PAGE_SIZE} pageParam="notesPage" density="compact" /> : null}
    />
  );
}

/** Same header and first rows as `NotesPanel`. */
export function NotesSectionSkeleton() {
  return (
    <section className="flex flex-col gap-4" aria-busy>
      <div className="flex items-center justify-between gap-3">
        <div>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-3.5 w-72 max-w-full" />
        </div>
        <Skeleton className="h-8 w-36 rounded-lg" />
      </div>
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((index) => (
          <div key={index} className="rounded-xl border bg-card p-3">
            <Skeleton className="h-3.5 w-5/6" />
            <Skeleton className="mt-2.5 h-3 w-40" />
          </div>
        ))}
      </div>
      <span role="status" className="sr-only">Зареждане…</span>
    </section>
  );
}

