import { redirect } from "next/navigation";

/** "Нов обект" is the side panel on the projects list; this address stays for old links and bookmarks. */
export default function NewProjectPage() {
  redirect("/app/projects?new=1");
}
