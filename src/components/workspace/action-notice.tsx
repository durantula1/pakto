"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const messages: Record<string, string> = {
  "invite-created": "Поканата е създадена",
  "project-created": "Обектът е създаден",
  "offer-created": "Офертата е създадена",
  "change-created": "Промяната е създадена",
  "revision-saved": "Новата версия е запазена",
  "draft-saved": "Черновата е запазена",
  sent: "Изпратено. Клиентът получи имейл с линка.",
};

/** Something the user has to act on; shown as a lasting warning instead of a success toast. */
const warnings: Record<string, string> = {
  "sent-no-email": "Изпратено, но клиентът няма имейл. Копирай защитения линк и му го прати сам.",
  "sent-email-failed": "Изпратено, но имейлът до клиента не тръгна. Копирай защитения линк и му го прати сам.",
  "revision-saved-not-sent": "Новата версия е запазена, но не беше изпратена. Изпрати я от бутона „Изпрати на клиента“.",
};

export function ActionNotice() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const notice = searchParams.get("notice");
  useEffect(() => {
    if (!notice || !(messages[notice] || warnings[notice])) return;
    if (warnings[notice]) toast.warning(warnings[notice], { duration: 15000 });
    else toast.success(messages[notice]);
    const url = new URL(window.location.href);
    url.searchParams.delete("notice");
    window.history.replaceState(window.history.state, "", url.toString());
  }, [pathname, notice]);
  return null;
}
