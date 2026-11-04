"use client";

import { useEffect } from "react";

import { trackSignUp } from "@/lib/analytics/google-ads";
import { markSignupConversionReportedAction } from "@/modules/analytics/actions";

const started = new Set<string>();

/**
 * Fires once the server has a real new account. The page does not navigate away, and the tag is
 * already on it (or loaded here, on /welcome), so the ping is not cancelled by a redirect.
 */
export function SignupConversion({ userId }: { userId: string }) {
  useEffect(() => {
    if (started.has(userId)) return;
    started.add(userId);
    void trackSignUp(userId).then((sent) => {
      if (sent) void markSignupConversionReportedAction();
    });
  }, [userId]);
  return null;
}
