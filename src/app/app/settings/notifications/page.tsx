import type { Metadata } from "next";

import { AutoSaveForm, AutoSaveStatus, SettingsSwitch } from "@/components/settings/auto-save-form";
import { SettingsGroup } from "@/components/settings/settings-group";
import { SwitchGroupToggle } from "@/components/settings/switch-group-toggle";
import { can } from "@/lib/authz/permissions";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { emailEventGroups } from "@/modules/notifications/events";
import { updateNotificationPreferencesAction } from "@/modules/notifications/preference-actions";
import { getEmailPreferences } from "@/modules/notifications/preferences";

export const metadata: Metadata = { title: "Известия · Настройки" };

export default async function NotificationSettingsPage() {
  const context = await requireTenantContext();
  const seesPayments = can(context, "payments.record") || can(context, "finance.view");
  // Someone who cannot see payments is not offered emails about them.
  const preferences = (await getEmailPreferences(context.userId, context.organizationId)).filter((preference) => seesPayments || !preference.eventType.startsWith("payment_"));
  const groups = (Object.keys(emailEventGroups) as (keyof typeof emailEventGroups)[])
    .map((key) => ({ key, ...emailEventGroups[key], items: preferences.filter((preference) => preference.group === key) }));

  // One form: the action saves every event at once, and an unchecked switch means "only in the app".
  return (
    <AutoSaveForm action={updateNotificationPreferencesAction} className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
        <p>В приложението получаваш всичко. Тук избираш кое да идва и на имейла, за да не пропуснеш нещо, докато си на обекта.</p>
        <AutoSaveStatus />
      </div>
      {groups.map((group) => (
        <SettingsGroup key={group.key} title={group.title} description={group.description} action={<SwitchGroupToggle names={group.items.map((item) => item.eventType)} />}>
          {group.items.map((preference) => (
            <label key={preference.eventType} className="flex min-h-12 cursor-pointer items-center justify-between gap-4 px-4 py-2.5 transition-colors hover:bg-muted/40 sm:px-5">
              <span>{preference.label}</span>
              <SettingsSwitch name={preference.eventType} defaultChecked={preference.email} />
            </label>
          ))}
        </SettingsGroup>
      ))}
    </AutoSaveForm>
  );
}
