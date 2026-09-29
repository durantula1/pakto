"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Pause, Play } from "lucide-react";
import { useReducedMotion } from "motion/react";

import { Reveal } from "./reveal";

/**
 * The whole agreement in ~40 seconds, rendered from video/ (Remotion) into public/video, in two
 * clips: on phones (both sides' phones) and on desktop (Pakto and the portal in browser windows).
 * The toggle picks the clip; it starts on the one that matches the visitor's screen. Phones get the
 * 4:5 cut, wider screens the 16:9 one. Nothing downloads until the section is near the screen, and
 * only the clip and format on screen get sources; it plays muted and loops while visible. Reduced
 * motion shows the poster and waits for "play".
 */
const formats = [
  { id: "4x5", className: "aspect-[4/5] md:hidden" },
  { id: "16x9", className: "aspect-video max-md:hidden" },
] as const;

const views = [
  { id: "phone", label: "Телефон" },
  { id: "desktop", label: "Десктоп" },
] as const;

type View = (typeof views)[number]["id"];

const descriptions: Record<View, string> = {
  phone:
    "Телефонът на фирмата и телефонът на клиента един до друг: промяната минава от единия към другия.",
  desktop:
    "Фирмата работи в Pakto от компютъра, клиентът отваря имейла и портала в браузъра.",
};

const WIDE = "(width >= 48rem)";
const subscribeWide = (onChange: () => void) => {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

export function ProcessVideo() {
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const reduceMotion = useReducedMotion();
  const wide = useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE).matches,
    () => true,
  );
  const active = wide ? 1 : 0;
  // null until the visitor picks: then the clip follows the screen they are on.
  const [picked, setPicked] = useState<View | null>(null);
  const view: View = picked ?? (wide ? "desktop" : "phone");
  const [near, setNear] = useState(false);
  const [inView, setInView] = useState(false);
  // "auto" plays on scroll unless the visitor prefers reduced motion; the button overrides it.
  const [choice, setChoice] = useState<"auto" | "play" | "pause">("auto");
  const shouldPlay = choice === "play" || (choice === "auto" && !reduceMotion);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setNear(true);
        setInView(entry.intersectionRatio >= 0.4);
      },
      { rootMargin: "400px 0px", threshold: [0, 0.4] },
    );
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  // Runs after the sources are in the DOM, so play() has something to play.
  useEffect(() => {
    const video = videoRefs.current[active];
    if (!video || !near) return;
    if (inView && shouldPlay) void video.play().catch(() => {});
    else video.pause();
  }, [active, inView, near, shouldPlay, view]);

  function toggle() {
    setChoice(shouldPlay ? "pause" : "play");
  }

  const showPlay = !shouldPlay;

  return (
    <section
      id="workflow"
      className="bg-[#f4efe4] px-[6vw] py-[14vh] lg:py-[16vh]"
    >
      <div className="mx-auto max-w-[93.75rem]">
        <Reveal className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
          <p className="mf-kicker">КАК РАБОТИ · 40 СЕКУНДИ</p>
          <div>
            <h2 className="mf-section-title">
              Цялата договорка, от чата до печата.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-[#49626b]">
              Започва с познатия спор, после същата промяна минава през Pakto:
              записана на обекта, коригирана по молба на клиента и одобрена с
              код от имейла.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.08} className="mt-12 lg:mt-16">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[#49626b]">{descriptions[view]}</p>
            <div
              role="group"
              aria-label="Как изглежда"
              className="inline-flex rounded-full border border-[#102b38]/15 bg-[#fffdf7] p-1"
            >
              {views.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={view === id}
                  onClick={() => setPicked(id)}
                  className={`min-h-11 rounded-full px-5 text-sm font-bold transition-colors ${
                    view === id
                      ? "bg-[#102b38] text-[#fffaf0]"
                      : "text-[#49626b] hover:text-[#102b38]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <figure>
            <div
              ref={frameRef}
              className="relative overflow-hidden rounded-[1.75rem] border border-[#102b38]/15 bg-[#f4efe4] shadow-[0_40px_90px_-40px_rgba(16,43,56,.45)]"
            >
              {formats.map(({ id, className }, index) => {
                const name = `pakto-${view}-${id}`;
                return (
                  <video
                    // A new clip is a new element, so the browser loads its source afresh.
                    key={name}
                    ref={(video) => {
                      videoRefs.current[index] = video;
                    }}
                    className={`block w-full ${className}`}
                    // The poster waits too: at load it would compete with the hero for bandwidth.
                    poster={near ? `/video/${name}.jpg` : undefined}
                    muted
                    loop
                    playsInline
                    preload="none"
                    aria-describedby="process-video-description"
                  >
                    {near && index === active ? (
                      <source src={`/video/${name}.mp4`} type="video/mp4" />
                    ) : null}
                  </video>
                );
              })}
              <button
                type="button"
                onClick={toggle}
                aria-label={showPlay ? "Пусни видеото" : "Спри видеото"}
                className={`absolute grid place-items-center rounded-full bg-[#102b38] text-[#f4efe4] shadow-[0_12px_30px_rgba(16,43,56,.35)] transition-transform hover:scale-105 ${
                  showPlay
                    ? "left-1/2 top-1/2 size-16 -translate-x-1/2 -translate-y-1/2"
                    : "bottom-4 right-4 size-10 opacity-80 hover:opacity-100"
                }`}
              >
                {showPlay ? (
                  <Play className="ml-0.5 size-6" />
                ) : (
                  <Pause className="size-4" />
                )}
              </button>
            </div>
            <figcaption id="process-video-description" className="sr-only">
              Видео без звук, около 40 секунди. {descriptions[view]} Клиентът
              пише в чат, а фирмата отговаря „Става, после ще сметнем“, и три
              седмици по-късно има спор за 450 €. С Pakto фирмата записва
              промяната на обекта с цена и срок и я изпраща. Клиентът получава
              линк по имейл, без профил, и иска промяна: два контакта и без
              контакта за хладилника. Фирмата изпраща версия 2, а версия 1
              остава заключена. Клиентът вижда какво се е променило, изписва
              името си, въвежда кода от имейла и одобрява 384 €. Решението се
              записва и фирмата веднага вижда, че е одобрено.
            </figcaption>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}
