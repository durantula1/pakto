import { execFileSync } from "node:child_process";
import path from "node:path";

/** Drops and rebuilds pakto_e2e (migrations + demo seed) in the local Postgres from docker-compose.dev.yml. */
export default function globalSetup() {
  execFileSync("bash", [path.join(process.cwd(), "e2e/support", process.env.E2E_PG_ADMIN ? "prepare-db-local.sh" : "prepare-db.sh")], { stdio: "inherit" });
}
