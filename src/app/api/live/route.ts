import { getSessionUserId } from "@/lib/authz/tenant-context";
import { subscribeStaff } from "@/lib/live/hub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 25_000;

/**
 * Server-sent events for the signed-in staff member: one `refresh` event per new notification
 * (LiveNotifications refreshes the page and shows a toast for permission changes).
 */
export async function GET(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return new Response(null, { status: 401 });

  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (text: string) => {
        try { controller.enqueue(encoder.encode(text)); } catch { cleanup(); }
      };
      // The browser reconnects on its own; 5 s keeps a server restart from leaving tabs stale for long.
      send("retry: 5000\n\n");
      const unsubscribe = await subscribeStaff(userId, (event) => send(`event: refresh\ndata: ${JSON.stringify(event)}\n\n`))
        .catch(() => null);
      if (!unsubscribe) {
        controller.close();
        return;
      }
      // Comment lines keep proxies from closing an idle connection.
      const heartbeat = setInterval(() => send(": ping\n\n"), HEARTBEAT_MS);
      cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
        cleanup = () => {};
        try { controller.close(); } catch { /* already closed */ }
      };
      request.signal.addEventListener("abort", () => cleanup(), { once: true });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
