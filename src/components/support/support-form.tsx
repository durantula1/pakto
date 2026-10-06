"use client";

import { ImagePlus, X } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { segmentClassName, segmentGroupClassName } from "@/components/workspace/segmented";
import { sendSupportRequestAction, type SupportState } from "@/modules/support/actions";
import { supportKinds } from "@/modules/support/kinds";

const MAX_FILES = 3;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

type Picked = { file: File; url: string };

/** "Връзка с нас": the same form for visitors, company staff and clients; the server adds who is writing. */
export function SupportForm({ knownEmail, page }: { knownEmail: string | null; page: string | null }) {
  const [state, submit, pending] = useActionState<SupportState, FormData>(sendSupportRequestAction, {});
  const [picked, setPicked] = useState<Picked[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  // Controlled, because React resets the form after every action and an error must not lose the text.
  const [kind, setKind] = useState<string>("problem");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(knownEmail ?? "");
  const [name, setName] = useState("");
  const startedAt = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);
  const pickedRef = useRef(picked);
  useEffect(() => {
    pickedRef.current = picked;
  }, [picked]);
  useEffect(() => () => pickedRef.current.forEach((entry) => URL.revokeObjectURL(entry.url)), []);

  function addFiles(list: FileList | null) {
    setFileError(null);
    const incoming = [...(list ?? [])];
    if (fileInput.current) fileInput.current.value = "";
    if (incoming.some((file) => !["image/png", "image/jpeg", "image/webp"].includes(file.type))) return setFileError("Приемаме само снимки PNG, JPG или WebP.");
    if (incoming.some((file) => file.size > MAX_FILE_BYTES)) return setFileError("Всяка снимка трябва да е до 5 MB.");
    if (picked.length + incoming.length > MAX_FILES) return setFileError(`Може да прикачите до ${MAX_FILES} снимки.`);
    setPicked([...picked, ...incoming.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
  }

  function action(formData: FormData) {
    formData.delete("screenshots");
    for (const entry of picked) formData.append("screenshots", entry.file);
    formData.set("startedAt", String(startedAt.current || Date.now()));
    submit(formData);
  }

  if (state.ok) {
    return (
      <p role="status" className="rounded-xl bg-primary/10 p-4 text-sm font-medium text-primary-ink">
        Благодарим! Получихме съобщението и ще ви отговорим на имейла.
      </p>
    );
  }

  return (
    <form action={action} noValidate className="space-y-4">
      <fieldset className="space-y-1.5">
        <legend className="mb-1.5 text-sm font-medium">За какво пишете?</legend>
        <div className={segmentGroupClassName}>
          {Object.entries(supportKinds).map(([value, label]) => (
            <label key={value} className={segmentClassName}>
              <input type="radio" name="kind" value={value} aria-label={label} checked={kind === value} onChange={() => setKind(value)} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <label htmlFor="support-message" className="text-sm font-medium">Съобщение</label>
        <Textarea
          id="support-message"
          name="message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          required
          minLength={10}
          maxLength={5000}
          rows={5}
          placeholder="Какво се случи, на коя страница и какво очаквахте да стане?"
          className="min-h-32 bg-background"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="support-email" className="text-sm font-medium">Имейл за отговор</label>
          <Input id="support-email" name="email" type="email" required={!knownEmail} value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="ime@primer.bg" className="h-11 bg-background" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="support-name" className="text-sm font-medium">Име <span className="font-normal text-muted-foreground">(по желание)</span></label>
          <Input id="support-name" name="name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} autoComplete="name" className="h-11 bg-background" />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Снимки на екрана <span className="font-normal text-muted-foreground">(по желание, до {MAX_FILES})</span></p>
        {picked.length ? (
          <ul className="flex flex-wrap gap-2">
            {picked.map((entry, index) => (
              <li key={entry.url} className="relative size-20 overflow-hidden rounded-lg border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element -- a local blob preview, never optimized */}
                <img src={entry.url} alt={`Снимка ${index + 1}`} className="size-full object-cover" />
                <button
                  type="button"
                  aria-label={`Махни снимка ${index + 1}`}
                  onClick={() => {
                    URL.revokeObjectURL(entry.url);
                    setPicked(picked.filter((other) => other !== entry));
                  }}
                  className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-background/90 shadow-sm"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {picked.length < MAX_FILES ? (
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 text-sm text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/50">
            <ImagePlus className="size-4" /> Добави снимка
            <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" onChange={(event) => addFiles(event.target.files)} />
          </label>
        ) : null}
        <p className="text-xs text-muted-foreground">Снимките се изпращат само по имейл и не се пазят в Pakto.</p>
        {fileError ? <p role="alert" className="text-sm text-destructive">{fileError}</p> : null}
      </div>

      {/* Hidden from people; bots that fill every field are dropped silently. */}
      <div aria-hidden="true" className="absolute -left-[625rem] size-px overflow-hidden">
        <label>Уебсайт <input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      {page ? <input type="hidden" name="page" value={page} /> : null}

      {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" className="h-11 w-full px-5 sm:w-auto" isDisabled={pending}>
        {pending ? "Изпращане…" : "Изпрати"}
      </Button>
    </form>
  );
}
