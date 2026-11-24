import type { Metadata } from "next";
import Link from "next/link";
import { FolderKanban, Contact, EyeOff, Eye, FileLock2, KeyRound, Signature, Smartphone, Clapperboard, CalendarRange, ClipboardCheck, Handshake, Link2, ListChecks, MessageCircleQuestion, ToggleRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { DocumentStatusBadge } from "@/components/change-orders/document-status-badge";
import { ScenarioPlayer } from "@/components/guide/scenario-player";
import { PageHeader } from "@/components/workspace/page/page-header";
import { PageShell } from "@/components/workspace/page/page-shell";

const promises = [
  { icon: FileLock2, title: "Изпратеното не се променя", text: "Изпратената версия се заключва. Корекция означава нова версия, а старата остава." },
  { icon: Smartphone, title: "Клиентът потвърждава от телефона", text: "Без регистрация и парола: линк, името му и код от имейла." },
  { icon: Signature, title: "Всяко „да“ остава записано", text: "Име, час, имейл и PDF, които пазите и двамата и които не могат да се променят после." },
];

const clientRules = [
  { icon: Contact, title: "Един клиент – няколко проекта", text: "Един клиент може да има няколко проекта. Данните му се пишат веднъж и се редактират от картата му в „Клиенти“." },
  { icon: FolderKanban, title: "Проектът е една работа за един клиент", text: "Нова работа за същия клиент е нов проект: „Нов проект“ → „Съществуващ клиент“. Още работа по същия проект е нова оферта в него." },
  { icon: CalendarRange, title: "Работа по договор или абонамент", text: "Не ти трябва оферта: добавяш етапи и вноски направо в проекта. Клиентът ги вижда в портала, ако порталът е включен." },
];

const yourRules = [
  { icon: Link2, title: "Клиентът потвърждава онлайн", text: "Получава линк и одобрява с името си и код от имейла. Не гониш отговор по телефона. В Настройки → Фирма избираш и друго: линк само за преглед, или без линк изобщо." },
  { icon: Handshake, title: "Договорихте се извън Pakto? Запиши го", text: "По телефона, на място или с договор на хартия: в офертата натисни „Отбележи като договорено“. Pakto пази кога и как е станало, и проектът тръгва." },
  { icon: ClipboardCheck, title: "Клиентът приема всеки етап", text: "Завършиш етап и клиентът го приема или пише какво да се поправи. Не спорите накрая какво е било готово." },
  { icon: MessageCircleQuestion, title: "Клиентът избира, ти не гадаеш", text: "Плочка, цвят, модел: в проекта, раздел „Въпроси“, питаш с 2 до 6 варианта, и със снимки. Изборът му остава записан." },
  { icon: ListChecks, title: "Знаеш кой какво прави днес", text: "Свързваш задача с етап. Когато задачите са готови, Pakto предлага да затвориш етапа, а „Задачи“ → „Днес“ показва работата за деня." },
  { icon: ToggleRight, title: "Включваш само каквото ползваш", text: "Модули: Задачи, Каталог, Финанси, Клиентски портал. Изключеният модул изчезва от менюто, а данните му остават." },
];

const stageStatuses: Array<{ label: string; variant: "sent" | "approved" | "warning-soft"; text: string }> = [
  { label: "Чака приемане", variant: "sent", text: "Поиска приемане на етапа. Клиентът има имейл и го вижда в портала." },
  { label: "Приет", variant: "approved", text: "Клиентът прие етапа с името си и код или ти го отбеляза. Вноската за него става дължима." },
  { label: "Забележки", variant: "warning-soft", text: "Клиентът писа какво да се поправи. След поправката поискай приемане отново." },
];

const statuses: Array<{ status: string; text: string }> = [
  { status: "draft", text: "Работиш по нея. Клиентът не я вижда." },
  { status: "sent", text: "Клиентът я има по имейл и още не я е отворил." },
  { status: "viewed", text: "Клиентът я е отворил. Чакаш решение." },
  { status: "approved", text: "Клиентът каза „да“ с името си и код от имейла. Това е договореното." },
  { status: "changes_requested", text: "Клиентът иска нещо различно. Направи нова версия." },
  { status: "declined", text: "Клиентът отказа. Можеш да предложиш нова версия." },
  { status: "expired", text: "Срокът на валидност изтече без решение. Изпрати я пак с нов срок." },
  { status: "superseded", text: "Стара версия, заменена с по-нова. Пази се в историята." },
];

const visibility = [
  { who: "Екипът вижда", icon: Eye, items: ["Всички версии, чернови и история", "Вътрешните бележки (ако имат право)", "Кога клиентът е отворил офертата", "Плащанията (ако имат право)"] },
  { who: "Клиентът вижда", icon: KeyRound, items: ["Само изпратените версии", "Какво се е променило спрямо предишната", "До кога е валидна офертата", "PDF и разписка за всяко свое решение", "Етапите, които чакат да ги приеме", "Въпросите ти с варианти („Попитай клиента“)"] },
  { who: "Клиентът никога не вижда", icon: EyeOff, items: ["Черновите ти", "Вътрешните бележки", "Кой от екипа какво е правил"] },
];

export const metadata: Metadata = { title: "Как работи" };

export default function GuidePage() {
  return (
    <PageShell>
      <PageHeader page="guide" actions={<Link href="/welcome?again=1" className="inline-flex h-9 items-center gap-2 rounded-lg border bg-card px-3 text-sm font-medium hover:bg-muted"><Clapperboard className="size-4 text-blue" />Виж въведението отново</Link>} />

      <div className="grid gap-3 sm:grid-cols-3">
        {promises.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl border bg-card p-4">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-blue"><Icon className="size-5" /></span>
            <p className="mt-3 font-semibold">{title}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border bg-card p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Клиенти и проекти</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {clientRules.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3 rounded-xl bg-muted/50 p-3">
              <Icon className="mt-0.5 size-5 shrink-0 text-blue" />
              <div><p className="font-medium">{title}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Работиш по твоите правила</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {yourRules.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3 rounded-xl bg-muted/50 p-3">
              <Icon className="mt-0.5 size-5 shrink-0 text-blue" />
              <div><p className="font-medium">{title}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p></div>
            </div>
          ))}
        </div>
      </section>

      <ScenarioPlayer />

      <section className="rounded-2xl border bg-card p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Думите, които ще виждаш</h2>
        <p className="mt-1 text-sm text-muted-foreground">Всяка оферта и промяна има статус. Той ти казва какво се случва и кой е наред.</p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {statuses.map(({ status, text }) => (
            <div key={status} className="flex items-start gap-3 rounded-xl bg-muted/50 p-3">
              <dt className="shrink-0"><DocumentStatusBadge status={status} /></dt>
              <dd className="text-sm leading-6">{text}</dd>
            </div>
          ))}
        </dl>
        <h3 className="mt-6 font-semibold">Етапите и приемането</h3>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          {stageStatuses.map(({ label, variant, text }) => (
            <div key={label} className="flex items-start gap-3 rounded-xl bg-muted/50 p-3">
              <dt className="shrink-0"><Badge variant={variant}>{label}</Badge></dt>
              <dd className="text-sm leading-6">{text}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        {visibility.map(({ who, icon: Icon, items }) => (
          <div key={who} className="rounded-2xl border bg-card p-4 sm:p-5">
            <p className="flex items-center gap-2 font-semibold"><Icon className="size-4 text-blue" />{who}</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
              {items.map((item) => <li key={item} className="flex gap-2"><span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 bg-primary" />{item}</li>)}
            </ul>
          </div>
        ))}
      </section>

      <p className="text-sm text-muted-foreground">
        Как се кани екип, какви са правата, как се записват плащания и други въпроси:{" "}
        <Link href="/faq" className="font-medium text-blue underline-offset-4 hover:underline">Често задавани въпроси</Link>
      </p>
    </PageShell>
  );
}
