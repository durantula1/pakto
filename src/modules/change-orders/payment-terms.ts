import { z } from "zod";
import "@/lib/zod-messages";

/**
 * Payment terms of an offer version: which share of the total is due when. They are part of what the
 * client approves (frozen with the version) and become the project's installments on approval.
 * `stage` is the 1-based position of a line in the same version's schedule (for "on_stage").
 */
export type PaymentTermTrigger = "on_approval" | "on_stage" | "on_completion" | "on_date";
export type PaymentTerm = { title: string; percent: number; dueTrigger: PaymentTermTrigger; dueOn?: string; stage?: number };

export const PAYMENT_TERMS_MAX = 8;

export const paymentTriggerLabels: Record<PaymentTermTrigger, string> = {
  on_approval: "При одобрение",
  on_stage: "След етап",
  on_completion: "При завършване",
  on_date: "На дата",
};

/** Common splits, offered as one tap. Titles are what the client reads. */
export const paymentPresets: { id: string; label: string; terms: PaymentTerm[] }[] = [
  { id: "full", label: "100% при завършване", terms: [{ title: "Плащане при завършване", percent: 100, dueTrigger: "on_completion" }] },
  { id: "30-70", label: "30% аванс · 70% накрая", terms: [{ title: "Аванс", percent: 30, dueTrigger: "on_approval" }, { title: "Окончателно плащане", percent: 70, dueTrigger: "on_completion" }] },
  { id: "50-50", label: "50% аванс · 50% накрая", terms: [{ title: "Аванс", percent: 50, dueTrigger: "on_approval" }, { title: "Окончателно плащане", percent: 50, dueTrigger: "on_completion" }] },
  { id: "30-40-30", label: "30 · 40 · 30", terms: [{ title: "Аванс", percent: 30, dueTrigger: "on_approval" }, { title: "Междинно плащане", percent: 40, dueTrigger: "on_date" }, { title: "Окончателно плащане", percent: 30, dueTrigger: "on_completion" }] },
];

const termSchema = z.object({
  title: z.string().trim().min(2, "Всяко плащане има нужда от име.").max(180),
  percent: z.coerce.number().positive("Процентът трябва да е над 0.").max(100),
  dueTrigger: z.enum(["on_approval", "on_stage", "on_completion", "on_date"]),
  dueOn: z.union([z.literal(""), z.iso.date("Избери дата на плащането.")]).optional(),
  stage: z.coerce.number().int().positive().optional(),
}).superRefine((term, context) => {
  if (term.dueTrigger === "on_date" && !term.dueOn) context.addIssue({ code: "custom", message: `Избери дата за „${term.title}“.` });
  if (term.dueTrigger === "on_stage" && !term.stage) context.addIssue({ code: "custom", message: `Избери етап за „${term.title}“.` });
});

/** The `paymentTerms` form field: a JSON list; empty means no terms (the company plans installments by hand). */
export const paymentTermsField = z
  .string()
  .optional()
  .transform((value, context) => {
    if (!value) return [];
    try {
      return JSON.parse(value) as unknown;
    } catch {
      context.addIssue({ code: "custom", message: "Условията за плащане не са валидни." });
      return z.NEVER;
    }
  })
  .pipe(z.array(termSchema).max(PAYMENT_TERMS_MAX, `Най-много ${PAYMENT_TERMS_MAX} плащания.`))
  .superRefine((terms, context) => {
    if (!terms.length) return;
    const total = Math.round(terms.reduce((sum, term) => sum + term.percent, 0) * 100) / 100;
    if (total !== 100) context.addIssue({ code: "custom", message: `Плащанията трябва да са общо 100 %, сега са ${total.toString().replace(".", ",")} %.` });
  });

/** Sum of the percentages, rounded to cents of a percent. */
export function termsPercent(terms: Pick<PaymentTerm, "percent">[]) {
  return Math.round(terms.reduce((sum, term) => sum + (Number(term.percent) || 0), 0) * 100) / 100;
}

/** Amount of each term in cents; the last term takes the rounding remainder so they add up exactly. */
export function termAmounts(totalMinor: bigint, terms: Pick<PaymentTerm, "percent">[]) {
  let assigned = 0n;
  return terms.map((term, index) => {
    if (index === terms.length - 1) return totalMinor - assigned;
    // Rounded to the nearest cent: truncating pushed every lost fraction onto the last term (1,10 instead of 1,08).
    const amount = (totalMinor * BigInt(Math.round(Number(term.percent) * 100)) + 5000n) / 10000n;
    assigned += amount;
    return amount;
  });
}

/** The kind an installment gets from its term. */
export function termPaymentKind(trigger: PaymentTermTrigger, index: number, count: number): "deposit" | "progress" | "final" {
  if (trigger === "on_approval" && index === 0) return "deposit";
  if (trigger === "on_completion" || index === count - 1) return "final";
  return "progress";
}
