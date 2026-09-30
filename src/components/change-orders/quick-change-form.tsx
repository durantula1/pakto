"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { StagedAttachments, useUploadStagedFiles } from "@/components/change-orders/staged-attachments";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Stepper } from "@/components/change-orders/stepper";
import { VatRateField } from "@/components/change-orders/vat-rate-field";
import {
  ProjectCombobox,
  type ProjectOption,
} from "@/components/workspace/project-combobox";
import {
  createChangeOrderAction,
  type QuickChangeState,
} from "@/modules/change-orders/actions";
import { getProjectOfferOptionsAction } from "@/modules/change-orders/offer-options-actions";
import { useKeepFormValues } from "@/lib/use-keep-form-values";

type OfferOption = {
  id: string;
  projectId: string;
  sequenceNumber: number;
  title: string | null;
};

const scheduleOptions = [
  ["none", "Без промяна"],
  ["days", "Нов краен срок"],
] as const;

export function QuickChangeForm({
  defaultProject,
  defaultOffers,
  defaultOfferId,
  draftKey,
  defaultTaxRate,
}: {
  defaultProject?: ProjectOption | null;
  defaultOffers: OfferOption[];
  /** The offer the change is for, when opened from it (`?offerId=`). */
  defaultOfferId?: string;
  /** Raw `?projectId=` from the URL; scopes the localStorage draft. */
  draftKey?: string;
  defaultTaxRate: string;
}) {
  const [state, action, pending] = useActionState<QuickChangeState, FormData>(
    createChangeOrderAction,
    {},
  );
  const keepRef = useKeepFormValues(state);
  const [files, setFiles] = useState<File[]>([]);
  const uploadProgress = useUploadStagedFiles(state.createdId, files, "change-created");
  const storageKey = `sitechange:draft:v2:${draftKey ?? "new"}`;
  const [project, setProject] = useState<ProjectOption | null>(
    defaultProject ?? null,
  );
  const projectId = project?.id ?? "";
  const defaultProjectId = defaultProject?.id;
  // Remounts the uncontrolled project picker when a draft restores a different project.
  const [pickerKey, setPickerKey] = useState(0);
  const [offers, setOffers] = useState<OfferOption[]>(defaultOffers);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const offersRequest = useRef(0);
  const [scheduleType, setScheduleType] = useState("none");
  const [showMore, setShowMore] = useState(false);
  const visibleOffers = loadingOffers
    ? []
    : offers.filter((offer) => offer.projectId === projectId);

  function loadProject(id: string, fromDraft = false) {
    const current = ++offersRequest.current;
    setLoadingOffers(true);
    getProjectOfferOptionsAction(id)
      .then((result) => {
        if (current !== offersRequest.current) return;
        if (fromDraft) {
          // A restored project that is no longer visible is simply dropped.
          if (!result) return;
          setProject(result.project);
          setPickerKey((key) => key + 1);
        }
        setOffers(result?.offers ?? []);
      })
      .catch(() => {
        if (current === offersRequest.current) setOffers([]);
      })
      .finally(() => {
        if (current === offersRequest.current) setLoadingOffers(false);
      });
  }

  function selectProject(next: ProjectOption | null) {
    setProject(next);
    if (next) {
      loadProject(next.id);
    } else {
      offersRequest.current++;
      setOffers([]);
      setLoadingOffers(false);
    }
  }
  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state.error]);

  const restored = useRef(false);
  const persistReady = useRef(false);

  useEffect(() => {
    const form = document.querySelector<HTMLFormElement>("#quick-change-form");
    if (!form) return;
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const values = JSON.parse(saved) as Record<string, string>;
        for (const [name, value] of Object.entries(values)) {
          // The project is restored through state below so its name and offers load too.
          if (name === "projectId") continue;
          const field = form.elements.namedItem(name);
          if (
            field instanceof HTMLInputElement ||
            field instanceof HTMLTextAreaElement
          ) {
            field.value = value;
          }
        }
        window.requestAnimationFrame(() => {
          if (values.projectId && values.projectId !== defaultProjectId) {
            loadProject(values.projectId, true);
          }
          if (values.scheduleImpactType) setScheduleType(values.scheduleImpactType);
        });
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }
    restored.current = true;
    const persist = () => {
      const data = new FormData(form);
      window.localStorage.setItem(
        storageKey,
        JSON.stringify(Object.fromEntries(data.entries())),
      );
    };
    form.addEventListener("input", persist);
    return () => form.removeEventListener("input", persist);
  }, [storageKey, defaultProjectId]);

  useEffect(() => {
    if (!persistReady.current) {
      persistReady.current = true;
      return;
    }
    if (!restored.current) return;
    const form = document.querySelector<HTMLFormElement>("#quick-change-form");
    if (!form) return;
    const data = new FormData(form);
    window.localStorage.setItem(
      storageKey,
      JSON.stringify(Object.fromEntries(data.entries())),
    );
  }, [projectId, scheduleType, storageKey]);

  return (
    <form noValidate ref={keepRef} id="quick-change-form" action={action} className="space-y-7">
      <input type="hidden" name="scheduleImpactType" value={scheduleType} />
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="projectId" className="mb-2 block text-sm font-medium">
            Обект
          </label>
          <ProjectCombobox
            key={pickerKey}
            id="projectId"
            name="projectId"
            defaultValue={project}
            placeholder="Избери обект"
            isRequired
            activeOnly
            inputClassName="h-12 text-base"
            onChange={selectProject}
          />
        </div>
        <div>
          <label
            htmlFor="baselineOfferId"
            className="mb-2 block text-sm font-medium"
          >
            Одобрена оферта
          </label>
          <Select
            key={`${projectId}-${visibleOffers.length}`}
            name="baselineOfferId"
            placeholder={
              !projectId
                ? "Първо избери обект"
                : loadingOffers
                  ? "Зареждане…"
                  : "Избери оферта"
            }
            isRequired
            isDisabled={!visibleOffers.length}
            // Preselected when opened from an offer, or when the project has just one.
            defaultSelectedKey={visibleOffers.find((offer) => offer.id === defaultOfferId)?.id ?? (visibleOffers.length === 1 ? visibleOffers[0]!.id : undefined)}
            className="w-full"
          >
            <SelectTrigger id="baselineOfferId" className="h-12 text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {visibleOffers.map((offer) => (
                <SelectItem key={offer.id} id={offer.id}>
                  ОФ-{String(offer.sequenceNumber).padStart(3, "0")} ·{" "}
                  {offer.title ?? "Оферта"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {projectId && !loadingOffers && !visibleOffers.length ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Няма одобрена оферта за този обект.
            </p>
          ) : null}
        </div>
      </div>

      <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
        <p className="font-semibold">Какво се променя</p>
        <p className="text-sm text-muted-foreground">
          Опиши разликата спрямо одобрената оферта.
        </p>
        <Input
          name="title"
          placeholder="Кратко заглавие"
          required
          className="mt-4 h-12 text-base"
        />
        <Textarea
          name="description"
          placeholder="Какво се променя спрямо офертата."
          required
          className="mt-3 min-h-32 text-base"
        />
      </section>

      <section className="grid gap-5 rounded-2xl border bg-card p-4 shadow-sm sm:grid-cols-2 sm:p-6">
        <div>
          <label htmlFor="subtotal" className="mb-2 block text-sm font-medium">
            Цена без ДДС
          </label>
          <Stepper
            name="subtotal"
            label="Цена без ДДС"
            defaultValue="0"
            min={0}
            max={999999999}
            step={1}
            suffix="EUR"
            required
          />
        </div>
        <div>
          <label htmlFor="changeKind" className="mb-2 block text-sm font-medium">
            Вид промяна
          </label>
          <Select
            name="changeKind"
            defaultSelectedKey="addition"
            className="w-full"
          >
            <SelectTrigger id="changeKind" className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem id="addition">Допълнителна работа</SelectItem>
              <SelectItem id="credit">Намаление</SelectItem>
              <SelectItem id="no_cost">Без промяна в цената</SelectItem>
              <SelectItem id="schedule_only">Само промяна в срока</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <fieldset>
        <legend className="mb-3 text-sm font-medium">
          Отражение върху срока
        </legend>
        <div className="flex flex-wrap gap-2">
          {scheduleOptions.map(([value, label]) => (
            <Button
              key={value}
              type="button"
              aria-pressed={scheduleType === value}
              onPress={() => setScheduleType(value)}
              variant={scheduleType === value ? "default" : "outline"}
              className={`min-h-11 rounded-full border px-4 text-sm font-medium ${scheduleType === value ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}
            >
              {label}
            </Button>
          ))}
        </div>
        {scheduleType === "days" && (
          <div className="mt-3 grid max-w-sm gap-2">
            <label className="text-sm font-medium">Договорен нов краен срок<div className="mt-1"><DatePicker name="agreedDeadline" required min="today" aria-label="Договорен нов краен срок" /></div></label>
          </div>
        )}
      </fieldset>

      <Button
        type="button"
        variant="outline"
        onPress={() => setShowMore((value) => !value)}
        className="flex min-h-11 w-full items-center justify-between rounded-xl border bg-card px-4 text-sm font-medium"
      >
        Още детайли
        <ChevronDown
          className={`size-4 transition ${showMore ? "rotate-180" : ""}`}
        />
      </Button>
      {showMore && (
        <section className="grid gap-5 rounded-2xl border bg-card p-4 sm:p-6">
          <div>
            <label className="mb-2 block text-sm font-medium">Причина</label>
            <Textarea name="reason" placeholder="Защо е необходима промяната?" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">
              Бележка към клиента
            </label>
            <Textarea name="clientNote" placeholder="Видима в защитения портал" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">
              Вътрешна бележка
            </label>
            <Textarea name="internalNote" placeholder="Видима само за екипа" />
          </div>
        </section>
      )}
      <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
        <VatRateField defaultValue={defaultTaxRate} />
      </section>
      <StagedAttachments files={files} onChange={setFiles} />
      {files.length ? <input type="hidden" name="hasAttachments" value="1" /> : null}

      {state.error && (
        <p
          role="alert"
          className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
        >
          {state.error}
        </p>
      )}
      <div className="sticky bottom-20 z-20 -mx-4 border-t bg-background/95 p-4 backdrop-blur lg:bottom-0 lg:mx-0 lg:rounded-2xl lg:border">
        <Button
          type="submit"
          className="h-12 w-full text-base"
          isDisabled={pending || !!state.createdId || !visibleOffers.length}
        >
          {uploadProgress ? `Качване на файлове ${uploadProgress.done + 1}/${uploadProgress.total}…` : pending || state.createdId ? "Запазване…" : "Запази промяната"}
        </Button>
      </div>
    </form>
  );
}
