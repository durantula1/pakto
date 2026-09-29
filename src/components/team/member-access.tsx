"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { ProjectScope } from "@/components/team/project-scope";
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
 * A non-owner's rights: role, permission matrix and project scope on the left, a sticky summary
 * with the save button on the right (a bar above the bottom navigation on phones), so unsaved
 * changes are always visible. `children` go under the summary and must not contain the form.
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
  const preset = presetOf(permissions);
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
  }

  function toggle(key: Permission, checked: boolean) {
    setPermissions((current) => checked ? [...current, key] : current.filter((item) => item !== key));
  }

  const roleName = preset ? PRESETS[preset].label : "По избор";
  const scopeText = allProjects ? "Всички обекти" : selected.length === 1 ? "1 обект" : `${selected.length} обекта`;
  const saveLabel = pending ? "Запазване…" : "Запази правата";

  return <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-6">
    <form
      id={FORM_ID}
      action={action}
      onSubmit={() => setSubmitted({ permissions, allProjects, projects: selected })}
      className="flex min-w-0 flex-col gap-4"
    >
      <input type="hidden" name="userId" value={userId} />
      {permissions.map((key) => <input key={key} type="hidden" name="permissions" value={key} />)}

      <Section title="Роля" description="Шаблонът попълва правата. После можеш да променяш отделни права.">
        <div role="radiogroup" aria-label="Роля" className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(PRESETS) as PresetKey[]).map((key) => (
            <RoleOption key={key} checked={preset === key} label={PRESETS[key].label} description={PRESETS[key].description} onSelect={() => setPermissions([...PRESETS[key].permissions])} />
          ))}
          <RoleOption checked={!preset} label="По избор" description="Отделни права, избрани ръчно по-долу." />
        </div>
      </Section>

      <Section title="Права" description="Какво може да прави в обектите, до които има достъп.">
        <div className="-m-4 divide-y">
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
        </div>
      </Section>

      <Section title="Обекти" description="Правата важат само за обектите, до които има достъп.">
        <ProjectScope allProjects={allProjects} selected={selected} onAllProjectsChange={setAllProjects} onSelectedChange={setSelected} />
      </Section>
    </form>

    <div className="flex flex-col gap-4 lg:sticky lg:top-20">
      <aside aria-label="Обобщение и запазване" className="flex flex-col gap-4 rounded-2xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Обобщение</h2>
        <dl className="space-y-2 text-sm">
          <SummaryRow label="Роля" value={roleName} />
          <SummaryRow label="Права" value={`${permissions.length} от ${PERMISSION_KEYS.length}`} />
          <SummaryRow label="Обекти" value={scopeText} />
        </dl>
        <div className="hidden flex-col gap-2 border-t pt-4 lg:flex">
          <DirtyNote dirty={dirty} />
          <Button type="submit" form={FORM_ID} size="lg" isDisabled={pending || !dirty}>{saveLabel}</Button>
          {dirty ? <Button type="button" variant="ghost" size="lg" isDisabled={pending} onPress={reset}>Отказ</Button> : null}
        </div>
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

/** Without `onSelect` the option only reflects state: "custom" is reached by editing single rights. */
function RoleOption({ checked, label, description, onSelect }: { checked: boolean; label: string; description: string; onSelect?: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      aria-disabled={!onSelect || undefined}
      onClick={onSelect}
      className={cn(
        "flex flex-col items-start rounded-xl border bg-card p-3 text-left transition-colors",
        onSelect ? "hover:border-primary/50" : "cursor-default",
        checked && "border-primary bg-primary/5 ring-2 ring-primary/30",
        !onSelect && !checked && "border-dashed text-muted-foreground",
      )}
    >
      <span className="font-semibold">{label}</span>
      <span className="text-sm text-muted-foreground">{description}</span>
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function DirtyNote({ dirty }: { dirty: boolean }) {
  return dirty
    ? <p className="flex items-center gap-2 text-xs font-medium text-foreground"><span className="size-2 rounded-full bg-primary" aria-hidden="true" />Незапазени промени</p>
    : <p className="text-xs text-muted-foreground">Всички промени са запазени.</p>;
}
