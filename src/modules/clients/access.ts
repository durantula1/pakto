import { can, type Permission } from "@/lib/authz/permissions";

type Subject = { role: string; allProjects: boolean; permissions: readonly Permission[] };

/**
 * Who gets the "Клиенти" section: owners, members who see every project, and whoever already sees
 * money. Everyone else meets the client inside their own projects only (docs/clients-plan.md, 7.1).
 */
export function seesClients(subject: Subject) {
  return subject.role === "owner" || subject.allProjects || can(subject, "finance.view") || can(subject, "payments.record");
}

/**
 * Editing a client changes every project of theirs, so it needs the right and sight of all projects;
 * merging and archiving stay with owners.
 */
export function managesClients(subject: Subject) {
  return subject.role === "owner" || (subject.allProjects && can(subject, "clients.manage"));
}
