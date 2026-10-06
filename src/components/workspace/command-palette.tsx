"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, BookOpen, Building2, CirclePlus, Compass, Contact, Euro, FileText, LayoutDashboard, LifeBuoy, Search, Settings, Users, type LucideIcon } from "lucide-react";

import { NewProjectSheetControlled } from "@/components/projects/new-project-form";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from "@/components/ui/command";
import { startNavigationProgress } from "@/components/workspace/navigation-progress";
import { searchWorkspaceAction, type SearchHit } from "@/modules/workspace/search-actions";

const pageIcons = { dashboard: LayoutDashboard, projects: Building2, clients: Contact, offers: FileText, catalog: BookOpen, finance: Euro, team: Users, settings: Settings, guide: Compass, notifications: Bell, support: LifeBuoy } satisfies Record<string, LucideIcon>;

/** A page or action for the palette; the icon is a name, since the server layout builds the list. */
export type PaletteLink = { href: string; label: string; icon: keyof typeof pageIcons; command?: "new-project" };

const hitIcons: Record<SearchHit["kind"], LucideIcon> = { project: Building2, client: Contact, offer: FileText };

/**
 * ⌘K: jump to a page, start something new, or find a project, client or offer by name. Pages and
 * actions filter in the browser; the search asks the server once typing pauses.
 */
export function CommandPalette({ pages, actions }: { pages: PaletteLink[]; actions: PaletteLink[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, startSearch] = useTransition();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey) && !event.altKey) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;
    const timer = setTimeout(() => startSearch(async () => setHits(await searchWorkspaceAction(term))), 250);
    return () => clearTimeout(timer);
  }, [query]);

  function change(value: boolean) {
    setOpen(value);
    if (!value) { setQuery(""); setHits([]); }
  }

  function go(href: string) {
    change(false);
    startNavigationProgress(href);
    router.push(href);
  }

  function run(key: string) {
    if (key === "new-project") {
      change(false);
      // The palette is a modal too; opening the sheet in the same turn fights its focus lock.
      window.setTimeout(() => setProjectOpen(true), 200);
      return;
    }
    go(key);
  }

  const shownHits = query.trim().length >= 2 ? hits : [];

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="hidden h-9 w-72 items-center gap-2 rounded-lg border bg-card pr-1.5 pl-3 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground md:flex xl:w-80">
        <Search className="size-4 shrink-0" />
        <span className="flex-1 truncate text-left">Търси обект, клиент, оферта…</span>
        <kbd className="rounded-md bg-muted px-1.5 py-0.5 font-sans text-2xs font-semibold">⌘K</kbd>
      </button>
      <button type="button" onClick={() => setOpen(true)} aria-label="Търсене" className="grid size-9 place-items-center rounded-lg border bg-card md:hidden"><Search className="size-4" /></button>
      <CommandDialog open={open} onOpenChange={change} title="Търсене" description="Търсете обект, клиент или оферта, или отидете на страница." className="sm:max-w-xl">
        <Command inputValue={query} onInputChange={setQuery}>
          <CommandInput placeholder="Търси обект, клиент, оферта или страница…" />
          <CommandList
            aria-label="Резултати"
            className="max-h-[min(26rem,60dvh)]"
            onAction={(key) => run(String(key))}
            renderEmptyState={() => <CommandEmpty>{searching ? "Търсене…" : "Нищо не намерихме."}</CommandEmpty>}
          >
            {shownHits.length ? (
              <CommandGroup heading="Намерени">
                {shownHits.map((hit) => {
                  const Icon = hitIcons[hit.kind];
                  return (
                    <CommandItem key={hit.id} id={hit.href} textValue={hit.text} className="py-2">
                      <Icon className="text-muted-foreground" />
                      <span className="flex min-w-0 flex-col"><span className="truncate font-medium">{hit.title}</span>{hit.detail ? <span className="truncate text-xs text-muted-foreground">{hit.detail}</span> : null}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ) : null}
            {actions.length ? (
              <CommandGroup heading="Ново">
                {actions.map((item) => (
                  <CommandItem key={item.command ?? item.href} id={item.command ?? item.href} textValue={item.label}>
                    <CirclePlus className="text-primary-ink" /> {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
            <CommandGroup heading="Страници">
              {pages.map((item) => {
                const Icon = pageIcons[item.icon];
                return (
                <CommandItem key={item.href} id={item.href} textValue={item.label}>
                  <Icon className="text-muted-foreground" /> {item.label}
                  {item.href === "/app" ? <CommandShortcut>Начало</CommandShortcut> : null}
                </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
      {actions.some((item) => item.command === "new-project") ? <NewProjectSheetControlled open={projectOpen} onOpenChange={setProjectOpen} /> : null}
    </>
  );
}
