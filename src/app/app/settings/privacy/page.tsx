import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck, CircleAlert, ExternalLink } from "lucide-react";

import { DeleteAccountDialog, ExportDataLink, LeaveOrganizationDialog } from "@/components/settings/account-dialogs";
import { SettingsGroup, SettingsRow } from "@/components/settings/settings-group";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { userHasPassword } from "@/lib/auth/server";
import { ACCOUNT_DELETION_GRACE_DAYS, LEGAL_DOCUMENTS, type LegalDocument } from "@/lib/legal";
import { acceptLegalDocumentsAction } from "@/modules/account/actions";
import { getAccountDeletionPlan, getLeaveBlocker, listUserConsents } from "@/modules/account/queries";

const dateFormat = new Intl.DateTimeFormat("bg-BG", { dateStyle: "medium", timeZone: "Europe/Sofia" });

export const metadata: Metadata = { title: "Данни и профил · Настройки" };

export default async function PrivacySettingsPage() {
  const context = await requireTenantContext();
  const [consents, deletionPlan, leaveBlocker, hasPassword] = await Promise.all([
    listUserConsents(context.userId), getAccountDeletionPlan(context.userId), getLeaveBlocker(context.userId), userHasPassword(context.userId),
  ]);
  const closesCompany = deletionPlan.kind === "account_and_company";
  const documents = (Object.keys(LEGAL_DOCUMENTS) as LegalDocument[]).map((key) => ({
    key,
    ...LEGAL_DOCUMENTS[key],
    accepted: consents.find((consent) => consent.document === key && consent.version === LEGAL_DOCUMENTS[key].version),
  }));
  const missingConsent = documents.some((document) => !document.accepted);

  return <>
    <SettingsGroup title="Твоите данни">
      <SettingsRow
        label="Изтегли данните си"
        description="Профил, членства, достъп до обекти, известия и действия в един JSON файл. Обектите и офертите са на фирмата и ги изтегля собственикът."
        align="end"
      >
        <ExportDataLink label="Изтегли JSON" />
      </SettingsRow>
    </SettingsGroup>

    <SettingsGroup
      title="Условия и поверителност"
      action={missingConsent ? (
        <ActionForm action={acceptLegalDocumentsAction} success="Записахме съгласието ти">
          <ActionSubmit variant="outline" className="h-8">Приемам текущите версии</ActionSubmit>
        </ActionForm>
      ) : null}
    >
      {documents.map((document) => (
        <SettingsRow
          key={document.key}
          label={<Link href={document.href} target="_blank" className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline">{document.label}<ExternalLink className="size-3.5 text-muted-foreground" /></Link>}
          align="end"
        >
          {document.accepted ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><CircleCheck className="size-4 rounded-full bg-brand-green text-[#102b38]" />Версия {document.version} · приета {dateFormat.format(document.accepted.acceptedAt)}</span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400"><CircleAlert className="size-4" />Новата версия {document.version} не е приета</span>
          )}
        </SettingsRow>
      ))}
    </SettingsGroup>

    <SettingsGroup title="Напускане и изтриване" danger>
      <SettingsRow label={`Напусни „${context.organizationName}“`} description="Губиш достъп до фирмата, но профилът ти остава." align="end">
        <LeaveOrganizationDialog organizationName={context.organizationName} blocker={leaveBlocker} />
      </SettingsRow>
      <SettingsRow
        label={closesCompany ? "Изтрий профила и фирмата" : "Изтрий профила"}
        description={closesCompany
          ? `Ти си единственият член, затова фирмата се закрива с профила. Имаш ${ACCOUNT_DELETION_GRACE_DAYS} дни да се откажеш.`
          : `Офертите ти остават във фирмата. Имаш ${ACCOUNT_DELETION_GRACE_DAYS} дни да се откажеш.`}
        align="end"
      >
        <DeleteAccountDialog plan={deletionPlan} graceDays={ACCOUNT_DELETION_GRACE_DAYS} hasPassword={hasPassword} />
      </SettingsRow>
    </SettingsGroup>
  </>;
}
