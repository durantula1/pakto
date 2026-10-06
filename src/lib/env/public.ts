import { z } from "zod";

const publicEnvironmentSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
});

export type PublicEnvironment = z.infer<typeof publicEnvironmentSchema>;

export function getPublicEnvironment(): PublicEnvironment {
  return publicEnvironmentSchema.parse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });
}

/**
 * An absolute address on this site for redirects from route handlers. Behind Caddy in Docker, `request.url` of a
 * Next standalone server carries the container's own address (https://0.0.0.0:3000), so it must not be the base.
 */
export function appUrl(path: string) {
  return new URL(path, getPublicEnvironment().NEXT_PUBLIC_APP_URL);
}
