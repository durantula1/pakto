"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Pause, Play } from "lucide-react";
import { useReducedMotion } from "motion/react";

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
  { id: "desktop", label: "Компютър" },
] as const;

type View = (typeof views)[number]["id"];

const descriptions: Record<View, string> = {
  phone:
    "Твоят телефон и телефонът на клиента един до друг: промяната тръгва от единия и се одобрява на другия.",
  desktop:
    "Ти работиш в Pakto от компютъра, а клиентът отваря имейла и портала в браузъра си.",
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
  // The browser refused to start the clip (iOS Low Power Mode, data saver): show "play", not "pause".
  const [blocked, setBlocked] = useState(false);

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
    if (inView && shouldPlay) {
      video.play().catch(() => setBlocked(true));
    } else video.pause();
  }, [active, inView, near, shouldPlay, view]);

  function toggle() {
    if (shouldPlay && !blocked) {
      setChoice("pause");
      return;
    }
    setChoice("play");
    setBlocked(false);
    // Inside the tap itself, where browsers allow playback.
    void videoRefs.current[active]?.play().catch(() => setBlocked(true));
  }

  const showPlay = !shouldPlay || blocked;

  return (
    <div className="vid rv">
      <div className="vh">
        <div>
          <p className="lbl">Видео · 40 секунди</p>
          <p className="muted mt-1 text-[0.95rem]">{descriptions[view]}</p>
        </div>
        <div role="group" aria-label="Как изглежда" className="tg">
          {views.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              onClick={() => setPicked(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <figure>
        <div ref={frameRef} className="vf">
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
                onPlaying={() => setBlocked(false)}
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
            className={`play ${
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
          Видео без звук, около 40 секунди. {descriptions[view]} Клиентът пише в
          чат, а фирмата отговаря „Добре, после ще сметнем“, и три седмици
          по-късно има спор за 450 €. С Pakto фирмата записва промяната на
          проекта с цена и срок и я изпраща. Клиентът получава линк по имейл,
          без регистрация, и иска промяна: два контакта стигат, без този за
          хладилника, плюс линия за фурната. Фирмата изпраща версия 2, а версия
          1 остава заключена. Клиентът вижда какво се е променило, изписва името
          си, въвежда кода от имейла и одобрява 384 €. Решението се записва и
          фирмата веднага вижда, че е одобрено.
        </figcaption>
      </figure>
    </div>
  );
}
