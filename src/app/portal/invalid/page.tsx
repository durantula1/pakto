import { RequestLinksForm } from "@/components/portal/request-links-form";
import { Card, CardContent } from "@/components/ui/card";

export default function InvalidPortalPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20">
      <Card>
        <CardContent className="flex flex-col gap-6 py-10 text-center">
          <div>
            <h1 className="text-2xl font-semibold">Линкът не е активен</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Възможно е да е изтекъл или отнет. Не е показана информация за обекта.
            </p>
          </div>
          <RequestLinksForm />
          <p className="text-sm text-muted-foreground">Ако не сте потвърждавали имейла си, поискайте нов линк от фирмата.</p>
        </CardContent>
      </Card>
    </div>
  );
}
