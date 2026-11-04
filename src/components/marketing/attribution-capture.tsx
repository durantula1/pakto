"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { syncAttribution } from "@/lib/analytics/attribution";

/** Client navigations (the head script already covered the first load) and a changed query. */
export function AttributionCapture() {
  const pathname = usePathname();
  const search = useSearchParams();
  useEffect(() => {
    syncAttribution();
  }, [pathname, search]);
  return null;
}
