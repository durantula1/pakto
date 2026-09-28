"use client";

import { useRef } from "react";
import {
  ArrowRight,
  CircleCheck,
  FileCheck2,
  Layers3,
  Ruler,
  Wrench,
} from "lucide-react";
import {
  m,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";

import { Reveal } from "./reveal";

const chapters = [
  {
    number: "01",
    eyebrow: "НА МЯСТО",
    title: (
      <>
        ПРОМЯНАТА
        <br />
        ЗАПОЧВА <i>ясно.</i>
      </>
    ),
    text: "Какво се променя, защо, цената и новият срок се записват на място, докато детайлите още са пред очите ти. Вътрешната бележка остава за екипа.",
    range: [0, 0.02, 0.19, 0.27],
  },
  {
    number: "02",
    eyebrow: "ИЗПРАЩАНЕ",
    title: (
      <>
        ЕДИН ЛИНК.
        <br />
        ЕДНО <i>да.</i>
      </>
    ),
    text: "Клиентът отваря линка от телефона, вижда точната версия и потвърждава с името си и код от имейла.",
    range: [0.2, 0.3, 0.44, 0.54],
  },
  {
    number: "03",
    eyebrow: "ВЕРСИИ",
    title: (
      <>
        НИЩО НЕ СЕ
        <br />
        <i>презаписва.</i>
      </>
    ),
    text: "Изпратеното се заключва. Всяка корекция е нова версия, а клиентът вижда какво се е променило.",
    range: [0.47, 0.57, 0.7, 0.8],
  },
  {
    number: "04",
    eyebrow: "ИСТОРИЯ",
    title: (
      <>
        ИСТОРИЯТА
        <br />
        ОСТАВА <i>цяла.</i>
      </>
    ),
    text: "Кой, кога и какво е решил остава в историята на проекта. Клиентът получава разписка с PDF и линк за оспорване, а ти теглиш същия PDF от обекта.",
    range: [0.73, 0.83, 1, 1],
  },
] as const;

const storyStages = ["ЧЕРНОВА", "ИЗПРАЩАНЕ", "РЕШЕНИЕ", "ИЗПЪЛНЕНИЕ"] as const;

function StoryChapter({
  chapter,
  progress,
}: {
  chapter: (typeof chapters)[number];
  progress: MotionValue<number>;
}) {
  const opacity = useTransform(progress, [...chapter.range], [0, 1, 1, 0]);
  const y = useTransform(progress, [...chapter.range], [32, 0, 0, -32]);

  return (
    <m.article
      style={{ opacity, y }}
      className="mf-story-copy absolute inset-x-0 top-1/2 -translate-y-1/2 max-md:top-0 max-md:translate-y-0"
    >
      <div className="mf-kicker text-[#b8ecda]">
        {chapter.number} — {chapter.eyebrow}
      </div>
      <h3>{chapter.title}</h3>
      <p>{chapter.text}</p>
    </m.article>
  );
}

function StoryStatus({
  progress,
  threshold,
  icon: Icon,
  title,
  detail,
}: {
  progress: MotionValue<number>;
  threshold: number;
  icon: typeof Ruler;
  title: string;
  detail: string;
}) {
  const active = useTransform(
    progress,
    [Math.max(0, threshold - 0.08), threshold],
    [0.25, 1],
  );
  const x = useTransform(
    progress,
    [Math.max(0, threshold - 0.08), threshold],
    [12, 0],
  );

  return (
    <m.div
      style={{ opacity: active, x }}
      className="flex items-center gap-3 border-b border-[#17364a]/10 py-3 last:border-0"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#bceba8] text-[#102b38]">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.8125rem] font-bold text-[#102b38]">{title}</p>
        <p className="truncate text-[0.6875rem] text-[#52707d]">{detail}</p>
      </div>
      <CircleCheck className="size-4 text-[#16916d]" />
    </m.div>
  );
}

export function FlowStory() {
  const storyRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: storyRef,
    offset: ["start start", "end end"],
  });
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 24,
    mass: 0.4,
  });
  const passportX = useTransform(smoothProgress, [0, 1], [28, -28]);
  const passportY = useTransform(smoothProgress, [0, 0.5, 1], [20, -16, 12]);
  const passportRotate = useTransform(smoothProgress, [0, 0.5, 1], [3, -2, 1]);
  const routeScale = useTransform(smoothProgress, [0, 1], [0, 1]);
  const routeLeft = useTransform(smoothProgress, [0, 1], ["0%", "100%"]);
  const glowX = useTransform(smoothProgress, [0, 1], ["-25%", "35%"]);

  return (
    <section
      ref={storyRef}
      id="workflow"
      className="mf-story relative md:h-[340vh]"
    >
      <h2 className="sr-only">Как работи Pakto</h2>

      {/* Phones: the four steps as plain cards. A 340vh sticky scene is too many swipes for four sentences. */}
      <div className="relative px-[6vw] pb-16 pt-20 md:hidden">
        <div className="mf-story-grid absolute inset-0" aria-hidden="true" />
        <p className="mf-kicker relative text-[#b8ecda]">КАК РАБОТИ</p>
        <ol className="relative mt-8 space-y-4">
          {chapters.map((chapter) => (
            <li key={chapter.number}>
              <Reveal className="mf-story-copy rounded-[1.5rem] border border-white/15 bg-white/[0.06] p-6">
                <div className="mf-kicker text-[#b8ecda]">
                  {chapter.number} — {chapter.eyebrow}
                </div>
                <h3>{chapter.title}</h3>
                <p>{chapter.text}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>

      <div className="sticky top-0 h-screen overflow-hidden max-md:hidden supports-[height:100svh]:h-svh">
        <m.div
          style={{ x: glowX }}
          className="pointer-events-none absolute left-1/2 top-1/2 size-[60vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#236d86]/30 blur-[100px]"
        />
        <div className="mf-story-grid absolute inset-0" />
        <div className="absolute left-[6vw] right-[6vw] top-24 z-20 flex max-md:top-[5.75rem] items-center justify-between font-mono text-[0.5625rem] tracking-[0.16em] text-[#c6dfdf]">
          <span>ЗАПИС НА ПРОМЯНАТА</span>
          <span>ПР-042 · СОФИЯ</span>
        </div>

        <div className="relative z-10 mx-auto grid h-full max-w-[93.75rem] items-center gap-10 px-[6vw] max-md:flex max-md:flex-col max-md:items-stretch max-md:gap-5 max-md:pb-[calc(4svh+2.75rem)] max-md:pt-[7.75rem] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative h-[52vh] max-md:h-[clamp(14.75rem,36svh,18.125rem)] max-md:shrink-0">
            {chapters.map((chapter) => (
              <StoryChapter
                key={chapter.number}
                chapter={chapter}
                progress={smoothProgress}
              />
            ))}
          </div>

          <div className="relative flex min-h-[48vh] items-center justify-center max-md:min-h-0 max-md:flex-1 max-md:items-start lg:min-h-[66vh]">
            <m.div
              style={{ x: passportX, y: passportY, rotate: passportRotate }}
              aria-hidden="true"
              className="mf-passport relative z-10 w-[min(90%,28.75rem)] overflow-hidden rounded-[1.75rem] border border-white/40 bg-[#f8f2e7] p-3 text-[#102b38] shadow-[0_45px_100px_rgba(0,14,28,.55)]"
            >
              <div className="rounded-[1.3125rem] border border-[#17364a]/10 bg-white/80 p-5 backdrop-blur-xl sm:p-6">
                <div className="flex items-start justify-between border-b border-[#17364a]/10 pb-5">
                  <div>
                    <p className="font-mono text-[0.5625rem] font-bold tracking-[0.14em] text-[#c24a35]">
                      ПР-042
                    </p>
                    <h3 className="mt-1 text-xl font-black tracking-[-0.04em] sm:text-2xl">
                      Къща · Бояна
                    </h3>
                  </div>
                  <span className="rounded-full bg-[#ffe7a8] px-3 py-1.5 text-[0.625rem] font-bold text-[#755710]">
                    ЧАКА ОДОБРЕНИЕ
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 py-4">
                  {[
                    ["КЛИЕНТ", "Иван П."],
                    ["ВЕРСИЯ", "v2"],
                    ["СТОЙНОСТ", "+384 €"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-[#eef3f0] p-2.5">
                      <p className="font-mono text-[0.4375rem] tracking-[0.1em] text-[#52707d]">
                        {label}
                      </p>
                      <p className="mt-1 truncate text-[0.6875rem] font-bold">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
                <StoryStatus
                  progress={smoothProgress}
                  threshold={0.05}
                  icon={Ruler}
                  title="Промяната е описана"
                  detail="Описание, причина, цена и срок"
                />
                <StoryStatus
                  progress={smoothProgress}
                  threshold={0.3}
                  icon={FileCheck2}
                  title="Версия v2 е изпратена"
                  detail="Защитен линк до клиента"
                />
                <StoryStatus
                  progress={smoothProgress}
                  threshold={0.58}
                  icon={Layers3}
                  title="Клиентът е одобрил"
                  detail="Потвърдено с код · 14:32"
                />
                <StoryStatus
                  progress={smoothProgress}
                  threshold={0.83}
                  icon={Wrench}
                  title="Работата е изпълнена"
                  detail="Разписка с PDF до клиента"
                />
              </div>
            </m.div>
          </div>
        </div>

        <div className="mf-story-rail absolute z-20 h-px bg-white/20">
          <m.span
            style={{ scaleX: routeScale }}
            className="absolute inset-0 origin-left bg-[#ff7b63] shadow-[0_0_16px_rgba(255,123,99,.45)]"
          />
          {storyStages.map((label, index) => (
            <span
              key={label}
              className="absolute top-0 -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${(index / (storyStages.length - 1)) * 100}%`,
              }}
            >
              <i className="grid size-6 place-items-center rounded-full border border-white/25 bg-[#12364b] font-mono text-[0.5rem] not-italic text-[#e8f1ed] shadow-[0_0_0_5px_rgba(18,54,75,.9)]">
                0{index + 1}
              </i>
              <b className="absolute bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[0.5rem] font-medium tracking-[0.12em] text-[#b8ced2] max-sm:hidden">
                {label}
              </b>
            </span>
          ))}
          <m.span
            style={{ left: routeLeft }}
            className="absolute top-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-[#12364b] bg-[#ff7b63] shadow-[0_0_30px_rgba(255,123,99,.75)]"
          >
            <ArrowRight className="size-4 text-[#102b38]" />
          </m.span>
        </div>

        <div className="absolute bottom-7 left-[6vw] z-20 flex items-center max-md:hidden gap-3 font-mono text-[0.5rem] tracking-[0.14em] text-[#c6dfdf]">
          <span className="h-14 w-px bg-white/25" />
          СКРОЛНИ НАДОЛУ
        </div>
      </div>
    </section>
  );
}

