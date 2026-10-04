/**
 * Wraps a Server Action used with `useActionState` so a dropped connection becomes a message in the
 * form instead of an error page that throws the typed input away. Redirects and not-found signals
 * pass through untouched.
 */
export function offlineSafe<State extends { error?: string }>(action: (previous: State, formData: FormData) => Promise<State>) {
  return async (previous: State, formData: FormData): Promise<State> => {
    try {
      return await action(previous, formData);
    } catch (cause) {
      const digest = typeof cause === "object" && cause && "digest" in cause ? String((cause as { digest: unknown }).digest) : "";
      if (digest.startsWith("NEXT_")) throw cause;
      return { ...previous, error: "Няма връзка. Опитайте отново." };
    }
  };
}
