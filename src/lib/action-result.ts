import "server-only";

import { unstable_rethrow } from "next/navigation";
import { z } from "zod";

import "@/lib/zod-messages";

export type ActionResult = { error?: string };

/**
 * Runs a Server Action body and returns an expected failure as `{ error }` instead of throwing:
 * production builds hide thrown messages, so the form would only show a generic error.
 * Redirects and other Next.js control flow still propagate.
 */
export async function attempt(run: () => Promise<unknown>, fallback: string): Promise<ActionResult> {
  try {
    await run();
    return {};
  } catch (cause) {
    unstable_rethrow(cause);
    // A form-validation failure shows the first rule's own message, not zod's JSON dump.
    if (cause instanceof z.ZodError) return { error: cause.issues[0]?.message ?? fallback };
    return { error: cause instanceof Error ? cause.message : fallback };
  }
}
