"use client";

import { useState } from "react";
import { Tab, TabList, TabPanel, Tabs, type Key } from "react-aria-components";
import { FileText, Hammer, Wallet } from "lucide-react";

export type OfferTab = "work" | "payments" | "document";

const labels: Record<OfferTab, string> = { work: "Работа", payments: "Плащания", document: "Офертата" };
const icons: Record<OfferTab, typeof Hammer> = { work: Hammer, payments: Wallet, document: FileText };

/**
 * An offer the client approved, in three tabs: the work (handover and stages), its payments, and
 * the approved document itself. The page opens on the work once there is any, else on the document. The tab lives in the URL (`?tab=`), so a link from an
 * email opens the right one and a refresh keeps it.
 */
export function OfferTabs({ initial = "work", work, payments, document }: {
  initial?: OfferTab;
  work: React.ReactNode;
  payments: React.ReactNode;
  document: React.ReactNode;
}) {
  const [tab, setTab] = useState<OfferTab>(initial);
  function select(key: Key) {
    const next = key as OfferTab;
    setTab(next);
    const url = new URL(window.location.href);
    // Always in the URL: which tab opens by default depends on whether the offer has work yet.
    url.searchParams.set("tab", next);
    url.hash = "";
    window.history.replaceState(null, "", url);
  }
  const panels: Record<OfferTab, React.ReactNode> = { work, payments, document };
  return (
    <Tabs selectedKey={tab} onSelectionChange={select} className="flex flex-col gap-4">
      <TabList aria-label="Раздели на офертата" className="sticky top-17 z-10 grid grid-cols-3 before:absolute before:inset-x-0 before:-top-2 before:h-2 before:bg-background gap-1 rounded-full bg-card p-1.5 shadow-[0_0.75rem_1.5rem_-1rem_rgb(16_43_56/0.4)]">
        {(Object.keys(labels) as OfferTab[]).map((key) => {
          const Icon = icons[key];
          return (
            <Tab
              key={key}
              id={key}
              className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground data-focus-visible:ring-[3px] data-focus-visible:ring-ring/50 data-selected:bg-sidebar data-selected:font-semibold data-selected:text-sidebar-foreground"
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {labels[key]}
            </Tab>
          );
        })}
      </TabList>
      {(Object.keys(labels) as OfferTab[]).map((key) => (
        <TabPanel key={key} id={key} className="flex flex-col gap-4 outline-none">
          {panels[key]}
        </TabPanel>
      ))}
    </Tabs>
  );
}
