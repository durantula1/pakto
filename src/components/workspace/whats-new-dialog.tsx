"use client";

import { useState, useTransition } from "react";
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  ListChecks,
  MessageCircleQuestion,
  SlidersHorizontal,
  Stamp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dismissWhatsNewAction } from "@/modules/account/actions";

type Features = {
  portalMode: "full" | "view_only" | "off";
  tasks: boolean;
  finance: boolean;
};

/** Each slide says what is new and where to find it; slides for a module that is off are left out. */
const slides = [
  {
    icon: CircleCheck,
    title: "„Отбележи като договорено“",
    text: "Клиентът се е съгласил по телефона, на място или с договор на хартия? Отвори офертата и натисни „Отбележи като договорено“. Pakto записва кога и как е станало, а етапите и плащанията тръгват както при одобрение от клиента.",
    show: () => true,
  },
  {
    icon: CalendarRange,
    title: "Етапи и плащания без оферта",
    text: "За работа по договор или абонамент вече не ти трябва оферта. В проекта, раздел „Работа“, добави етапи, а в „Плащания“ добави вноски. Една вноска може да се повтаря всеки месец.",
    show: () => true,
  },
  {
    icon: ListChecks,
    title: "Задачи по етапи и изглед „Днес“",
    text: "Свържи задача с етап от проекта. Когато и последната задача е готова, Pakto ти предлага да отбележиш етапа като завършен. В „Задачи“ → „Днес“ виждаш кой върху какво работи днес.",
    show: (features: Features) => features.tasks,
  },
  {
    icon: Stamp,
    title: "Приемане по етапи",
    text: "Не чакай края на целия проект. Когато завършиш етап, натисни „Поискай приемане“ и клиентът го приема в портала или ти пише забележки. Ако има вноска за този етап, тя става дължима, щом етапът е приет.",
    show: (features: Features) => features.portalMode === "full",
  },
  {
    icon: MessageCircleQuestion,
    title: "„Попитай клиента“",
    text: "Плочка, цвят, модел: задай въпрос с 2 до 6 варианта, и със снимки, ако искаш. Клиентът избира в портала, а изборът остава в историята на проекта. Бутонът е в проекта, раздел „Въпроси“.",
    show: (features: Features) => features.portalMode === "full",
  },
  {
    icon: SlidersHorizontal,
    title: "Pakto по твоя начин",
    text: "В Настройки → Фирма избираш как клиентите потвърждават офертите, какво виждат в портала и кои модули ползваш: Задачи, Каталог, Финанси, Клиентски портал. Изключеният модул изчезва от менюто, а данните му остават.",
    show: () => true,
    ownerOnly: true,
  },
];

/** Opens once for people who already used Pakto before this release; closing it in any way marks it as seen. */
export function WhatsNewDialog({
  owner,
  features,
}: {
  owner: boolean;
  features: Features;
}) {
  const visible = slides.filter(
    (slide) => slide.show(features) && (owner || !slide.ownerOnly),
  );
  const [open, setOpen] = useState(true);
  const [index, setIndex] = useState(0);
  const [, startTransition] = useTransition();
  const slide = visible[index]!;
  const last = index === visible.length - 1;

  function close() {
    setOpen(false);
    startTransition(() => void dismissWhatsNewAction());
  }

  return (
    <Dialog
      isOpen={open}
      onOpenChange={(next) => (next ? setOpen(true) : close())}
      className="sm:max-w-md"
    >
      <DialogHeader className="items-start gap-3">
        <span className="flex size-12 items-center justify-center bg-blue-tint text-blue">
          <slide.icon className="size-6" aria-hidden />
        </span>
        <p className="font-mono text-xs text-muted-foreground">
          Новото в Pakto · {index + 1} от {visible.length}
        </p>
        <DialogTitle className="text-lg leading-tight">
          {slide.title}
        </DialogTitle>
        <DialogDescription className="text-sm leading-relaxed">
          {slide.text}
        </DialogDescription>
      </DialogHeader>
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1.5" aria-hidden>
          {visible.map((item, position) => (
            <span
              key={item.title}
              className={
                position === index
                  ? "h-1.5 w-5 bg-primary"
                  : "h-1.5 w-5 bg-foreground/20"
              }
            />
          ))}
        </div>
        <div className="flex gap-2">
          {index > 0 ? (
            <Button
              type="button"
              variant="outline"
              onPress={() => setIndex(index - 1)}
            >
              <ChevronLeft aria-hidden /> Назад
            </Button>
          ) : (
            <Button type="button" variant="ghost" onPress={close}>
              Пропусни
            </Button>
          )}
          {last ? (
            <Button type="button" onPress={close}>
              Разбрах
            </Button>
          ) : (
            <Button type="button" onPress={() => setIndex(index + 1)}>
              Напред <ChevronRight aria-hidden />
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
