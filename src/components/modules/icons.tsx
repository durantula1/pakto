import { Banknote, Clock3, FileSpreadsheet, Handshake, ListChecks, ChartNoAxesCombined, Blocks, type LucideIcon } from "lucide-react";

const byHref: Record<string, LucideIcon> = {
  "/app/tasks": ListChecks,
  "/app/crm": Handshake,
  "/app/time": Clock3,
  "/app/expenses": Banknote,
  "/app/invoices": FileSpreadsheet,
  "/app/reports": ChartNoAxesCombined,
};

/** One recognisable icon per module, so the sidebar can be scanned instead of read. */
export function moduleIcon(href: string): LucideIcon {
  return byHref[href] ?? Blocks;
}
