import type { Metadata } from "next";
import Link from "next/link";

import {
  LegalDocument,
  type LegalSection,
} from "@/components/marketing/legal-document";
import { LEGAL_DOCUMENTS } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Условия за ползване",
  description:
    "Условията, при които фирмите ползват Pakto: профил, данни на фирмата, одобрения и отговорност.",
  alternates: { canonical: "/terms" },
};

// TODO(legal): fill in the provider details in brackets and have a lawyer review before public launch.
const sections: LegalSection[] = [
  {
    id: "provider",
    title: "Кой предоставя Pakto",
    body: (
      <>
        <p>Pakto се предоставя от [име на дружеството], ЕИК [ЕИК].</p>
        <p>
          Докато тече бетата, ползването е безплатно и услугата може да се
          променя. Преди края на бетата ще те уведомим поне 30 дни по-рано.
        </p>
      </>
    ),
  },
  {
    id: "account",
    title: "Профил",
    body: (
      <ul>
        <li>Пазиш паролата си и отговаряш за действията от профила си.</li>
        <li>Собственикът на фирмата решава кой има достъп и до какво.</li>
        <li>
          Можеш да изтриеш профила си по всяко време от{" "}
          <b>Настройки → Данни и акаунт</b>.
        </li>
      </ul>
    ),
  },
  {
    id: "company-data",
    title: "Данни на фирмата",
    body: (
      <p>
        Обектите, клиентите, офертите, промените и плащанията са на фирмата.
        Фирмата отговаря данните на клиентите ѝ да се обработват законно. Как
        обработваме личните данни е описано в{" "}
        <Link href={LEGAL_DOCUMENTS.privacy.href}>
          Политиката за поверителност
        </Link>
        .
      </p>
    ),
  },
  {
    id: "approvals",
    title: "Одобрения",
    body: (
      <p>
        Одобрението в портала е електронно изявление: клиентът изписва името си
        и го потвърждава с еднократен код от имейла си, а Pakto записва
        версията, часа и отпечатъка ѝ. То не е квалифициран електронен подпис.
      </p>
    ),
  },
  {
    id: "liability",
    title: "Отговорност",
    body: (
      <p>
        [Ограничение на отговорността, приложимо право и начин за разрешаване на
        спорове.]
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalDocument
      document="terms"
      title={
        <>
          Условия за
          <br />
          <i>ползване.</i>
        </>
      }
      lead="Условията, при които фирмата ти ползва Pakto, а клиентите ѝ одобряват оферти и промени."
      summary={[
        "Докато е бета, Pakto е безплатен. Преди края ѝ ще те уведомим поне 30 дни по-рано.",
        "Данните на фирмата са на фирмата. Собственикът може да ги изтегли по всяко време.",
        "Одобрението с код от имейла е записано електронно изявление, не квалифициран подпис.",
      ]}
      sections={sections}
    />
  );
}
