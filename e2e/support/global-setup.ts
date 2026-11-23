import { execFileSync } from "node:child_process";
import path from "node:path";

/** Drops and rebuilds pakto_e2e (migrations + demo seed) in the local Postgres from docker-compose.dev.yml. */
export default function globalSetup() {
  execFileSync("bash", [path.join(__dirname, "prepare-db.sh")], { stdio: "inherit" });
}
