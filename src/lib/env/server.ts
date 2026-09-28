import "server-only";

import { z } from "zod";

const serverEnvironmentSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DATABASE_MIGRATION_URL: z.string().min(1).optional(),
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(16).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).default("Pakto <notifications@example.com>"),
  SUPPORT_EMAIL: z.email().optional(),
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

let cachedEnvironment: ServerEnvironment | undefined;

export function getServerEnvironment(): ServerEnvironment {
  cachedEnvironment ??= serverEnvironmentSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_MIGRATION_URL: process.env.DATABASE_MIGRATION_URL,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || undefined,
  });

  return cachedEnvironment;
}
