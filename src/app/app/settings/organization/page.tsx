import type { Metadata } from "next";

import { VatRateField } from "@/components/change-orders/vat-rate-field";
import { ExportDataLink } from "@/components/settings/account-dialogs";
import { AutoSaveForm, AutoSaveStatus } from "@/components/settings/auto-save-form";
import { LogoUploader } from "@/components/settings/logo-uploader";
import { SettingsGroup, SettingsRow } from "@/components/settings/settings-group";
import { Input } from "@/components/ui/input";
import { requireOwner } from "@/lib/authz/project-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { updateDefaultTaxRateAction, updateOfferValidityAction, updateOrganizationAction, updateOrganizationPhoneAction } from "@/modules/organizations/actions";
import { getOrganizationSettings } from "@/modules/organizations/queries";

export const metadata: Metadata = { title: "Фирма · Настройки" };

export default async function OrganizationSettingsPage() {
  const context = await requireTenantContext();
  await requireOwner(context);
  const organization = await getOrganizationSettings(context.organizationId);
  if (!organization) return null;

  // Each row saves on its own, so a typo in one field never blocks another.
  return <>
    <SettingsGroup id="logo" title="Как те виждат клиентите" description="Промените се запазват автоматично.">
      <SettingsRow label="Име на фирмата" description="В портала, в имейлите до клиента и в PDF." htmlFor="organization-name">
        <AutoSaveForm action={updateOrganizationAction} className="flex w-full flex-wrap items-center gap-2">
          <Input id="organization-name" name="name" defaultValue={organization.name} required minLength={2} maxLength={120} className="h-9 @xl:max-w-sm" />
          <AutoSaveStatus />
        </AutoSaveForm>
      </SettingsRow>
      <SettingsRow label="Телефон на фирмата" description="По желание. Клиентите го виждат в портала като бутони „Обадете се“ и Viber." htmlFor="organization-phone">
        <AutoSaveForm action={updateOrganizationPhoneAction} className="flex w-full flex-wrap items-center gap-2">
          <Input id="organization-phone" name="phone" type="tel" defaultValue={organization.phone ?? ""} maxLength={30} autoComplete="tel" placeholder="+359 888 123 456" className="h-9 @xl:max-w-sm" />
          <AutoSaveStatus />
        </AutoSaveForm>
      </SettingsRow>
      <LogoUploader organizationName={organization.name} initialUrl={organization.logoUrl} initialDimensions={organization.logoDimensions} initialSize={organization.logoSize} />
    </SettingsGroup>

    <SettingsGroup title="Оферти по подразбиране" description="Важат за новите оферти. Всяка оферта може да ги смени.">
      <SettingsRow label="ДДС" description="„Без ДДС“ е за фирми, които не са регистрирани по ЗДДС, или за необлагаеми услуги.">
        <AutoSaveForm action={updateDefaultTaxRateAction} className="flex w-full flex-wrap items-center gap-2">
          <VatRateField compact defaultValue={organization.defaultTaxRate} className="w-full @xl:max-w-sm" />
          <AutoSaveStatus />
        </AutoSaveForm>
      </SettingsRow>
      <SettingsRow label="Валидност на офертите" description="Клиентът вижда до кога важи цената. Два дни преди края получава напомняне." htmlFor="offer-validity">
        <AutoSaveForm action={updateOfferValidityAction} className="flex w-full flex-wrap items-center gap-2">
          <div className="flex h-9 items-center overflow-hidden rounded-lg border border-input bg-transparent focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
            <input id="offer-validity" name="offerValidityDays" type="number" inputMode="numeric" min={1} max={180} defaultValue={organization.offerValidityDays} required className="h-full w-16 bg-transparent px-2.5 text-right tabular-nums outline-none" />
            <span className="px-2.5 text-muted-foreground">дни</span>
          </div>
          <AutoSaveStatus />
        </AutoSaveForm>
      </SettingsRow>
    </SettingsGroup>

    <SettingsGroup title="Данни">
      <SettingsRow label="Изтегли данните на фирмата" description="Обекти, контакти, оферти с версиите им, решения, етапи и плащания в един JSON файл." align="end">
        <ExportDataLink href="/api/organization/export" label="Изтегли JSON" fileLabel="Данните на фирмата · JSON" />
      </SettingsRow>
    </SettingsGroup>
  </>;
}
