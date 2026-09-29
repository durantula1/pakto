"use client";

import "@fontsource/noto-sans/400.css";
import "@fontsource/noto-sans/600.css";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { FileDown, FileText, MonitorSmartphone, XIcon } from "lucide-react";

import { DocumentBody } from "@/components/change-orders/document-body";
import { buttonVariants } from "@/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { demoOffer } from "@/modules/organizations/demo-offer";
import { logoBox, type DocumentLogo } from "@/modules/organizations/logo-box";

/**
 * A whole sample offer with the company's logo, full size, as the client sees it in the portal and
 * on paper. `logo` may be a file that is not saved yet; `footer` carries the save actions then.
 */
export function DemoOfferDialog({ isOpen, onOpenChange, organizationName, logo, footer, canOpenPdf }: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  organizationName: string;
  logo: DocumentLogo | null;
  footer?: ReactNode;
  /** The real PDF is rendered on the server, so it exists only for a saved logo. */
  canOpenPdf: boolean;
}) {
  const [view, setView] = useState<"pdf" | "portal">("pdf");
  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      showCloseButton={false}
      className="flex h-[calc(100dvh-2rem)] max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl [&>[data-slot=dialog]]:flex [&>[data-slot=dialog]]:min-h-0 [&>[data-slot=dialog]]:flex-1 [&>[data-slot=dialog]]:flex-col [&>[data-slot=dialog]]:gap-0"
    >
      <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3 sm:px-5">
        <div className="mr-auto min-w-0">
          <DialogTitle>Примерна оферта с твоето лого</DialogTitle>
          <DialogDescription className="mt-1 text-xs">Примерни данни, реален размер. Така я вижда клиентът.</DialogDescription>
        </div>
        <div role="tablist" aria-label="Изглед" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          {([["pdf", "PDF", FileText], ["portal", "Портал", MonitorSmartphone]] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={view === key}
              onClick={() => setView(key)}
              className={cn("flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium text-muted-foreground transition", view === key && "bg-background text-foreground shadow-sm")}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>
        {/* In the header row rather than the corner, so it never sits on top of the view switch. */}
        <DialogClose variant="ghost" size="icon" aria-label="Затвори" className="-mr-1.5">
          <XIcon />
        </DialogClose>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-neutral-200/70 p-3 sm:p-6 dark:bg-neutral-900">
        {view === "pdf" ? <PdfSheet organizationName={organizationName} logo={logo} /> : <PortalPage organizationName={organizationName} logo={logo} />}
      </div>

      {canOpenPdf || footer ? <div className="flex flex-wrap items-center justify-end gap-2 border-t bg-muted/50 px-4 py-3 sm:px-5">
        {canOpenPdf ? (
          <a href="/api/organization/demo-offer" target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "ghost" }), "mr-auto h-9 gap-2")}>
            <FileDown className="size-4" /> Отвори истинския PDF
          </a>
        ) : null}
        {footer}
      </div> : null}
    </Dialog>
  );
}

/** The client portal's document page at its real width: title block, then the same DocumentBody. */
function PortalPage({ organizationName, logo }: { organizationName: string; logo: DocumentLogo | null }) {
  return (
    <div className="mx-auto grid max-w-3xl gap-3">
      <div className="rounded-2xl bg-sidebar p-5 text-sidebar-foreground">
        <p className="text-sm text-sidebar-foreground/70">Оферта · <span className="font-mono">{demoOffer.code}</span> · версия 1</p>
        <p className="mt-1 text-2xl font-semibold">{demoOffer.title}</p>
        <p className="mt-1 text-sm text-sidebar-foreground/70">{organizationName} · {demoOffer.project}</p>
      </div>
      <DocumentBody document={demoOffer.document} brand={{ name: organizationName, logo }} />
    </div>
  );
}

const money = new Intl.NumberFormat("bg-BG", { style: "currency", currency: "EUR" });
const quantity = new Intl.NumberFormat("bg-BG", { maximumFractionDigits: 3 });
const date = new Intl.DateTimeFormat("bg-BG", { dateStyle: "long", timeZone: "Europe/Sofia" });
/** Same box as the PDF (logoBox in points); a logo of unknown size falls back to the old fixed height. */
function pdfLogoStyle(logo: DocumentLogo) {
  if (!logo.dimensions) return { height: "36pt", maxWidth: "180pt" };
  const box = logoBox(logo.dimensions, logo.size);
  return { width: `${box.width}pt`, height: `${box.height}pt` };
}

/** A4 in CSS pixels (595.28 × 841.89 pt at 96 dpi). */
const SHEET_WIDTH = 793.7;
const SHEET_HEIGHT = 1122.5;

/**
 * An A4 sheet at 100%, with the measurements of src/modules/pdf/change-document.tsx in points
 * (the PDF's own unit), so sizes match the real file. It only shrinks to fit a narrower screen.
 */
function PdfSheet({ organizationName, logo }: { organizationName: string; logo: DocumentLogo | null }) {
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const element = frame.current;
    if (!element) return;
    // Measured before the first paint too: the observer reports only on the next frame, and a phone would flash a full-size sheet.
    const fit = (width: number) => setScale(Math.min(1, width / SHEET_WIDTH));
    fit(element.clientWidth);
    const observer = new ResizeObserver(([entry]) => fit(entry!.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const { document } = demoOffer;
  const sent = new Date();
  const facts: [string, string][] = [
    ["Обект", demoOffer.project],
    ["Клиент", demoOffer.contact],
    ["Адрес", demoOffer.siteAddress],
    ["Срок за изпълнение", date.format(new Date(`${demoOffer.agreedDeadline}T12:00:00Z`))],
    ["Изпратена", date.format(sent)],
    ["Валидна до", date.format(new Date(sent.getTime() + 14 * 86_400_000))],
  ];
  const ink = "#1c2420";
  const muted = "#66706b";
  const rule = "#dfe3df";
  const label = { fontSize: "8pt", color: muted, textTransform: "uppercase", letterSpacing: "0.4pt" } as const;

  return (
    <div ref={frame} className="mx-auto w-full" style={{ maxWidth: SHEET_WIDTH, height: SHEET_HEIGHT * scale }}>
      <div
        className="relative origin-top-left bg-white shadow-lg"
        style={{
          width: SHEET_WIDTH, height: SHEET_HEIGHT, transform: `scale(${scale})`,
          padding: "40pt 44pt 56pt", color: ink, fontFamily: "'Noto Sans', sans-serif", fontSize: "10pt", lineHeight: 1.4,
        }}
      >
        <div className="flex items-start justify-between" style={{ paddingBottom: "16pt", borderBottom: `1.5pt solid ${ink}` }}>
          <div>
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- local object URL or the stored PNG
              <img src={logo.url} alt="" style={{ ...pdfLogoStyle(logo), objectFit: "contain", objectPosition: "left", marginBottom: "8pt" }} />
            ) : null}
            <p style={{ fontSize: "11pt", fontWeight: 600 }}>{organizationName}</p>
            <p style={{ color: muted, fontSize: "9pt" }}>Създадено с Pakto</p>
          </div>
          <div className="text-right">
            <p style={{ fontSize: "9pt", color: muted, textTransform: "uppercase", letterSpacing: "0.6pt" }}>Оферта · версия 1</p>
            <p style={{ fontSize: "16pt", fontWeight: 600 }}>{demoOffer.code}</p>
          </div>
        </div>

        <p style={{ fontSize: "18pt", fontWeight: 600, marginTop: "18pt", lineHeight: 1.25 }}>{demoOffer.title}</p>
        <div className="flex flex-wrap" style={{ marginTop: "12pt" }}>
          {facts.map(([name, value]) => (
            <div key={name} style={{ width: "50%", padding: "3pt 12pt 3pt 0" }}>
              <p style={label}>{name}</p>
              <p>{value}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "22pt" }}>
          <p style={{ fontSize: "11pt", fontWeight: 600, marginBottom: "6pt" }}>Обхват на работата</p>
          <p>{document.description}</p>
          <p style={{ marginTop: "6pt", color: muted }}>Бележка към клиента: {document.clientNote}</p>
        </div>

        <div style={{ marginTop: "22pt" }}>
          <div className="flex" style={{ ...label, padding: "6pt 0", borderBottom: `1pt solid ${ink}` }}>
            <span style={{ width: "52%", paddingRight: "10pt" }}>Описание</span>
            <span style={{ width: "14%", paddingRight: "8pt", textAlign: "right" }}>Кол.</span>
            <span style={{ width: "16%", paddingRight: "8pt", textAlign: "right" }}>Ед. цена</span>
            <span style={{ width: "18%", textAlign: "right" }}>Сума</span>
          </div>
          {document.lineItems.map((line) => (
            <div key={line.id} className="flex" style={{ padding: "7pt 0", borderBottom: `0.75pt solid ${rule}` }}>
              <span style={{ width: "52%", paddingRight: "10pt" }}>{line.description}</span>
              <span style={{ width: "14%", paddingRight: "8pt", textAlign: "right" }}>{quantity.format(Number(line.quantity))} {line.unit}</span>
              <span style={{ width: "16%", paddingRight: "8pt", textAlign: "right" }}>{money.format(Number(line.unitPrice))}</span>
              <span style={{ width: "18%", textAlign: "right" }}>{money.format(Number(line.lineTotal))}</span>
            </div>
          ))}
          <div style={{ marginTop: "10pt", marginLeft: "auto", width: "48%" }}>
            <p className="flex justify-between" style={{ padding: "3pt 0" }}><span style={{ color: muted }}>Без ДДС</span><span>{money.format(Number(document.subtotal))}</span></p>
            <p className="flex justify-between" style={{ padding: "3pt 0" }}><span style={{ color: muted }}>ДДС 20%</span><span>{money.format(Number(document.taxAmount))}</span></p>
            <p className="flex justify-between" style={{ marginTop: "6pt", paddingTop: "8pt", borderTop: `1.5pt solid ${ink}`, fontSize: "12pt", fontWeight: 600 }}>
              <span>Общо</span><span>{money.format(Number(document.total))}</span>
            </p>
          </div>
        </div>

        <div className="absolute flex justify-between" style={{ bottom: "24pt", left: "44pt", right: "44pt", fontSize: "7pt", color: muted, borderTop: `0.75pt solid ${rule}`, paddingTop: "6pt" }}>
          <span>{demoOffer.code} · версия 1 · примерна оферта</span>
          <span>Страница 1 от 1</span>
        </div>
      </div>
    </div>
  );
}
