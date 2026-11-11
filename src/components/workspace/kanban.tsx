"use client";

import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { formatAmount } from "@/lib/money";
import { cn } from "@/lib/utils";

export type KanbanTone = "blue" | "sand" | "mint" | "coral" | "teal" | "stone";
export type KanbanColumn = {
  id: string;
  title: string;
  tone: KanbanTone;
  /** A card dropped here first asks for a reason (a lost deal). */
  asksReason?: string;
  /** What the empty drop area says. */
  empty: string;
  /** Server-rendered footer, e.g. the quick-add form. */
  footer?: ReactNode;
};
export type KanbanCard = { id: string; columnId: string; /** Summed in the column header. */ amount?: number; node: ReactNode };

const toneBar: Record<KanbanTone, string> = {
  blue: "bg-tile-blue-foreground",
  sand: "bg-tile-sand-foreground",
  mint: "bg-tile-mint-foreground",
  coral: "bg-tile-coral-foreground",
  teal: "bg-tile-teal-foreground",
  stone: "bg-tile-stone-foreground",
};
const toneBadge: Record<KanbanTone, "info-soft" | "warning-soft" | "success-soft" | "danger-soft" | "teal-soft" | "stone-soft"> = {
  blue: "info-soft", sand: "warning-soft", mint: "success-soft", coral: "danger-soft", teal: "teal-soft", stone: "stone-soft",
};

/**
 * A board whose cards drag between columns. The move goes through a server action (`cardField` and
 * `columnField` name its form fields), shows at once and is undone with a message if the server refuses.
 * Touch screens, where dragging fights scrolling, get a "Премести в" menu on every card.
 */
export function Kanban({ columns, cards, moveAction, cardField, columnField, reasonField, currency = "€" }: {
  columns: KanbanColumn[];
  cards: KanbanCard[];
  moveAction: (formData: FormData) => Promise<unknown>;
  cardField: string;
  columnField: string;
  reasonField?: string;
  currency?: string;
}) {
  // The column each card sits in right now; starts from the server and follows drops.
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [pendingReason, setPendingReason] = useState<{ cardId: string; columnId: string } | null>(null);
  const [reason, setReason] = useState("");
  const [, startTransition] = useTransition();
  const columnOf = (card: KanbanCard) => placed[card.id] ?? card.columnId;

  function move(cardId: string, columnId: string, why?: string) {
    const card = cards.find((item) => item.id === cardId);
    if (!card || columnOf(card) === columnId) return;
    const before = columnOf(card);
    setPlaced((current) => ({ ...current, [cardId]: columnId }));
    startTransition(async () => {
      const formData = new FormData();
      formData.set(cardField, cardId);
      formData.set(columnField, columnId);
      if (reasonField) formData.set(reasonField, why ?? "");
      const result = (await moveAction(formData)) as { error?: string } | undefined;
      if (result?.error) {
        setPlaced((current) => ({ ...current, [cardId]: before }));
        toast.error(result.error);
      }
    });
  }

  function request(cardId: string, columnId: string) {
    const column = columns.find((item) => item.id === columnId);
    if (column?.asksReason) {
      setReason("");
      setPendingReason({ cardId, columnId });
      return;
    }
    move(cardId, columnId);
  }

  return (
    <>
      <div className="-mx-4 flex min-h-[60dvh] items-stretch gap-3 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        {columns.map((column) => {
          const inColumn = cards.filter((card) => columnOf(card) === column.id);
          const sum = inColumn.reduce((total, card) => total + (card.amount ?? 0), 0);
          const hasAmounts = cards.some((card) => card.amount !== undefined);
          const active = over === column.id && dragging !== null;
          return (
            <section
              key={column.id}
              aria-label={column.title}
              onDragOver={(event) => { if (dragging) { event.preventDefault(); setOver(column.id); } }}
              onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver((current) => (current === column.id ? null : current)); }}
              onDrop={(event) => { event.preventDefault(); const id = event.dataTransfer.getData("text/plain") || dragging; setOver(null); setDragging(null); if (id) request(id, column.id); }}
              className={cn("flex w-64 shrink-0 flex-col xl:w-auto xl:min-w-56 xl:flex-1 overflow-hidden rounded-xl border bg-muted/40 transition-colors", active && "border-primary bg-primary/5 ring-2 ring-primary/30")}
            >
              <div className={cn("h-1 shrink-0", toneBar[column.tone])} />
              <header className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
                <h2 className="truncate text-sm font-semibold">{column.title}</h2>
                <div className="flex items-center gap-2">
                  {hasAmounts && sum > 0 ? <span className="text-xs font-medium text-muted-foreground tabular-nums">{formatAmount(sum)} {currency}</span> : null}
                  <Badge variant={toneBadge[column.tone]}>{inColumn.length}</Badge>
                </div>
              </header>
              <div className="flex flex-1 flex-col gap-2 px-2 pb-2">
                {inColumn.map((card) => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={(event) => { event.dataTransfer.setData("text/plain", card.id); event.dataTransfer.effectAllowed = "move"; setDragging(card.id); }}
                    onDragEnd={() => { setDragging(null); setOver(null); }}
                    className={cn("cursor-grab rounded-lg border bg-card shadow-xs transition-shadow hover:shadow-md active:cursor-grabbing", dragging === card.id && "opacity-40")}
                  >
                    {card.node}
                    <div className="hidden px-3 pb-3 pointer-coarse:block">
                      <NativeSelect aria-label="Премести в" value={columnOf(card)} onChange={(event) => request(card.id, event.target.value)} className="h-9 text-sm">
                        {columns.map((target) => <option key={target.id} value={target.id}>Премести в: {target.title}</option>)}
                      </NativeSelect>
                    </div>
                  </div>
                ))}
                {!inColumn.length ? (
                  <div className={cn("grid flex-1 place-items-center rounded-lg border-2 border-dashed px-3 py-8 text-center text-sm text-muted-foreground transition-colors", active ? "border-primary text-primary" : "border-border")}>
                    {active ? "Пусни тук" : column.empty}
                  </div>
                ) : null}
              </div>
              {column.footer ? <div className="border-t bg-card/50 p-2">{column.footer}</div> : null}
            </section>
          );
        })}
      </div>

      <Dialog isOpen={pendingReason !== null} onOpenChange={(open) => { if (!open) setPendingReason(null); }} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{columns.find((column) => column.id === pendingReason?.columnId)?.title}</DialogTitle>
          <DialogDescription>{columns.find((column) => column.id === pendingReason?.columnId)?.asksReason}</DialogDescription>
        </DialogHeader>
        <Textarea aria-label="Причина" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={300} autoFocus />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onPress={() => setPendingReason(null)}>Отказ</Button>
          <Button isDisabled={reason.trim().length < 2} onPress={() => { if (pendingReason) move(pendingReason.cardId, pendingReason.columnId, reason.trim()); setPendingReason(null); }}>Запази</Button>
        </div>
      </Dialog>
    </>
  );
}
