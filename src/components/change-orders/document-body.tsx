import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDay, vatLabel } from "@/modules/change-orders/labels";
import { daysLabel, scheduleDays } from "@/modules/change-orders/schedule";
import { discountLabel, type DiscountType } from "@/modules/change-orders/pricing";
import { paymentTriggerLabels, termAmounts, type PaymentTermTrigger } from "@/modules/change-orders/payment-terms";
import { logoBox, ptToRem, type DocumentLogo } from "@/modules/organizations/logo-box";
import { formatAmount } from "@/lib/money";

const money = formatAmount;

export type DocumentBodyLine = {
  id: number | string;
  description: string;
  quantity: string | number;
  unit: string | null;
  unitPrice: string | number;
  lineTotal: string | number;
};

/**
 * The document as the client reads it: scope, reason, priced lines with totals, and the note for
 * the client. Staff and portal render this same component, so the team sees exactly what was sent.
 */
export function DocumentBody({ document, brand }: {
  /** Company name and logo at the top of the document; omitted where the page header already shows them. */
  brand?: { name: string; logo: DocumentLogo | null };
  document: {
    documentKind: "offer" | "change";
    description: string;
    reason: string | null;
    clientNote: string | null;
    subtotal: string;
    discountAmount: string | null;
    discountType: DiscountType | null;
    discountValue: string | null;
    taxRate: string;
    total: string;
    lineItems: DocumentBodyLine[];
    /** The indicative schedule of an offer, if the company added one. */
    schedule?: Array<{ id?: number | string; title: string; durationDays: number }>;
    agreedDeadline?: string | null;
    /** When and how much is due; part of what the client approves. */
    paymentTerms?: PaymentTermView[];
    /** Approved changes this version already includes. */
    absorbedChanges?: Array<{ id: string; title: string; total: string }>;
  };
}) {
  const discount = Number(document.discountAmount ?? 0);
  return (
    <Card>
      <CardContent className="space-y-5">
        {brand ? <DocumentBrand name={brand.name} logo={brand.logo} /> : null}
        <div className="grid gap-5 sm:grid-cols-2">
          <section className={document.reason ? undefined : "sm:col-span-2"}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {document.documentKind === "offer" ? "Какво включва" : "Какво се променя"}
            </p>
            <p className="mt-1.5 leading-7 whitespace-pre-line">{document.description}</p>
          </section>
          {document.reason ? (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Защо е необходимо</p>
              <p className="mt-1.5 leading-7 whitespace-pre-line">{document.reason}</p>
            </section>
          ) : null}
        </div>
        {document.lineItems.length ? (
          <section className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="hidden bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground sm:table-header-group">
                <tr>
                  <th className="px-3 py-2 font-semibold">Услуга / материал</th>
                  <th className="px-3 py-2 text-right font-semibold">Количество</th>
                  <th className="px-3 py-2 text-right font-semibold">Ед. цена</th>
                  <th className="px-3 py-2 text-right font-semibold">Сума</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {document.lineItems.map((line) => (
                  <tr key={line.id} className="align-top">
                    <td className="px-3 py-2.5">
                      <p>{line.description}</p>
                      <p className="text-xs text-muted-foreground sm:hidden">
                        {Number(line.quantity)} {line.unit} × {money(line.unitPrice)}
                      </p>
                    </td>
                    <td className="hidden px-3 py-2.5 text-right tabular-nums text-muted-foreground sm:table-cell">
                      {Number(line.quantity)} {line.unit}
                    </td>
                    <td className="hidden px-3 py-2.5 text-right tabular-nums text-muted-foreground sm:table-cell">
                      {money(line.unitPrice)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums">{money(line.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t bg-muted/30 text-muted-foreground">
                {discount ? <>
                  <tr>
                    <td colSpan={3} className="px-3 pt-2.5 text-right">Сума без отстъпка</td>
                    <td className="px-3 pt-2.5 text-right tabular-nums text-foreground">{money(Number(document.subtotal) + discount)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-3 pt-1 text-right text-primary">{discountLabel(document.discountType, document.discountValue)}</td>
                    <td className="px-3 pt-1 text-right font-medium tabular-nums text-primary">−{money(discount)}</td>
                  </tr>
                </> : null}
                <tr>
                  <td colSpan={3} className="px-3 pt-2.5 text-right">Основа</td>
                  <td className="px-3 pt-2.5 text-right tabular-nums text-foreground">{money(document.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-3 pb-2.5 text-right">{Number(document.taxRate) ? vatLabel(document.taxRate) : "Не се начислява ДДС"}</td>
                  <td className="px-3 pb-2.5 text-right tabular-nums text-foreground">{money(Number(document.total) - Number(document.subtotal))}</td>
                </tr>
                <tr className="border-t text-foreground">
                  <td colSpan={3} className="px-3 py-2.5 text-right font-semibold">Общо</td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{money(document.total)}</td>
                </tr>
              </tfoot>
            </table>
          </section>
        ) : null}
        {document.schedule?.length ? <ScheduleSection schedule={document.schedule} deadline={document.agreedDeadline ?? null} /> : null}
        {document.paymentTerms?.length ? <PaymentTermsSection terms={document.paymentTerms} total={document.total} deadline={document.agreedDeadline ?? null} /> : null}
        {document.absorbedChanges?.length ? (
          <section className="rounded-xl border border-dashed p-3 text-sm">
            <p className="font-medium">Тази версия включва одобрените промени</p>
            <ul className="mt-1.5 space-y-1 text-muted-foreground">
              {document.absorbedChanges.map((change) => <li key={change.id} className="flex justify-between gap-3"><span className="min-w-0 truncate">{change.title}</span><span className="shrink-0 tabular-nums">{money(change.total)}</span></li>)}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">След одобрение те не се добавят отделно към цената: вече са в сумата по-горе.</p>
          </section>
        ) : null}
        {document.clientNote ? <p className="rounded-xl bg-muted p-4 text-sm whitespace-pre-line">{document.clientNote}</p> : null}
      </CardContent>
    </Card>
  );
}

/** An offer's indicative schedule: stages and durations, without dates, and clearly not a commitment. */
export function ScheduleSection({ schedule, deadline }: { schedule: Array<{ id?: number | string; title: string; durationDays: number }>; deadline: string | null }) {
  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ориентировъчен график</p>
      <ol className="mt-2 divide-y rounded-xl border text-sm">
        {schedule.map((item, index) => (
          <li key={item.id ?? index} className="flex items-baseline justify-between gap-3 px-3 py-2.5">
            <span className="min-w-0"><span className="mr-2 text-muted-foreground tabular-nums">{index + 1}.</span>{item.title}</span>
            <span className="shrink-0 text-muted-foreground tabular-nums">{daysLabel(item.durationDays)}</span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        Общо около {daysLabel(scheduleDays(schedule))}. Графикът е ориентировъчен: точните дати се уточняват след одобрение{deadline ? `, а договореният краен срок е ${formatDay(deadline)}` : ""}.
      </p>
    </section>
  );
}

/**
 * The company line of the document. The logo already carries the name, so it is repeated only as small text.
 * It is drawn at the same size as in the PDF (see logoBox); on a dark theme it sits on white, because
 * most logos are drawn for paper.
 */
export function DocumentBrand({ name, logo }: { name: string; logo: DocumentLogo | null }) {
  const box = logo?.dimensions ? logoBox(logo.dimensions, logo.size) : null;
  return (
    <div className="flex min-h-10 items-center justify-between gap-4 border-b pb-4">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- already an optimized PNG from storage
        <img
          src={logo.url}
          alt={name}
          style={box ? { width: ptToRem(box.width), height: ptToRem(box.height) } : undefined}
          className={cn("max-w-[65%] shrink-0 object-contain object-left dark:rounded-md dark:bg-white dark:p-1", !box && "h-10 sm:h-12")}
        />
      ) : (
        <p className="text-base font-semibold">{name}</p>
      )}
      {logo ? <p className="min-w-0 truncate text-right text-sm text-muted-foreground">{name}</p> : null}
    </div>
  );
}

export type PaymentTermView = { id?: number | string; title: string; percent: number; dueTrigger: PaymentTermTrigger | string; dueOn: string | null; stageTitle?: string | null };

function termWhen(term: PaymentTermView, deadline: string | null) {
  if (term.dueTrigger === "on_date" && term.dueOn) return `До ${formatDay(term.dueOn)}`;
  if (term.dueTrigger === "on_stage") return term.stageTitle ? `След „${term.stageTitle}“` : "След етап";
  if (term.dueTrigger === "on_completion") return deadline ? `При завършване (срок ${formatDay(deadline)})` : "При завършване";
  return paymentTriggerLabels[term.dueTrigger as PaymentTermTrigger] ?? term.dueTrigger;
}

/** The offer's payment terms: share, amount and when each is due. */
export function PaymentTermsSection({ terms, total, deadline }: { terms: PaymentTermView[]; total: string; deadline: string | null }) {
  const totalMinor = BigInt(Math.round(Number(total) * 100));
  const amounts = termAmounts(totalMinor, terms);
  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Плащане</p>
      <ol className="mt-2 divide-y divide-dashed border-y border-dashed text-sm">
        {terms.map((term, index) => (
          <li key={term.id ?? index} className="flex items-baseline justify-between gap-3 py-2.5">
            <span className="min-w-0">
              <span className="block">{term.title} <span className="text-muted-foreground tabular-nums">· {Number(term.percent)}%</span></span>
              <span className="block text-xs text-muted-foreground">{termWhen(term, deadline)}</span>
            </span>
            <span className="shrink-0 font-medium tabular-nums">{money(Number(amounts[index]!) / 100)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
