import { redirect } from "next/navigation";

/** The client-wide chat is gone; old links and bookmarks land on the dashboard. */
export default function PortalQuestionsPage() {
  redirect("/portal");
}
