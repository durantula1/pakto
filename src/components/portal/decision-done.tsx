import { Check } from "lucide-react";

const copy: Record<string, { title: string; next: string }> = {
  approved: { title: "Одобрено", next: "Фирмата е уведомена и може да започне по договореното." },
  changes_requested: { title: "Искането е изпратено", next: "Фирмата ще ви изпрати нова версия. Ще получите имейл, когато е готова." },
  declined: { title: "Отказът е записан", next: "Фирмата е уведомена. Работата по нея няма да се прави." },
};

/** After a decision: what was recorded and what happens next, where the client lands. */
export function DecisionDone({ decision }: { decision: unknown }) {
  const text = typeof decision === "string" ? copy[decision] : undefined;
  if (!text) return null;
  return (
    <div role="status" className="flex items-start gap-3 rounded-2xl bg-tile-mint p-4 text-tile-mint-foreground">
      <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-green"><Check className="size-5" strokeWidth={3} /></span>
      <div className="flex flex-col gap-1">
        <p className="text-lg font-semibold">{text.title}</p>
        <p className="text-sm leading-6">{text.next} Разписката е на имейла ви.</p>
      </div>
    </div>
  );
}
