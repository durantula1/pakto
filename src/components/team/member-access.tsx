"use client";

import { startTransition, useActionState, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Check, ChevronDown, Minus } from "lucide-react";

import { ProjectScope, Segmented } from "@/components/team/project-scope";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { ProjectOption } from "@/components/workspace/project-combobox";
import { PERMISSION_GROUPS, PERMISSION_KEYS, PRESETS, presetOf, sortPermissions, type Permission, type PresetKey } from "@/lib/authz/permissions";
import { cn } from "@/lib/utils";
import { updateTeamMemberAction, type MemberAccessState } from "@/modules/team/actions";

const FORM_ID = "member-access";

type Access = { permissions: Permission[]; allProjects: boolean; projects: ProjectOption[] };

function sameAccess(a: Access, b: Access) {
  return sortPermissions(a.permissions).join() === sortPermissions(b.permissions).join()
    && a.allProjects === b.allProjects
    && (a.allProjects || a.projects.map((item) => item.id).sort().join() === b.projects.map((item) => item.id).sort().join());
}

/**
 * A non-owner's rights: role and project scope in one card on top, then the permissions, folded to
 * their names while a role template is in use. Saving sits in a sticky panel on the right (a bar
 * above the bottom navigation on phones). `children` go under it and must not contain the form.
 */
export function MemberAccess({ userId, initialPermissions, initialAllProjects, initialProjects, children }: {
  userId: string;
  initialPermissions: Permission[];
  initialAllProjects: boolean;
  /** Currently assigned projects; the rest are searched on demand. */
  initialProjects: ProjectOption[];
  children?: ReactNode;
}) {
  const [state, action, pending] = useActionState<MemberAccessState, FormData>(updateTeamMemberAction, {});
  const [saved, setSaved] = useState<Access>({ permissions: initialPermissions, allProjects: initialAllProjects, projects: initialProjects });
  const [permissions, setPermissions] = useState<Permission[]>(initialPermissions);
  const [allProjects, setAllProjects] = useState(initialAllProjects);
  const [selected, setSelected] = useState<ProjectOption[]>(initialProjects);
  const [submitted, setSubmitted] = useState<Access | null>(null);
  const [handled, setHandled] = useState<MemberAccessState>(state);
  // "По избор" is chosen explicitly too, so the rights open even before one of them changes.
  const [custom, setCustom] = useState(false);
  const preset = custom ? null : presetOf(permissions);
  const [open, setOpen] = useState(!preset);
  const dirty = !sameAccess({ permissions, allProjects, projects: selected }, saved);

  // What was submitted becomes the new baseline once the server confirms it.
  if (state !== handled) {
    setHandled(state);
    if (state.savedAt && submitted) setSaved(submitted);
  }

  useEffect(() => {
    if (state.savedAt) toast.success("Правата са запазени");
    if (state.error) toast.error(state.error);
  }, [state]);

  function reset() {
    setPermissions(saved.permissions);
    setAllProjects(saved.allProjects);
    setSelected(saved.projects);
    setCustom(false);
  }

  function choose(role: PresetKey | "custom") {
    if (role === "custom") {
      setCustom(true);
      setOpen(true);
      return;
    }
    setCustom(false);
    setPermissions([...PRESETS[role].permissions]);
  }

  function toggle(key: Permission, checked: boolean) {
    setPermissions((current) => checked ? [...current, key] : current.filter((item) => item !== key));
  }

  const allItems = PERMISSION_GROUPS.flatMap((group) => group.items);
  const granted = allItems.filter((item) => permissions.includes(item.key));
  const denied = allItems.filter((item) => !permissions.includes(item.key));
  const saveLabel = pending ? "Запазване…" : "Запази правата";

  return <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-6">
    <form
      id={FORM_ID}
      // Not a form action: React resets the form after one, and React Aria's checkboxes then snap back
      // to how they mounted, so a saved right showed as off and the next save would have removed it.
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted({ permissions, allProjects, projects: selected });
        const formData = new FormData(event.currentTarget);
        startTransition(() => action(formData));
      }}
      className="flex min-w-0 flex-col gap-4"
    >
      <input type="hidden" name="userId" value={userId} />
      {permissions.map((key) => <input key={key} type="hidden" name="permissions" value={key} />)}

      <Section title="Роля и обекти">
        <div className="-my-4 divide-y">
          <SettingRow label="Роля">
            <Segmented
              label="Роля"
              value={preset ?? "custom"}
              onChange={choose}
              options={[...(Object.keys(PRESETS) as PresetKey[]).map((key) => ({ value: key, label: PRESETS[key].label })), { value: "custom" as const, label: "По избор" }]}
            />
            <p className="text-sm text-muted-foreground">{preset ? PRESETS[preset].description : "Отделни права, избрани ръчно по-долу."}</p>
          </SettingRow>
          <SettingRow label="Обекти">
            <ProjectScope allProjects={allProjects} selected={selected} onAllProjectsChange={setAllProjects} onSelectedChange={setSelected} />
          </SettingRow>
        </div>
      </Section>

      <section className="overflow-hidden rounded-2xl border bg-card">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="member-permissions"
          onClick={() => setOpen(!open)}
          className="flex w-full items-center gap-3 border-b px-4 py-3 text-left hover:bg-muted/50"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Права · {permissions.length} от {PERMISSION_KEYS.length}</span>
            <span className="block text-xs text-muted-foreground">Какво може да прави в обектите, до които има достъп.</span>
          </span>
          <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary-ink">
            {open ? "Скрий" : "Промени права"}
            <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
          </span>
        </button>
        {open ? <div id="member-permissions" className="divide-y">
          {PERMISSION_GROUPS.map((group) => {
            const checkedCount = group.items.filter((item) => permissions.includes(item.key)).length;
            return <div key={group.label}>
              <div className="flex items-center justify-between bg-muted/50 px-4 py-2">
                <Checkbox
                  isSelected={checkedCount === group.items.length}
                  isIndeterminate={checkedCount > 0 && checkedCount < group.items.length}
                  onChange={(checked) => setPermissions((current) => checked ? [...new Set([...current, ...group.items.map((item) => item.key)])] : current.filter((key) => !group.items.some((item) => item.key === key)))}
                  className="font-semibold"
                >
                  {group.label}
                </Checkbox>
                <span className="text-xs text-muted-foreground tabular-nums">{checkedCount}/{group.items.length}</span>
              </div>
              <ul className="divide-y">
                {group.items.map((item) => (
                  <li key={item.key}>
                    <Checkbox isSelected={permissions.includes(item.key)} onChange={(checked) => toggle(item.key, checked)} className="w-full px-4 py-3 hover:bg-muted/50">
                      <span className="block font-medium">{item.label}</span>
                      <span className="block text-muted-foreground">{item.description}</span>
                    </Checkbox>
                  </li>
                ))}
              </ul>
            </div>;
          })}
        </div> : <dl id="member-permissions" className="flex flex-col gap-3 p-4 text-sm">
          <PermissionNames label="Може" icon={<Check className="size-3.5" />} items={granted.map((item) => item.label)} empty="Няма включени права." />
          {denied.length ? <PermissionNames label="Не може" muted icon={<Minus className="size-3.5" />} items={denied.map((item) => item.label)} /> : null}
        </dl>}
      </section>
    </form>

    <div className="flex flex-col gap-4 lg:sticky lg:top-20">
      <aside aria-label="Запазване" className="hidden flex-col gap-2 rounded-2xl border bg-card p-4 lg:flex">
        <DirtyNote dirty={dirty} />
        <Button type="submit" form={FORM_ID} size="lg" isDisabled={pending || !dirty}>{saveLabel}</Button>
        {dirty ? <Button type="button" variant="ghost" size="lg" isDisabled={pending} onPress={reset}>Отказ</Button> : null}
      </aside>
      {children}
    </div>

    {/* Phones: the save bar appears above the bottom navigation only while something changed. */}
    {dirty ? <div className="sticky bottom-20 z-20 -mx-4 flex items-center gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
      <p className="min-w-0 flex-1 text-sm text-muted-foreground">Незапазени промени</p>
      <Button type="button" variant="ghost" isDisabled={pending} onPress={reset}>Отказ</Button>
      <Button type="submit" form={FORM_ID} isDisabled={pending}>{pending ? "Запазване…" : "Запази"}</Button>
    </div> : null}
  </div>;
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className="flex flex-col gap-4 p-4">{children}</div>
    </section>
  );
}

/** Label on the left from `sm` up, stacked above the control on phones. */
function SettingRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 py-4 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-4">
      <h3 className="text-sm font-medium sm:pt-2">{label}</h3>
      <div className="flex min-w-0 flex-col gap-2">{children}</div>
    </div>
  );
}

function PermissionNames({ label, icon, items, empty, muted = false }: { label: string; icon: ReactNode; items: string[]; empty?: string; muted?: boolean }) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-muted-foreground sm:pt-1">{label}</dt>
      <dd>
        {items.length ? <ul className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <li key={item} className={cn("flex items-center gap-1 rounded-md px-2 py-1", muted ? "bg-muted text-muted-foreground" : "bg-primary/10 font-medium")}>
              {icon}{item}
            </li>
          ))}
        </ul> : <span className="text-muted-foreground">{empty}</span>}
      </dd>
    </div>
  );
}

function DirtyNote({ dirty }: { dirty: boolean }) {
  return dirty
    ? <p className="flex items-center gap-2 text-xs font-medium text-foreground"><span className="size-2 rounded-full bg-primary" aria-hidden="true" />Незапазени промени</p>
    : <p className="text-xs text-muted-foreground">Всички промени са запазени.</p>;
}
