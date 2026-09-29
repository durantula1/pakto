import { redirect } from "next/navigation";

/** The client-wide chat is gone (docs/chat-narrowing-plan.md); old links and bookmarks land on the dashboard. */
export default function PortalQuestionsPage() {
  redirect("/portal");
}
