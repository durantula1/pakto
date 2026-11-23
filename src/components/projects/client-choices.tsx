"use client";

import { useRef, useState } from "react";
import { Check, ImagePlus, MessageCircleQuestion, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { prepareFile } from "@/components/change-orders/attachment-upload";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { ConfirmDialog } from "@/components/workspace/confirm-dialog";
import { FilterSelect } from "@/components/workspace/filter-select";
import { uploadWithTicket } from "@/lib/storage/upload-client";
import { dateWithTime } from "@/lib/dates";
import { formatDay } from "@/modules/change-orders/labels";
import {
  cancelChoiceAction,
  createChoiceAction,
  createChoiceImageUploadAction,
  recordChoiceAnswerAction,
} from "@/modules/client-choices/actions";
import type { ClientChoice } from "@/modules/client-choices/queries";

/**
 * Small questions to the client without a price: a tile colour, a socket height. The client picks in the portal;
 * without the full portal (or when they said it on the phone) the team records the pick.
 */
export function ClientChoices({
  projectId,
  choices,
  canAsk,
  portal,
}: {
  projectId: string;
  choices: ClientChoice[];
  canAsk: boolean;
  portal: boolean;
}) {
  if (!choices.length && !canAsk) return null;
  return (
    <section id="choices" className="flex flex-col gap-3 scroll-mt-24">
      {/* Same layout as SectionHeader in offer-execution, which is server-only. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold">Избори от клиента</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {portal
              ? "Малки въпроси без цена: цвят, модел, височина. Клиентът избира в портала, а ти виждаш отговора тук и в известията."
              : "Малки въпроси без цена: цвят, модел, височина. Запиши какво е избрал клиентът, за да остане в историята."}
          </p>
        </div>
        {canAsk ? <AskDialog projectId={projectId} portal={portal} /> : null}
      </div>
      {choices.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {choices.map((choice) => (
            <ChoiceCard
              key={choice.id}
              projectId={projectId}
              choice={choice}
              canAsk={canAsk}
            />
          ))}
        </div>
      ) : (
        <p className="border border-dashed px-4 py-5 text-sm text-muted-foreground">
          Още няма въпроси. Например: „Коя плочка за банята?“ с 2–3 снимки.
        </p>
      )}
    </section>
  );
}

function ChoiceCard({
  projectId,
  choice,
  canAsk,
}: {
  projectId: string;
  choice: ClientChoice;
  canAsk: boolean;
}) {
  const picked = choice.answer
    ? choice.options.find((option) => option.key === choice.answer!.optionKey)
    : null;
  const canceled = !!choice.canceledAt;
  return (
    <article className="flex flex-col gap-3 border bg-card p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold">{choice.question}</h3>
          {choice.note ? (
            <p className="mt-0.5 text-sm whitespace-pre-line text-muted-foreground">
              {choice.note}
            </p>
          ) : null}
        </div>
        {canceled ? (
          <Badge variant="stone-struck">Отменен</Badge>
        ) : picked ? (
          <Badge variant="approved">Избрано</Badge>
        ) : (
          <Badge variant="sent">
            Чака отговор{choice.dueOn ? ` до ${formatDay(choice.dueOn)}` : ""}
          </Badge>
        )}
      </header>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {choice.options.map((option) => {
          const chosen = picked?.key === option.key;
          return (
            <li
              key={option.key}
              className={chosen ? "border border-ok bg-ok-tint" : "border"}
            >
              {option.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- private photo behind an access check (or a local preview)
                <img
                  src={option.imageUrl}
                  alt=""
                  className="aspect-[4/3] w-full object-cover"
                  loading="lazy"
                />
              ) : null}
              <div className="px-2 py-1.5 text-sm">
                <p className="flex items-center gap-1 font-medium">
                  {chosen ? (
                    <Check className="size-3.5 shrink-0 text-ok" />
                  ) : null}
                  {option.label}
                </p>
                {option.description ? (
                  <p className="text-xs text-muted-foreground">
                    {option.description}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {choice.answer && picked ? (
        <p className="text-sm text-muted-foreground">
          {choice.answer.actorType === "portal_contact"
            ? "Клиентът избра"
            : "Отбелязано от екипа"}{" "}
          „{picked.label}“ на {dateWithTime.format(choice.answer.createdAt)}
          {choice.answer.comment ? (
            <span className="mt-1 block text-foreground">
              „{choice.answer.comment}“
            </span>
          ) : null}
        </p>
      ) : null}
      {canAsk && !choice.answer && !canceled ? (
        <div className="flex flex-wrap gap-2">
          <RecordDialog projectId={projectId} choice={choice} />
          <ConfirmDialog
            trigger={
              <Button type="button" variant="ghost" size="sm">
                Отмени въпроса
              </Button>
            }
            title="Да отменим ли въпроса?"
            description="Клиентът няма да го вижда повече в портала. В историята остава, че е бил зададен."
            confirmLabel="Отмени въпроса"
            action={cancelChoiceAction}
            fields={{ projectId, choiceId: choice.id }}
            success="Въпросът е отменен"
          />
        </div>
      ) : null}
    </article>
  );
}

function RecordDialog({
  projectId,
  choice,
}: {
  projectId: string;
  choice: ClientChoice;
}) {
  return (
    <DialogTrigger>
      <Button type="button" variant="outline" size="sm">
        <Check data-icon="inline-start" />
        Отбележи избора
      </Button>
      <Dialog className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Какво избра клиентът?</DialogTitle>
          <DialogDescription>
            За избор, казан по телефона или на място. Записва се в историята на
            проекта.
          </DialogDescription>
        </DialogHeader>
        <ActionForm
          action={recordChoiceAnswerAction}
          success="Изборът е записан"
          className="grid gap-3"
        >
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="choiceId" value={choice.id} />
          <Field>
            <FieldLabel>Вариант</FieldLabel>
            <FilterSelect
              name="optionKey"
              value={choice.options[0]!.key}
              options={choice.options.map((option) => ({
                value: option.key,
                label: option.label,
              }))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`choice-comment-${choice.id}`}>
              Бележка (по избор)
            </FieldLabel>
            <Textarea
              id={`choice-comment-${choice.id}`}
              name="comment"
              maxLength={1000}
              rows={2}
              placeholder="Напр. каза го по телефона"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <DialogClose>Отказ</DialogClose>
            <ActionSubmit>Запиши</ActionSubmit>
          </div>
        </ActionForm>
      </Dialog>
    </DialogTrigger>
  );
}

type DraftOption = {
  id: number;
  label: string;
  description: string;
  image: string | null;
  preview: string | null;
  uploading: boolean;
};

function AskDialog({
  projectId,
  portal,
}: {
  projectId: string;
  portal: boolean;
}) {
  const nextId = useRef(3);
  const blank = (id: number): DraftOption => ({
    id,
    label: "",
    description: "",
    image: null,
    preview: null,
    uploading: false,
  });
  const [options, setOptions] = useState<DraftOption[]>([blank(1), blank(2)]);
  const update = (id: number, patch: Partial<DraftOption>) =>
    setOptions((list) =>
      list.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  const uploading = options.some((option) => option.uploading);

  async function pickPhoto(id: number, file: File | undefined) {
    if (!file) return;
    update(id, { uploading: true });
    try {
      const prepared = await prepareFile(file);
      if (prepared.mimeType !== "image/jpeg")
        throw new Error("Позволени са само снимки.");
      const ticket = await createChoiceImageUploadAction({
        projectId,
        mimeType: prepared.mimeType,
        byteSize: prepared.blob.size,
      });
      if (!ticket.ok) throw new Error(ticket.error);
      if (
        !(await uploadWithTicket(
          ticket.token,
          prepared.blob,
          prepared.mimeType,
        ))
      )
        throw new Error(
          "Снимката не беше качена. Провери връзката и опитай пак.",
        );
      update(id, {
        image: ticket.path,
        preview: URL.createObjectURL(prepared.blob),
        uploading: false,
      });
    } catch (cause) {
      update(id, { uploading: false });
      toast.error(
        cause instanceof Error ? cause.message : "Снимката не беше качена.",
      );
    }
  }

  const payload = JSON.stringify(
    options.map((option) => ({
      label: option.label,
      description: option.description || undefined,
      image: option.image ?? undefined,
    })),
  );
  return (
    <DialogTrigger
      onOpenChange={(open) => {
        if (!open) setOptions([blank(1), blank(2)]);
      }}
    >
      <Button type="button" variant="outline">
        <MessageCircleQuestion data-icon="inline-start" />
        Попитай клиента
      </Button>
      <Dialog className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Попитай клиента</DialogTitle>
          <DialogDescription>
            {portal
              ? "Клиентът получава имейл и избира в портала. Без цена: ако изборът променя сумата, направи промяна по офертата."
              : "Клиентският портал е изключен. Запиши въпроса и после отбележи какво е избрал клиентът."}
          </DialogDescription>
        </DialogHeader>
        <ActionForm
          action={createChoiceAction}
          success={
            portal ? "Въпросът е изпратен на клиента" : "Въпросът е записан"
          }
          className="grid gap-3"
          onSuccess={() => setOptions([blank(1), blank(2)])}
        >
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="options" value={payload} />
          <Field>
            <FieldLabel htmlFor="choice-question">Въпрос</FieldLabel>
            <Input
              id="choice-question"
              name="question"
              required
              minLength={2}
              maxLength={200}
              placeholder="Напр. Коя плочка за банята?"
              autoFocus
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="choice-note">Пояснение (по избор)</FieldLabel>
            <Textarea
              id="choice-note"
              name="note"
              maxLength={1000}
              rows={2}
              placeholder="Напр. и трите са в наличност, доставка до 3 дни"
            />
          </Field>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">Варианти</legend>
            {options.map((option, index) => (
              <div key={option.id} className="flex gap-2 border p-2">
                <label className="relative flex size-16 shrink-0 cursor-pointer items-center justify-center border border-dashed bg-muted/40 text-muted-foreground hover:text-foreground">
                  {option.preview ? (
                    // eslint-disable-next-line @next/next/no-img-element -- private photo behind an access check (or a local preview)
                    <img
                      src={option.preview}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <ImagePlus className="size-5" />
                  )}
                  {option.uploading ? (
                    <span className="absolute inset-0 flex items-center justify-center bg-background/80 text-xs">
                      Качване…
                    </span>
                  ) : null}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    aria-label={`Снимка за вариант ${index + 1}`}
                    onChange={(event) => {
                      void pickPhoto(option.id, event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                </label>
                <div className="grid min-w-0 flex-1 gap-1.5">
                  <Input
                    aria-label={`Вариант ${index + 1}`}
                    value={option.label}
                    onChange={(event) =>
                      update(option.id, { label: event.target.value })
                    }
                    required
                    maxLength={120}
                    placeholder={`Вариант ${index + 1}, напр. Сива 60×60`}
                  />
                  <Input
                    aria-label={`Описание на вариант ${index + 1}`}
                    value={option.description}
                    onChange={(event) =>
                      update(option.id, { description: event.target.value })
                    }
                    maxLength={300}
                    placeholder="Кратко описание (по избор)"
                  />
                </div>
                {options.length > 2 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 shrink-0"
                    aria-label={`Махни вариант ${index + 1}`}
                    onPress={() =>
                      setOptions((list) =>
                        list.filter((item) => item.id !== option.id),
                      )
                    }
                  >
                    <X />
                  </Button>
                ) : null}
              </div>
            ))}
            {options.length < 6 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="justify-self-start"
                onPress={() =>
                  setOptions((list) => [...list, blank(nextId.current++)])
                }
              >
                <Plus data-icon="inline-start" />
                Добави вариант
              </Button>
            ) : null}
          </fieldset>
          <Field>
            <FieldLabel htmlFor="choice-due">Отговор до (по избор)</FieldLabel>
            <DatePicker id="choice-due" name="dueOn" aria-label="Отговор до" />
          </Field>
          <div className="flex justify-end gap-2">
            <DialogClose>Отказ</DialogClose>
            {uploading ? (
              <Button type="button" isDisabled>
                Качване на снимка…
              </Button>
            ) : (
              <ActionSubmit>
                {portal ? "Изпрати на клиента" : "Запиши въпроса"}
              </ActionSubmit>
            )}
          </div>
        </ActionForm>
      </Dialog>
    </DialogTrigger>
  );
}
