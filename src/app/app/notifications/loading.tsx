import { PageHeader } from "@/components/workspace/page/page-header";
import { PageShell } from "@/components/workspace/page/page-shell";
import { NotificationsInboxSkeleton } from "./notifications-inbox";

export default function NotificationsLoading() {
  return (
    <PageShell loading>
      <PageHeader page="notifications" />
      <div className="max-w-4xl"><NotificationsInboxSkeleton /></div>
    </PageShell>
  );
}
