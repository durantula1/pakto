import { MessageCircle, Phone } from "lucide-react";

import { normalizePhone } from "@/modules/clients/operations";

/**
 * "Обадете се" and Viber with the company's phone, where the project-wide chat used to be
 * (docs/chat-narrowing-plan.md, part 3). Nothing without a phone in the company settings.
 */
export function CompanyContact({ phone, organizationName }: { phone: string | null; organizationName: string }) {
  const number = normalizePhone(phone);
  if (!number) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a href={`tel:${number}`} aria-label={`Обадете се на ${organizationName} · ${phone}`} className="inline-flex h-10 items-center gap-2 rounded-full bg-card px-4 text-sm font-medium hover:bg-muted">
        <Phone className="size-4 text-primary-ink" aria-hidden="true" /> Обадете се
      </a>
      <a href={`viber://chat?number=${encodeURIComponent(number)}`} aria-label={`Пишете на ${organizationName} във Viber`} className="inline-flex h-10 items-center gap-2 rounded-full bg-card px-4 text-sm font-medium hover:bg-muted">
        <MessageCircle className="size-4 text-[#7360f2]" aria-hidden="true" /> Пишете във Viber
      </a>
    </div>
  );
}
