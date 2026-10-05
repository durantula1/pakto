import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth/server";

export const runtime = "nodejs";

/** Better Auth's own endpoints: the links in verification, reset and change-email emails land here. */
export const { GET, POST } = toNextJsHandler(auth);
