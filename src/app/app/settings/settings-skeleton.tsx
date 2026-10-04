import { Skeleton } from "@/components/ui/skeleton";
import { TabsSkeleton } from "@/components/ui/tabs";

/** `text` is a value with a button next to it (email, password); `status` is a value alone. */
type Control = "input" | "button" | "switch" | "segmented" | "logo" | "text" | "status" | "short";

const controlClass: Record<Control, string> = {
  input: "h-9 w-full @xl:max-w-sm",
  button: "h-9 w-24",
  switch: "h-6 w-10 rounded-full",
  segmented: "h-9 w-full @xl:max-w-sm",
  logo: "h-44 w-full rounded-xl @xl:max-w-md",
  text: "h-4 w-40",
  status: "h-4 w-44",
  short: "h-9 w-28",
};

/** Same frame as SettingsGroup: title above, one card of rows. */
function GroupSkeleton({ rows, description = true, action = false }: { rows: Control[]; description?: boolean; action?: boolean }) {
  return (
    <div className="grid gap-2">
      <div className="flex min-h-7 items-end justify-between gap-3 px-1">
        <div className="grid gap-1.5">
          <Skeleton className="h-4 w-32" />
          {description ? <Skeleton className="h-3 w-64 max-w-full" /> : null}
        </div>
        {action ? <Skeleton className="h-7 w-28" /> : null}
      </div>
      <div className="@container divide-y overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        {rows.map((control, index) => <RowSkeleton key={index} control={control} />)}
      </div>
    </div>
  );
}

/** Same grid as SettingsRow; a switch row is the one-line label-and-toggle of the notifications page. */
function RowSkeleton({ control }: { control: Control }) {
  if (control === "switch") {
    return (
      <div className="flex min-h-12 items-center justify-between gap-4 px-4 py-2.5 sm:px-5">
        <Skeleton className="h-4 w-48 max-w-[70%]" />
        <Skeleton className={controlClass.switch} />
      </div>
    );
  }
  const end = control !== "input" && control !== "segmented" && control !== "short";
  return (
    <div className="grid gap-2.5 px-4 py-3.5 sm:px-5 @xl:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] @xl:items-center @xl:gap-8">
      <div className="grid gap-1.5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-44 max-w-full" />
      </div>
      <div className={end ? "flex gap-2 @xl:justify-end" : "flex"}>
        <Skeleton className={controlClass[control]} />
        {control === "text" ? <Skeleton className="h-9 w-20" /> : null}
      </div>
    </div>
  );
}

function Loading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-7" aria-busy>
      {children}
      <span role="status" className="sr-only">Зареждане…</span>
    </div>
  );
}

export function ProfileSettingsSkeleton() {
  return (
    <Loading>
      <div className="flex items-center gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
        <Skeleton className="size-14 rounded-2xl" />
        <div className="grid gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-52" />
          <div className="flex gap-1.5"><Skeleton className="h-5 w-20 rounded-full" /><Skeleton className="h-5 w-28 rounded-full" /></div>
        </div>
      </div>
      <GroupSkeleton rows={["input", "input"]} />
      <GroupSkeleton rows={["text", "text", "button"]} description={false} />
    </Loading>
  );
}

export function NotificationSettingsSkeleton() {
  return (
    <Loading>
      <Skeleton className="h-12 w-full rounded-xl" />
      <GroupSkeleton rows={["switch", "switch", "switch", "switch"]} action />
      <GroupSkeleton rows={["switch", "switch"]} action />
      <GroupSkeleton rows={["switch", "switch"]} action />
    </Loading>
  );
}

export function PrivacySettingsSkeleton() {
  return (
    <Loading>
      <GroupSkeleton rows={["button"]} description={false} />
      <GroupSkeleton rows={["status", "status"]} description={false} />
      <GroupSkeleton rows={["button", "button"]} description={false} />
    </Loading>
  );
}

export function OrganizationSettingsSkeleton() {
  return (
    <Loading>
      <div className="flex flex-col gap-2">
        <TabsSkeleton labels={["Фирмен профил", "Оферти", "Срокове и писма", "Данни"]} />
        <div className="flex flex-col gap-7 pt-4">
          <GroupSkeleton rows={["input", "input", "logo"]} />
        </div>
      </div>
    </Loading>
  );
}
