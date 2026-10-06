import "server-only";

import { z } from "zod";

const serverEnvironmentSchema = z.object({
  DATABASE_URL: z.string().min(1),
  // Our Postgres (the server's Docker network, the local dev container) is reached without TLS: set "false" there.
  DATABASE_SSL: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
  CRON_SECRET: z.string().min(16).optional(),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASSWORD: z.string().min(1).optional(),
  EMAIL_DAILY_LIMIT: z.coerce.number().int().positive().default(1000),
  FILES_DIR: z.string().min(1).default(".data/files"),
  EMAIL_FROM: z.string().min(1).default("Pakto <notifications@example.com>"),
  SUPPORT_EMAIL: z.email().optional(),
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

let cachedEnvironment: ServerEnvironment | undefined;

export function getServerEnvironment(): ServerEnvironment {
  cachedEnvironment ??= serverEnvironmentSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_SSL: process.env.DATABASE_SSL || undefined,
    CRON_SECRET: process.env.CRON_SECRET,
    SMTP_HOST: process.env.SMTP_HOST || undefined,
    SMTP_PORT: process.env.SMTP_PORT || undefined,
    SMTP_USER: process.env.SMTP_USER || undefined,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD || undefined,
    EMAIL_DAILY_LIMIT: process.env.EMAIL_DAILY_LIMIT || undefined,
    FILES_DIR: process.env.FILES_DIR || undefined,
    EMAIL_FROM: process.env.EMAIL_FROM,
    SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || undefined,
  });

  return cachedEnvironment;
}
