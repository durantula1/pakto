import { FormSkeleton } from "@/components/workspace/page/form-skeleton";
import { PageHeader } from "@/components/workspace/page/page-header";
import { PageShell } from "@/components/workspace/page/page-shell";

export default function NewProjectLoading() {
  return (
    <PageShell width="narrow" loading>
      <PageHeader page="newProject" back={{ label: "Проекти" }} />
      <FormSkeleton title="Основна информация" fields={8} />
    </PageShell>
  );
}
