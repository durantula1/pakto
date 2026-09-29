"use client";

import { useState } from "react";
import type { Key } from "react-aria-components";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Client portal document view beside a sticky summary. At most four tabs: the document ("Детайли", or
 * "Договор" once an offer is in force), the decision (only while one is possible, or before any
 * agreement), the work and payments of an offer in force, and questions.
 */
export function PortalChangeTabs({ details, decision, history, summary, pending, questions, work, unreadAnswers = 0, inForce = false }: {
  details: React.ReactNode;
  decision: React.ReactNode;
  history: React.ReactNode;
  summary: React.ReactNode;
  pending: boolean;
  questions?: React.ReactNode;
  /** Stages and payments of this offer, once it is in force. */
  work?: React.ReactNode;
  unreadAnswers?: number;
  /** The document is an approved agreement; its record of the decision moves under the document. */
  inForce?: boolean;
}) {
  const [tab, setTab] = useState<Key>(unreadAnswers ? "questions" : "details");
  const showDecision = pending || !inForce;
  const toDecision = (
    <Button className="h-11 w-full text-base" onPress={() => { setTab("decision"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
      Към решението <ArrowRight />
    </Button>
  );

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_21.25rem]">
      <Tabs selectedKey={tab} onSelectionChange={setTab} className="min-w-0">
        <TabsList aria-label="Раздели на офертата">
          <TabsTrigger id="details">{inForce ? "Договор" : "Детайли"}</TabsTrigger>
          {showDecision ? (
            <TabsTrigger id="decision">
              Решение
              {pending ? <span aria-label="очаква решение" className="size-2 rounded-full bg-primary in-data-selected:bg-primary-foreground" /> : null}
            </TabsTrigger>
          ) : null}
          {work ? <TabsTrigger id="work">Изпълнение</TabsTrigger> : null}
          {questions ? (
            <TabsTrigger id="questions">
              Въпроси
              {unreadAnswers ? <span aria-label={`${unreadAnswers} нов отговор`} className="rounded-full bg-primary px-1.5 text-2xs text-primary-foreground in-data-selected:bg-primary-foreground in-data-selected:text-primary">{unreadAnswers}</span> : null}
            </TabsTrigger>
          ) : null}
        </TabsList>
        <TabsContent id="details" className="flex flex-col gap-5 pt-3">
          {details}
          {pending ? <div className="lg:hidden">{toDecision}</div> : null}
          {showDecision ? null : decision}
          {history}
        </TabsContent>
        {showDecision ? <TabsContent id="decision" className="pt-3">{decision}</TabsContent> : null}
        {work ? <TabsContent id="work" className="flex flex-col gap-4 pt-3">{work}</TabsContent> : null}
        {questions ? <TabsContent id="questions" className="pt-3">{questions}</TabsContent> : null}
      </Tabs>
      <aside className="order-first flex flex-col gap-3 lg:sticky lg:top-6 lg:order-none lg:mt-[3.75rem]">
        {summary}
        {pending && tab !== "decision" ? <div className="hidden lg:block">{toDecision}</div> : null}
      </aside>
    </div>
  );
}
