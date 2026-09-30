"use client";

import { useRef, type PointerEvent } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";

function Sheet({
  code,
  kicker,
  title,
  rows,
  total,
  approved,
  transform,
  className,
}: {
  code: string;
  kicker: string;
  title: string;
  rows: { name: string; meta: string; amount: string }[];
  total: string;
  approved?: boolean;
  transform: string;
  className?: string;
}) {
  return (
    <article
      style={{ transform }}
      className={`absolute left-1/2 top-1/2 w-[15.625rem] rounded-2xl bg-[#fffaf0] text-[#102b38] shadow-[0_22px_50px_rgba(0,0,0,0.38)] ${className ?? ""}`}
    >
      <div className="flex items-center justify-between border-b border-[#102b38]/10 px-4 py-3">
        <span className="font-mono text-2xs tracking-wide text-[#52707d]">
          {code}
        </span>
        <span className="text-3xs font-semibold uppercase tracking-[0.14em] text-[#ff765f]">
          {kicker}
        </span>
      </div>
      <div className="px-4 py-3">
        <p className="text-sm font-semibold">{title}</p>
        <div className="mt-3 space-y-2">
          {rows.map((row) => (
            <div key={row.name} className="flex items-baseline justify-between gap-3 text-[0.75rem]">
              <span>
                <span className="block leading-4">{row.name}</span>
                <span className="text-3xs text-[#52707d]">{row.meta}</span>
              </span>
              <span className="shrink-0 tabular-nums">{row.amount}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between rounded-b-2xl bg-[#102b38] px-4 py-3 text-[#fffaf0]">
        <span className="text-3xs uppercase tracking-[0.16em] text-white/55">
          Общо
        </span>
        <span className="text-right">
          {approved ? (
            <span className="mb-0.5 block text-3xs font-semibold uppercase tracking-[0.14em] text-[#ff765f]">
              Одобрена
            </span>
          ) : null}
          <span className="text-sm font-semibold tabular-nums">{total}</span>
        </span>
      </div>
    </article>
  );
}

export function AuthStage() {
  const panel = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-16, 16]), {
    stiffness: 70,
    damping: 18,
  });
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [12, -6]), {
    stiffness: 70,
    damping: 18,
  });
  const transform = useMotionTemplate`rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (reduce) return;
    const bounds = panel.current?.getBoundingClientRect();
    if (!bounds) return;
    px.set((event.clientX - bounds.left) / bounds.width - 0.5);
    py.set((event.clientY - bounds.top) / bounds.height - 0.5);
  }

  return (
    <div
      ref={panel}
      onPointerMove={onPointerMove}
      onPointerLeave={() => {
        px.set(0);
        py.set(0);
      }}
      className="pointer-events-auto absolute inset-0"
    >
      <div
        className="absolute inset-x-0 top-16 bottom-56 grid place-items-center"
        style={{ perspective: "87.5rem" }}
      >
        <motion.div
          className="relative h-[21.25rem] w-[28.75rem]"
          style={{ transformStyle: "preserve-3d" }}
          animate={reduce ? undefined : { y: [0, -10, 0] }}
          transition={
            reduce
              ? undefined
              : { duration: 7, repeat: Infinity, ease: "easeInOut" }
          }
        >
          <motion.div
            className="relative h-full w-full"
            style={{
              transformStyle: "preserve-3d",
              transform: reduce ? "rotateX(8deg) rotateY(-12deg)" : transform,
            }}
          >
          <div
            className="absolute left-1/2 top-[78%] h-10 w-64 -translate-x-1/2 rounded-full bg-black/45 blur-2xl"
            style={{ transform: "translateZ(-7.5rem)" }}
          />
          <Sheet
            code="ОФ · в1"
            kicker="Архив"
            title="Предишна версия"
            rows={[
              { name: "Подготовка", meta: "1 бр.", amount: "420" },
              { name: "Изпълнение", meta: "12 м", amount: "1 200" },
            ]}
            total="1 620 EUR"
            className="opacity-70"
            transform="translate(-50%, -50%) translate3d(-8rem, 2.625rem, -5.625rem) rotateZ(-13deg) scale(0.92)"
          />
          <Sheet
            code="ОФ-001"
            kicker="Оферта"
            title="Обхват на работата"
            rows={[
              { name: "Подготовка", meta: "1 бр.", amount: "480" },
              { name: "Изпълнение", meta: "12 м", amount: "1 440" },
              { name: "Довършване", meta: "1 бр.", amount: "480" },
            ]}
            total="2 400 EUR"
            transform="translate(-50%, -50%) translate3d(-2.875rem, 0.375rem, 0) rotateZ(-7deg)"
          />
          <Sheet
            code="ПР-001"
            kicker="Промяна"
            title="Спрямо офертата"
            rows={[{ name: "Допълнителна работа", meta: "+2 дни", amount: "+320" }]}
            total="+320 EUR"
            approved
            transform="translate(-50%, -50%) translate3d(3rem, -1rem, 5rem) rotateZ(8deg)"
          />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
