import type { Metadata } from "next";

import { VatRateField } from "@/components/change-orders/vat-rate-field";
import { ExportDataLink } from "@/components/settings/account-dialogs";
import { AutoSaveForm, AutoSaveStatus } from "@/components/settings/auto-save-form";
import { AutoSaveSelect } from "@/components/settings/auto-save-select";
import { LogoUploader } from "@/components/settings/logo-uploader";
import { SettingsGroup, SettingsRow } from "@/components/settings/settings-group";
import { Input } from "@/components/ui/input";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DetailTabs } from "@/components/workspace/detail-tabs";
import { requireOwner } from "@/lib/authz/project-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { updateDefaultTaxRateAction, updateClientRemindersAction, updateOfferValidityAction, updateOrganizationAction, updateOrganizationPhoneAction, updateStageWarningAction } from "@/modules/organizations/actions";
import { stageWarningChoices } from "@/modules/work/labels";
import { getOrganizationSettings } from "@/modules/organizations/queries";
import { orForbidden } from "@/lib/authz/page-access";

const tabs = ["company", "offers", "deadlines", "data"] as const;

export const metadata: Metadata = { title: "Фирма · Настройки" };

export default async function OrganizationSettingsPage({ searchParams }: PageProps<"/app/settings/organization">) {
  const [context, query] = await Promise.all([requireTenantContext(), searchParams]);
  const tab = tabs.find((item) => item === query.tab) ?? "company";
  await orForbidden(requireOwner(context));
  const organization = await getOrganizationSettings(context.organizationId);
  if (!organization) return null;

  // Each row saves on its own, so a typo in one field never blocks another.
  return <>
    <DetailTabs defaultTab={tab}>
      <TabsList>
        <TabsTrigger id="company">Фирмен профил</TabsTrigger>
        <TabsTrigger id="offers">Оферти</TabsTrigger>
        <TabsTrigger id="deadlines">Срокове и писма</TabsTrigger>
        <TabsTrigger id="data">Данни</TabsTrigger>
      </TabsList>
      <TabsContent id="company" className="flex flex-col gap-7 pt-4">
        <SettingsGroup id="logo" title="Как те виждат клиентите" description="Промените се запазват автоматично.">
          <SettingsRow label="Име на фирмата" description="В портала, в имейлите до клиента и в PDF." htmlFor="organization-name">
            <AutoSaveForm action={updateOrganizationAction} className="flex w-full flex-wrap items-center gap-2">
              <Input id="organization-name" name="name" defaultValue={organization.name} required minLength={2} maxLength={120} className="h-9 @xl:max-w-sm" />
              <AutoSaveStatus />
            </AutoSaveForm>
          </SettingsRow>
          <SettingsRow label="Телефон на фирмата" description="По желание. Клиентите ще виждат в портала бутони „Обадете се“ и Viber." htmlFor="organization-phone">
            <AutoSaveForm action={updateOrganizationPhoneAction} className="flex w-full flex-wrap items-center gap-2">
              <Input id="organization-phone" name="phone" type="tel" defaultValue={organization.phone ?? ""} maxLength={30} autoComplete="tel" placeholder="+359 888 123 456" className="h-9 @xl:max-w-sm" />
              <AutoSaveStatus />
            </AutoSaveForm>
          </SettingsRow>
          <LogoUploader organizationName={organization.name} initialUrl={organization.logoUrl} initialDimensions={organization.logoDimensions} initialSize={organization.logoSize} />
        </SettingsGroup>
      </TabsContent>
      <TabsContent id="offers" className="flex flex-col gap-7 pt-4">
        <SettingsGroup title="Оферти по подразбиране" description="Важат за новите оферти. Всяка оферта може да ги смени.">
          <SettingsRow label="ДДС" description="„Без ДДС“ е за фирми, които не са регистрирани по ЗДДС, или за необлагаеми услуги.">
            <AutoSaveForm action={updateDefaultTaxRateAction} className="flex w-full flex-wrap items-center gap-2">
              <VatRateField compact defaultValue={organization.defaultTaxRate} className="w-full @xl:max-w-sm" />
              <AutoSaveStatus />
            </AutoSaveForm>
          </SettingsRow>
          <SettingsRow label="Валидност на офертите" description="Клиентът вижда до кога важи цената. След края офертата изтича." htmlFor="offer-validity">
            <AutoSaveForm action={updateOfferValidityAction} className="flex w-full flex-wrap items-center gap-2">
              <div className="flex h-9 items-center overflow-hidden rounded-lg border border-input bg-transparent focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
                <input id="offer-validity" name="offerValidityDays" type="text" inputMode="numeric" maxLength={3} defaultValue={organization.offerValidityDays} required className="h-full w-16 bg-transparent px-2.5 text-right tabular-nums outline-none" />
                <span className="px-2.5 text-muted-foreground">дни</span>
              </div>
              <AutoSaveStatus />
            </AutoSaveForm>
          </SettingsRow>
        </SettingsGroup>
      </TabsContent>
      <TabsContent id="deadlines" className="flex flex-col gap-7 pt-4">
        <SettingsGroup title="Срокове и етапи" description="Важи за работния преглед и списъка с етапи на целия екип.">
          <SettingsRow label="Кога един етап „наближава“" description="Етапи със срок в този период се показват като наближаващи. Просрочените се показват винаги.">
            <AutoSaveForm action={updateStageWarningAction} className="flex w-full flex-wrap items-center gap-2">
              <AutoSaveSelect label="Кога един етап „наближава“" name="days" value={String(organization.stageWarningDays)} options={stageWarningChoices.map((value) => ({ value: String(value), label: value === 1 ? "1 ден преди срока" : `${value} дни преди срока` }))} />
              <AutoSaveStatus />
            </AutoSaveForm>
          </SettingsRow>
        </SettingsGroup>

        <SettingsGroup title="Автоматични писма към клиента" description="Пращат се сутрин, само по активни обекти. Ръчното „Напомни на клиента“ винаги е налично.">
          <AutoSaveForm action={updateClientRemindersAction} className="flex w-full flex-col">
            <SettingsRow label="Напомняне, ако няма отговор" description="Клиентът получава едно учтиво писмо, ако не е отговорил на офертата до избрания ден.">
              <AutoSaveSelect label="Напомняне, ако няма отговор" name="nudge" value={String(organization.clientNudgeAfterDays)} options={[[0, "Изключено"], [1, "След 1 ден"], [2, "След 2 дни"], [3, "След 3 дни"], [5, "След 5 дни"], [7, "След 7 дни"], [10, "След 10 дни"], [14, "След 14 дни"]].map(([value, label]) => ({ value: String(value), label: String(label) }))} />
            </SettingsRow>
            <SettingsRow label="Предупреждение преди изтичане" description="Едно писмо преди да изтече срокът на офертата.">
              <AutoSaveSelect label="Предупреждение преди изтичане" name="warning" value={String(organization.clientExpiryWarningDays)} options={[[0, "Изключено"], [1, "1 ден преди"], [2, "2 дни преди"], [3, "3 дни преди"], [5, "5 дни преди"], [7, "7 дни преди"]].map(([value, label]) => ({ value: String(value), label: String(label) }))} />
            </SettingsRow>
            <SettingsRow label="Писмо за промени в графика" description="Едно писмо на ден, когато етапите се променят.">
              <AutoSaveSelect label="Писмо за промени в графика" name="digest" value={organization.clientScheduleDigestEnabled ? "on" : "off"} options={[{ value: "on", label: "Включено" }, { value: "off", label: "Изключено" }]} />
              <AutoSaveStatus />
            </SettingsRow>
          </AutoSaveForm>
        </SettingsGroup>
      </TabsContent>
      <TabsContent id="data" className="flex flex-col gap-7 pt-4">
        <SettingsGroup title="Данни">
          <SettingsRow label="Изтегли данните на фирмата" description="Обекти, контакти, оферти с версиите им, решения, етапи и плащания в един JSON файл." align="end">
            <ExportDataLink href="/api/organization/export" label="Изтегли данните (JSON)" fileLabel="Данните на фирмата · JSON" />
          </SettingsRow>
        </SettingsGroup>
      </TabsContent>
    </DetailTabs>
  </>;
}
