import { NextResponse } from "next/server";

import { readFile } from "@/lib/storage";
import { LOGO_BUCKET } from "@/modules/organizations/logo";

export const runtime = "nodejs";

/**
 * Company logos are public: they appear on client pages without a session. The file name is the PNG's hash, so a new logo gets a new URL and this one can be cached for good.
 */
export async function GET(_request: Request, { params }: RouteContext<"/api/logos/[...path]">) {
  const { path } = await params;
  const key = path.join("/");
  if (!key.endsWith(".png")) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const bytes = await readFile(LOGO_BUCKET, key).catch(() => null);
  if (!bytes) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
