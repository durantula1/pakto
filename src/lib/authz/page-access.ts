import "server-only";

import { forbidden, notFound, unstable_rethrow } from "next/navigation";

/**
 * For pages: runs an access check and turns its failure into the "no access" page (or "not found"
 * when the object does not exist), instead of a thrown error that the error boundary shows as
 * "something went wrong". Server Actions keep the plain throw and report `{ error }` through `attempt()`.
 */
export async function orForbidden<T>(check: Promise<T>): Promise<T> {
  try {
    return await check;
  } catch (cause) {
    unstable_rethrow(cause);
    if (cause instanceof Error && /не е намерен/.test(cause.message)) notFound();
    forbidden();
  }
}
