import type { CSSProperties, ReactNode } from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";

import { COMPANY, TITLE } from "./scenes";
import { color, enter, font, press, progress, typed } from "./theme";
import { Button, Chip, Label, Line, Stamp } from "./ui";

/**
 * The same story on a computer: the company's Pakto in one browser window, the client's mail and
 * portal in another. Every screen keeps the local timing of its phone twin (scenes.tsx), so a click
 * here lands on the same frame as a tap there. Layout is absolute so the cursor path in
 * DesktopClip can aim at buttons by coordinates (the constants below, in content pixels under the
 * title bar).
 */
export const BAR = 44;
export const FIRM_BUTTON = { x: 1116, y: 400 };
export const REVISE_BUTTON = { x: 1180, y: 400 };
export const MAIL_ROW = { x: 560, y: 28 };
export const MAIL_BUTTON = { x: 360, y: 250 };
const PANEL = { left: 584, width: 392 };
const panelX = PANEL.left + PANEL.width / 2;
export const REQUEST_LINK = { x: panelX, y: 350 };
export const REQUEST_OPTION = { x: panelX, y: 206 };
export const REQUEST_COMMENT = { x: panelX, y: 370 };
export const REQUEST_BUTTON = { x: panelX, y: 482 };
export const APPROVE_NAME = { x: panelX, y: 238 };
export const APPROVE_CHECK = { x: PANEL.left + 44, y: 318 };
export const APPROVE_CODE = { x: panelX, y: 418 };
export const APPROVE_DIGITS = { x: panelX, y: 268 };
export const APPROVE_BUTTON = { x: panelX, y: 372 };

/** A browser window: traffic lights, the address, and the page under it. */
export function BrowserWindow({
  url,
  width,
  height,
  children,
  style,
}: {
  url: string;
  width: number;
  height: number;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        position: "absolute",
        width,
        height,
        overflow: "hidden",
        borderRadius: 16,
        background: color.card,
        border: "1px solid rgba(16,43,56,.18)",
        boxShadow:
          "0 50px 110px -40px rgba(16,43,56,.55), 0 2px 0 rgba(255,255,255,.6) inset",
        fontFamily: font.sans,
        color: color.ink,
        ...style,
      }}
    >
      <div
        style={{
          height: BAR,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 16px",
          background: "#ebe4d6",
          borderBottom: "1px solid rgba(16,43,56,.1)",
        }}
      >
        {["#ff6b5f", "#ffbd2e", "#28c940"].map((dot) => (
          <span
            key={dot}
            style={{ width: 12, height: 12, borderRadius: 99, background: dot }}
          />
        ))}
        <span
          style={{
            margin: "0 auto",
            minWidth: width * 0.42,
            padding: "6px 14px",
            borderRadius: 8,
            background: "rgba(255,255,255,.75)",
            fontSize: 13,
            color: color.muted,
            textAlign: "center",
          }}
        >
          🔒 {url}
        </span>
        <span style={{ width: 52 }} />
      </div>
      <div
        style={{ position: "absolute", top: BAR, left: 0, right: 0, bottom: 0 }}
      >
        {children}
      </div>
    </div>
  );
}

function Abs({
  x,
  y,
  w,
  h,
  style,
  children,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Card({
  x,
  y,
  w,
  h,
  style,
  children,
}: {
  x: number;
  y: number;
  w: number;
  h?: number;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <Abs
      x={x}
      y={y}
      w={w}
      h={h}
      style={{
        padding: 22,
        borderRadius: 18,
        background: "#fff",
        border: "1px solid rgba(16,43,56,.12)",
        boxSizing: "border-box",
        ...style,
      }}
    >
      {children}
    </Abs>
  );
}

/** Toast in the corner of a window. */
function Toast({
  frame,
  at,
  children,
  tone = "ink",
}: {
  frame: number;
  at: number;
  children: ReactNode;
  tone?: "ink" | "ok";
}) {
  if (frame < at) return null;
  const p = progress(frame, at, 10);
  return (
    <div
      style={{
        position: "absolute",
        right: 24,
        bottom: 24,
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "14px 18px",
        borderRadius: 14,
        background: tone === "ok" ? "#1e765d" : color.ink,
        color: color.sheet,
        fontSize: 15,
        fontWeight: 700,
        opacity: p,
        transform: `translateY(${(1 - p) * 24}px)`,
      }}
    >
      <span
        style={{
          display: "grid",
          placeItems: "center",
          width: 24,
          height: 24,
          borderRadius: 99,
          background: color.lime,
          color: color.ink,
          fontSize: 13,
        }}
      >
        ✓
      </span>
      {children}
    </div>
  );
}

/** A desktop notification sliding in at the top right of the screen area. */
function Notice({
  frame,
  from,
  to,
  app,
  title,
  body,
}: {
  frame: number;
  from: number;
  to: number;
  app: string;
  title: string;
  body: string;
}) {
  const x = interpolate(
    frame,
    [from, from + 12, to - 10, to],
    [420, 0, 0, 420],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        right: 16,
        zIndex: 40,
        width: 360,
        display: "flex",
        gap: 12,
        padding: 14,
        borderRadius: 16,
        background: "rgba(255,255,255,.96)",
        boxShadow: "0 18px 40px rgba(16,43,56,.25)",
        transform: `translateX(${x}px)`,
      }}
    >
      <span
        style={{
          display: "grid",
          placeItems: "center",
          width: 36,
          height: 36,
          flexShrink: 0,
          borderRadius: 10,
          background: color.coral,
          fontSize: 17,
        }}
      >
        ✉
      </span>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 12, color: color.muted }}>
          {app} · сега
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 700 }}>
          {title}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 13, color: "#35535e" }}>
          {body}
        </p>
      </div>
    </div>
  );
}

function Caret({ frame }: { frame: number }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 2,
        height: "1em",
        marginLeft: 2,
        verticalAlign: "-0.15em",
        background: color.ink,
        opacity: Math.floor(frame / 8) % 2 ? 0 : 1,
      }}
    />
  );
}

/* ───────────────────────── The company's Pakto ───────────────────────── */

const nav = [
  {
    group: "Работа",
    links: ["Работен преглед", "Обекти", "Клиенти", "Оферти"],
  },
  { group: "Финанси", links: ["Плащания"] },
  { group: "Фирма", links: ["Каталог", "Екип", "Настройки"] },
];

/** The workspace chrome from src/app/app/layout.tsx: sidebar card, breadcrumb, content. */
export function FirmShell({
  crumb,
  children,
}: {
  crumb: string;
  children: ReactNode;
}) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "#f7f3ea" }}>
      <Abs
        x={12}
        y={12}
        w={220}
        h={792}
        style={{
          padding: 12,
          boxSizing: "border-box",
          borderRadius: 16,
          background: "#fff",
          border: "1px solid rgba(16,43,56,.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Img
            src={staticFile("pakto-mark.svg")}
            style={{ width: 30, height: 30 }}
          />
          <span style={{ fontSize: 14, fontWeight: 700 }}>{COMPANY}</span>
        </div>
        {nav.map((group) => (
          <div key={group.group} style={{ marginTop: 22 }}>
            <p
              style={{
                margin: "0 0 6px 8px",
                fontSize: 12,
                fontWeight: 700,
                color: color.muted,
              }}
            >
              {group.group}
            </p>
            {group.links.map((link) => (
              <p
                key={link}
                style={{
                  margin: 0,
                  padding: "8px 10px",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: link === "Оферти" ? 700 : 500,
                  background: link === "Оферти" ? color.paper : "transparent",
                }}
              >
                {link}
              </p>
            ))}
          </div>
        ))}
      </Abs>
      <Abs
        x={252}
        y={0}
        w={1096}
        h={60}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 14,
          color: color.muted,
        }}
      >
        <span
          style={{ width: 1, height: 20, background: "rgba(16,43,56,.15)" }}
        />
        {crumb.split(" / ").map((part, index, all) => (
          <span
            key={part}
            style={{
              color: index === all.length - 1 ? color.ink : color.muted,
              fontWeight: index === all.length - 1 ? 700 : 400,
            }}
          >
            {part}
            {index < all.length - 1 ? (
              <span style={{ marginLeft: 10 }}>/</span>
            ) : null}
          </span>
        ))}
      </Abs>
      {children}
    </div>
  );
}

function PageTitle({ title, chip }: { title: string; chip: ReactNode }) {
  return (
    <Abs
      x={252}
      y={66}
      w={1088}
      style={{ display: "flex", alignItems: "center", gap: 14 }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 30,
          fontWeight: 900,
          letterSpacing: "-0.04em",
        }}
      >
        {title}
      </p>
      {chip}
    </Abs>
  );
}

/** Desktop twin of RecordScene: the change typed in, priced and sent. */
export function DeskRecord() {
  const frame = useCurrentFrame();
  const sent = frame >= 168;
  const total = Math.round(
    interpolate(frame, [96, 122], [0, 450], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  return (
    <FirmShell crumb="Обекти / Кухня · Лозенец / Нова промяна">
      <PageTitle
        title="Промяна · ПР-042"
        chip={
          <Chip tone={sent ? "info" : "muted"}>
            {sent ? "ИЗПРАТЕНА" : "ЧЕРНОВА"}
          </Chip>
        }
      />
      <Card x={252} y={130} w={616} h={560}>
        <div style={{ display: "flex", gap: 8, ...enter(frame, 4, 8) }}>
          {["Допълнителна работа", "Намаление", "Само срок"].map(
            (kind, index) => (
              <span
                key={kind}
                style={{
                  padding: "8px 13px",
                  borderRadius: 99,
                  fontSize: 13,
                  fontWeight: 700,
                  background: index === 0 ? color.ink : color.paper,
                  color: index === 0 ? color.sheet : color.muted,
                }}
              >
                {kind}
              </span>
            ),
          )}
        </div>
        <div
          style={{
            marginTop: 16,
            padding: "12px 14px",
            minHeight: 64,
            borderRadius: 12,
            border: "1px solid rgba(16,43,56,.18)",
          }}
        >
          <Label style={{ fontSize: 10 }}>КАКВО СЕ ПРОМЕНЯ</Label>
          <p style={{ margin: "6px 0 0", fontSize: 17, fontWeight: 700 }}>
            {typed(
              "Контактите в кухнята се местят към прозореца.",
              frame,
              12,
              1.6,
            )}
            {frame < 50 ? <Caret frame={frame} /> : null}
          </p>
        </div>
        <div
          style={{
            marginTop: 18,
            display: "flex",
            justifyContent: "space-between",
            ...enter(frame, 50, 8),
          }}
        >
          <Label style={{ fontSize: 10 }}>РЕД</Label>
          <Label style={{ fontSize: 10 }}>СУМА БЕЗ ДДС</Label>
        </div>
        <Line
          label={TITLE}
          detail="3 бр × 85 €"
          sum="255 €"
          style={{ marginTop: 6, ...enter(frame, 54) }}
        />
        <Line
          label="Контакт за хладилника"
          detail="1 бр × 120 €"
          sum="120 €"
          style={enter(frame, 72)}
        />
        <div
          style={{
            marginTop: 18,
            padding: "12px 14px",
            borderRadius: 12,
            border: "1.5px dashed rgba(16,43,56,.25)",
            fontSize: 14,
            ...enter(frame, 120, 10),
          }}
        >
          <b>Вътрешна бележка:</b> кабелът минава през носещата стена.
          <Label style={{ fontSize: 10, marginTop: 4, color: "#e86650" }}>
            КЛИЕНТЪТ НЕ Я ВИЖДА
          </Label>
        </div>
      </Card>
      <Card x={892} y={130} w={448} h={330}>
        <Label style={{ fontSize: 10 }}>ОБЩО С ДДС</Label>
        <p
          style={{
            margin: "6px 0 0",
            fontSize: 56,
            fontWeight: 900,
            letterSpacing: "-0.05em",
          }}
        >
          +{total} €
        </p>
        <div
          style={{
            marginTop: 12,
            fontSize: 15,
            lineHeight: 1.8,
            color: color.muted,
            ...enter(frame, 92, 8),
          }}
        >
          <p style={{ margin: 0 }}>375 € + ДДС 20%</p>
          <p style={{ margin: 0 }}>📅 Краен срок 10.10</p>
          <p style={{ margin: 0 }}>👤 Иван Петров · iv•••@gmail.com</p>
        </div>
      </Card>
      <Abs
        x={FIRM_BUTTON.x - 200}
        y={FIRM_BUTTON.y - 26}
        w={400}
        style={enter(frame, 135, 10)}
      >
        <Button scale={press(frame, 160)}>Изпрати на клиента →</Button>
      </Abs>
      <Toast frame={frame} at={168}>
        Изпратено на Иван Петров · версия 1
      </Toast>
    </FirmShell>
  );
}

/** Desktop twin of FirmWaiting: the sent version, whether the client has seen it, the decision. */
export function DeskFirmStatus({
  version,
  amount,
  seenAt,
  approvedAt,
}: {
  version: number;
  amount: string;
  seenAt?: number;
  approvedAt?: number;
}) {
  const frame = useCurrentFrame();
  const seen = seenAt !== undefined && frame >= seenAt;
  const approved = approvedAt !== undefined && frame >= approvedAt;
  const lines =
    version === 1
      ? [
          { label: TITLE, detail: "3 бр × 85 €", sum: "255 €" },
          {
            label: "Контакт за хладилника",
            detail: "1 бр × 120 €",
            sum: "120 €",
          },
        ]
      : [
          { label: TITLE, detail: "2 бр × 85 €", sum: "170 €" },
          {
            label: "Нова линия за фурната",
            detail: "1 бр × 150 €",
            sum: "150 €",
          },
        ];
  const steps = [
    {
      label: `Версия ${version} е изпратена`,
      detail: version === 1 ? "18.09 · 09:38" : "24.09 · 10:02",
      done: true,
    },
    {
      label: "Клиентът я отвори",
      detail: seen
        ? version === 1
          ? "18.09 · 09:42"
          : "24.09 · 14:29"
        : "още не",
      done: seen,
    },
    {
      label: approved ? "Одобрена с код от имейла" : "Чака решение",
      detail: approved ? "Иван Петров · 24.09 · 14:32" : "",
      done: approved,
    },
  ];
  return (
    <FirmShell crumb="Обекти / Кухня · Лозенец / ПР-042">
      <PageTitle
        title="Промяна · ПР-042"
        chip={
          <Chip tone={approved ? "ok" : "info"}>
            {approved ? "ОДОБРЕНА" : `ИЗПРАТЕНА · ВЕРСИЯ ${version}`}
          </Chip>
        }
      />
      <Card x={252} y={130} w={616}>
        <Label style={{ fontSize: 10 }}>ВЕРСИЯ {version}</Label>
        {lines.map((line) => (
          <Line key={line.label} {...line} style={{ marginTop: 4 }} />
        ))}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            paddingTop: 14,
            borderTop: `1px solid ${color.line}`,
          }}
        >
          <span style={{ fontSize: 14, color: color.muted }}>
            С ДДС · срок {version === 1 ? "10.10" : "16.10"}
          </span>
          <span
            style={{ fontSize: 34, fontWeight: 900, letterSpacing: "-0.05em" }}
          >
            {amount}
          </span>
        </div>
      </Card>
      <Card x={892} y={130} w={448}>
        <Label style={{ fontSize: 10 }}>ХОД</Label>
        <div style={{ marginTop: 16 }}>
          {steps.map((step, index) => (
            <div
              key={index}
              style={{ display: "flex", gap: 14, minHeight: 66 }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    display: "grid",
                    placeItems: "center",
                    width: 28,
                    height: 28,
                    borderRadius: 99,
                    fontSize: 14,
                    fontWeight: 900,
                    background: step.done
                      ? index === 2
                        ? color.okBg
                        : color.ink
                      : "#fff",
                    color: step.done
                      ? index === 2
                        ? color.okText
                        : color.sheet
                      : color.muted,
                    border: step.done
                      ? "none"
                      : "2px dashed rgba(16,43,56,.25)",
                  }}
                >
                  {step.done ? "✓" : ""}
                </span>
                {index < 2 ? (
                  <span
                    style={{
                      flex: 1,
                      width: 2,
                      margin: "4px 0",
                      background: step.done ? color.ink : "rgba(16,43,56,.15)",
                    }}
                  />
                ) : null}
              </div>
              <div>
                <p
                  style={{
                    margin: "3px 0 0",
                    fontSize: 16,
                    fontWeight: 700,
                    color: step.done ? color.ink : color.muted,
                  }}
                >
                  {step.label}
                </p>
                <p
                  style={{
                    margin: "3px 0 0",
                    fontSize: 13,
                    color: color.muted,
                  }}
                >
                  {step.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
      {approvedAt !== undefined ? (
        <Notice
          frame={frame}
          from={approvedAt}
          to={approvedAt + 90}
          app="Pakto"
          title="Иван Петров одобри версия 2"
          body="+384 € с ДДС · потвърдено с код"
        />
      ) : null}
    </FirmShell>
  );
}

/** Desktop twin of ReviseScene: the request comes in, version 2 is written beside the locked v1. */
export function DeskRevise() {
  const frame = useCurrentFrame();
  const sent = frame >= 138;
  return (
    <FirmShell crumb="Обекти / Кухня · Лозенец / ПР-042">
      <Notice
        frame={frame}
        from={2}
        to={60}
        app="Pakto"
        title="Иван Петров поиска промяна"
        body="„Два контакта стигат, без хладилника. И добавете линия за фурната.“"
      />
      <PageTitle
        title="Промяна · ПР-042"
        chip={
          <Chip tone={sent ? "info" : "muted"}>
            {sent ? "ИЗПРАТЕНА · ВЕРСИЯ 2" : "ЧЕРНОВА · ВЕРСИЯ 2"}
          </Chip>
        }
      />
      <Card x={252} y={130} w={218}>
        <Label style={{ fontSize: 10 }}>ВЕРСИИ</Label>
        <div
          style={{
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 12,
            background: color.paper,
            fontSize: 14,
            opacity: interpolate(progress(frame, 50, 14), [0, 1], [1, 0.7]),
          }}
        >
          <b>🔒 Версия 1</b>
          <p style={{ margin: "4px 0 0", color: color.muted, fontSize: 13 }}>
            18.09 · заключена · 450 €
          </p>
        </div>
        <div
          style={{
            marginTop: 8,
            padding: "10px 12px",
            borderRadius: 12,
            border: `1.5px solid ${color.ink}`,
            fontSize: 14,
            ...enter(frame, 58, 12),
          }}
        >
          <b>Версия 2</b>
          <p style={{ margin: "4px 0 0", color: color.muted, fontSize: 13 }}>
            {sent ? "24.09 · изпратена" : "чернова"}
          </p>
        </div>
      </Card>
      <Card x={490} y={130} w={510} style={enter(frame, 58, 24, 14)}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 900 }}>Версия 2</p>
          <Label style={{ fontSize: 10 }}>СПРЯМО V1</Label>
        </div>
        <Line
          mark="changed"
          label={TITLE}
          detail="3 → 2 бр × 85 €"
          sum="170 €"
          was="255 €"
          style={{ marginTop: 8, ...enter(frame, 70) }}
        />
        <Line
          mark="added"
          label="Нова линия за фурната"
          detail="1 бр × 150 €"
          sum="150 €"
          style={enter(frame, 82)}
        />
        <Line
          mark="removed"
          label="Контакт за хладилника"
          detail="махнат по искане на клиента"
          sum="120 €"
          style={enter(frame, 94)}
        />
        <Line
          mark="changed"
          label="Краен срок"
          detail="6 дни повече за фурната"
          sum="16.10"
          was="10.10"
          style={enter(frame, 104)}
        />
      </Card>
      <Card x={1020} y={130} w={320} h={330}>
        <Label style={{ fontSize: 10 }}>ОБЩО С ДДС</Label>
        <p
          style={{
            margin: "6px 0 0",
            fontSize: 50,
            fontWeight: 900,
            letterSpacing: "-0.05em",
            ...enter(frame, 112, 8),
          }}
        >
          +384 €
        </p>
        <p
          style={{
            margin: "6px 0 0",
            fontSize: 14,
            color: color.muted,
            ...enter(frame, 112, 8),
          }}
        >
          беше <s>450 €</s> · срок 16.10
        </p>
      </Card>
      <Abs
        x={REVISE_BUTTON.x - 140}
        y={REVISE_BUTTON.y - 26}
        w={280}
        style={enter(frame, 116, 8)}
      >
        <Button scale={press(frame, 132)}>Изпрати версия 2 →</Button>
      </Abs>
      <Toast frame={frame} at={140}>
        Изпратено на Иван Петров · версия 2
      </Toast>
    </FirmShell>
  );
}

/* ───────────────────────── The client's side ───────────────────────── */

/** Desktop twin of EmailScene: a webmail inbox, the message opened, "Прегледайте". */
export function DeskMail() {
  const frame = useCurrentFrame();
  const open = frame >= 36;
  const mails = [
    {
      from: `${COMPANY} чрез Pakto`,
      line: `Ви изпрати промяна: ${TITLE}`,
      fresh: frame >= 8,
    },
    { from: "Банка", line: "Месечно извлечение за август" },
    { from: "Куриер", line: "Пратката Ви е доставена" },
    { from: "Мебели Дизайн", line: "Оферта за гардероб" },
  ].filter((mail) => mail.fresh !== false);
  return (
    <div style={{ position: "absolute", inset: 0, background: "#fff" }}>
      <Abs
        x={0}
        y={0}
        w={200}
        h={696}
        style={{
          padding: "24px 18px",
          boxSizing: "border-box",
          background: "#f7f3ea",
          fontSize: 14,
          lineHeight: 2.2,
          color: color.muted,
        }}
      >
        <p
          style={{
            margin: "0 0 12px",
            fontSize: 20,
            fontWeight: 900,
            color: color.ink,
          }}
        >
          Поща
        </p>
        <p style={{ margin: 0, fontWeight: 700, color: color.ink }}>Входящи</p>
        <p style={{ margin: 0 }}>Изпратени</p>
        <p style={{ margin: 0 }}>Чернови</p>
      </Abs>
      {!open ? (
        <Abs x={200} y={0} w={800}>
          {mails.map((mail, index) => (
            <div
              key={mail.from}
              style={{
                display: "flex",
                gap: 18,
                padding: "18px 24px",
                borderBottom: `1px solid ${color.line}`,
                fontSize: 15,
                background:
                  index === 0 && frame >= 8
                    ? "rgba(255,118,95,.08)"
                    : "transparent",
                ...(index === 0 ? enter(frame, 8, 12) : {}),
              }}
            >
              <span style={{ width: 230, fontWeight: index === 0 ? 900 : 400 }}>
                {index === 0 ? (
                  <span style={{ color: color.coral }}>● </span>
                ) : null}
                {mail.from}
              </span>
              <span style={{ color: color.muted }}>{mail.line}</span>
            </div>
          ))}
        </Abs>
      ) : (
        <Abs
          x={200}
          y={0}
          w={800}
          style={{
            padding: "26px 40px",
            boxSizing: "border-box",
            ...enter(frame, 36, 10),
          }}
        >
          <Label style={{ fontSize: 11 }}>
            ОТ: {COMPANY.toUpperCase()} ЧРЕЗ PAKTO
          </Label>
          <p
            style={{
              margin: "10px 0 0",
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: "-0.03em",
            }}
          >
            {COMPANY} Ви изпрати промяна: {TITLE}
          </p>
          <p
            style={{
              margin: "22px 0 0",
              fontSize: 16,
              lineHeight: 1.6,
              color: "#284955",
            }}
          >
            Здравейте, Иван Петров!
            <br />
            {COMPANY} Ви изпрати промяна „{TITLE}“ (версия 1).
          </p>
        </Abs>
      )}
      {open ? (
        <>
          <Abs
            x={MAIL_BUTTON.x - 120}
            y={MAIL_BUTTON.y - 26}
            w={240}
            style={enter(frame, 40, 10)}
          >
            <Button scale={press(frame, 96)}>Прегледайте</Button>
          </Abs>
          <Abs
            x={240}
            y={300}
            w={600}
            style={{
              fontSize: 14,
              lineHeight: 1.5,
              color: color.muted,
              ...enter(frame, 44, 10),
            }}
          >
            Решението се потвърждава с еднократен код, който получавате само Вие
            на този имейл.
          </Abs>
        </>
      ) : null}
    </div>
  );
}

function PortalTop({ version }: { version: number }) {
  return (
    <Abs
      x={0}
      y={0}
      w={1000}
      h={96}
      style={{
        padding: "18px 24px",
        boxSizing: "border-box",
        borderBottom: `1px solid ${color.line}`,
        background: "#fff",
      }}
    >
      <Label style={{ fontSize: 11 }}>
        🔒 {COMPANY.toUpperCase()} · КУХНЯ · ЛОЗЕНЕЦ
      </Label>
      <div
        style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 12 }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 26,
            fontWeight: 900,
            letterSpacing: "-0.04em",
          }}
        >
          {TITLE}
        </p>
        <Chip tone="info">ВЕРСИЯ {version}</Chip>
      </div>
    </Abs>
  );
}

/** The portal page: the document on the left, the decision on the right (PortalDocumentLayout). */
function Portal({
  version,
  doc,
  children,
}: {
  version: number;
  doc: ReactNode;
  children: ReactNode;
}) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "#f7f3ea" }}>
      <PortalTop version={version} />
      <Card x={24} y={120} w={536}>
        {doc}
      </Card>
      <Card x={PANEL.left} y={120} w={PANEL.width} h={420}>
        {children}
      </Card>
    </div>
  );
}

const v1Doc = (
  <>
    <Label style={{ fontSize: 10 }}>КАКВО ОДОБРЯВАТЕ</Label>
    <Line
      label={TITLE}
      detail="3 бр × 85 €"
      sum="255 €"
      style={{ marginTop: 8 }}
    />
    <Line label="Контакт за хладилника" detail="1 бр × 120 €" sum="120 €" />
    <p
      style={{
        margin: 0,
        paddingTop: 12,
        borderTop: `1px solid ${color.line}`,
        fontSize: 14,
        color: color.muted,
      }}
    >
      Краен срок 10.10 · сумите са без ДДС
    </p>
  </>
);

/** Desktop twin of RequestScene. */
export function DeskRequest() {
  const frame = useCurrentFrame();
  const objecting = frame >= 44;
  return (
    <Portal version={1} doc={v1Doc}>
      {objecting ? (
        <div style={{ position: "absolute", inset: 22 }}>
          <p
            style={{
              margin: 0,
              fontSize: 19,
              fontWeight: 700,
              ...enter(frame, 46, 8),
            }}
          >
            Как искате да продължим?
          </p>
          {[
            {
              title: "Искам промяна",
              hint: "Фирмата ще изпрати нова версия",
              y: REQUEST_OPTION.y - 120 - 22 - 30,
              selected: frame >= 60,
            },
            {
              title: "Отказвам",
              hint: "Офертата се затваря без работа по нея",
              y: REQUEST_OPTION.y - 120 - 22 + 40,
              selected: false,
            },
          ].map((option, index) => (
            <div
              key={option.title}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: option.y,
                height: 60,
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                padding: "0 14px",
                borderRadius: 12,
                border: option.selected
                  ? `2px solid ${color.ink}`
                  : "1px solid rgba(16,43,56,.15)",
                ...enter(frame, 50 + index * 4, 8),
              }}
            >
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 15,
                    fontWeight: 700,
                    color: index ? "#c2412d" : color.ink,
                  }}
                >
                  {option.title}
                </p>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: 12,
                    color: color.muted,
                  }}
                >
                  {option.hint}
                </p>
              </div>
              <span
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 20,
                  height: 20,
                  borderRadius: 99,
                  border: `2px solid ${option.selected ? color.ink : "rgba(16,43,56,.25)"}`,
                }}
              >
                {option.selected ? (
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 99,
                      background: color.ink,
                    }}
                  />
                ) : null}
              </span>
            </div>
          ))}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: REQUEST_COMMENT.y - 142 - 40,
              height: 80,
              padding: "10px 14px",
              boxSizing: "border-box",
              borderRadius: 12,
              border: "1px solid rgba(16,43,56,.2)",
              fontSize: 15,
              lineHeight: 1.4,
              ...enter(frame, 64, 8),
            }}
          >
            {typed(
              "Два контакта стигат, без хладилника. И добавете линия за фурната.",
              frame,
              70,
              1.3,
            )}
            {frame >= 70 && frame < 125 ? <Caret frame={frame} /> : null}
          </div>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: REQUEST_BUTTON.y - 142 - 26,
            }}
          >
            <Button scale={press(frame, 146)}>Изпратете ми код</Button>
          </div>
        </div>
      ) : (
        <>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Одобрявате</p>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 44,
              fontWeight: 700,
              letterSpacing: "-0.03em",
            }}
          >
            450,00 €
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 14, color: color.muted }}>
            с ДДС · срок 10.10
          </p>
          <div style={{ marginTop: 24 }}>
            <Button style={{ background: "#1e765d" }}>Одобрявам</Button>
          </div>
          <p
            style={{
              position: "absolute",
              left: 22,
              right: 22,
              top: REQUEST_LINK.y - 120 - 12,
              margin: 0,
              fontSize: 15,
              textAlign: "center",
              textDecoration: "underline",
              fontWeight: frame >= 30 ? 700 : 400,
            }}
          >
            Не сте съгласни? Поискайте промяна
          </p>
        </>
      )}
      <Toast frame={frame} at={156}>
        Искането е изпратено на {COMPANY}
      </Toast>
    </Portal>
  );
}

/** Between the request and version 2. */
export function DeskClientWaiting() {
  return (
    <Portal version={1} doc={v1Doc}>
      <p style={{ margin: 0, fontSize: 30 }}>⏳</p>
      <p
        style={{
          margin: "10px 0 0",
          fontSize: 22,
          fontWeight: 900,
          letterSpacing: "-0.03em",
        }}
      >
        Искането е изпратено
      </p>
      <p
        style={{
          margin: "8px 0 0",
          fontSize: 15,
          lineHeight: 1.5,
          color: "#284955",
        }}
      >
        {COMPANY} подготвя нова версия. Ще получите имейл, щом е готова.
      </p>
      <div
        style={{
          marginTop: 16,
          padding: "12px 14px",
          borderRadius: 12,
          background: color.paper,
          fontSize: 14,
          lineHeight: 1.45,
        }}
      >
        <Label style={{ fontSize: 10 }}>ВАШИЯТ КОМЕНТАР</Label>
        <p style={{ margin: "6px 0 0" }}>
          „Два контакта стигат, без хладилника. И добавете линия за фурната.“
        </p>
      </div>
    </Portal>
  );
}

const v2Doc = (
  <>
    <Label style={{ fontSize: 10 }}>КАКВО СЕ ПРОМЕНИ СПРЯМО V1</Label>
    <Line
      mark="changed"
      label={TITLE}
      detail="3 → 2 бр × 85 €"
      sum="170 €"
      was="255 €"
      style={{ marginTop: 8 }}
    />
    <Line
      mark="added"
      label="Нова линия за фурната"
      detail="1 бр × 150 €"
      sum="150 €"
    />
    <Line
      mark="removed"
      label="Контакт за хладилника"
      detail="махнат"
      sum="120 €"
    />
    <Line
      mark="changed"
      label="Краен срок"
      detail="6 дни повече"
      sum="16.10"
      was="10.10"
    />
  </>
);

/** Desktop twin of ApproveScene. */
export function DeskApprove() {
  const frame = useCurrentFrame();
  const coding = frame >= 132;
  const filled = Math.max(0, Math.min(6, Math.floor((frame - 162) / 5)));
  const top = (y: number) => y - 120 - 22;
  return (
    <Portal version={2} doc={v2Doc}>
      <Notice
        frame={frame}
        from={2}
        to={50}
        app="Поща"
        title={`${COMPANY} обнови промяна: ${TITLE}`}
        body="Какво се промени: Сума 450,00 → 384,00 €"
      />
      <div style={{ position: "absolute", inset: 22 }}>
        {coding ? (
          <>
            <p style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>
              ✉ Въведете кода от имейла
            </p>
            <p
              style={{
                margin: "8px 0 0",
                fontSize: 14,
                lineHeight: 1.45,
                color: color.muted,
              }}
            >
              Изпратихме 6-цифрен код на iv•••@gmail.com. Кодът е само за вас.
            </p>
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: top(APPROVE_DIGITS.y) - 29,
                display: "flex",
                gap: 8,
                justifyContent: "center",
              }}
            >
              {"482913".split("").map((digit, index) => (
                <span
                  key={index}
                  style={{
                    display: "grid",
                    placeItems: "center",
                    width: 44,
                    height: 58,
                    marginRight: index === 2 ? 10 : 0,
                    borderRadius: 12,
                    border: `2px solid ${index < filled ? color.ink : "rgba(16,43,56,.2)"}`,
                    fontFamily: font.mono,
                    fontSize: 24,
                    fontWeight: 700,
                  }}
                >
                  {index < filled ? digit : ""}
                </span>
              ))}
            </div>
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: top(APPROVE_BUTTON.y) - 26,
              }}
            >
              <Button
                scale={press(frame, 214)}
                style={{ background: "#1e765d" }}
              >
                Одобрявам · 384,00 €
              </Button>
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <p style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
                Одобрявате версия 2
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 30,
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                }}
              >
                384,00 €
              </p>
            </div>
            <p
              style={{
                position: "absolute",
                top: top(APPROVE_NAME.y) - 50,
                margin: 0,
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              Вашето име и фамилия
            </p>
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: top(APPROVE_NAME.y) - 24,
                height: 48,
                boxSizing: "border-box",
                padding: "0 14px",
                display: "flex",
                alignItems: "center",
                borderRadius: 12,
                border: "1px solid rgba(16,43,56,.25)",
                fontSize: 17,
                fontWeight: 700,
              }}
            >
              {typed("Иван Петров", frame, 74, 0.9)}
              {frame >= 74 && frame < 100 ? <Caret frame={frame} /> : null}
            </div>
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: top(APPROVE_CHECK.y) - 22,
                display: "flex",
                gap: 10,
                padding: 12,
                borderRadius: 12,
                background: "rgba(16,43,56,.05)",
                fontSize: 13,
                lineHeight: 1.45,
              }}
            >
              <span
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 20,
                  height: 20,
                  flexShrink: 0,
                  borderRadius: 5,
                  background: frame >= 104 ? color.ink : "#fff",
                  border: `2px solid ${color.ink}`,
                  color: "#fff",
                  fontSize: 13,
                }}
              >
                {frame >= 104 ? "✓" : ""}
              </span>
              <span>
                Одобрявам версия 2 за <b>384,00 €</b>: точно това съдържание и
                крайната сума.
              </span>
            </div>
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: top(APPROVE_CODE.y) - 26,
              }}
            >
              <Button scale={press(frame, 122)}>Изпратете ми код</Button>
            </div>
          </>
        )}
      </div>
      <Notice
        frame={frame}
        from={140}
        to={190}
        app="Поща"
        title="Код за потвърждаване на решението Ви: 482913"
        body="Валиден е 10 минути."
      />
    </Portal>
  );
}

/** Desktop twin of SealScene: the decision recorded, and the seal. */
export function DeskSealed() {
  const frame = useCurrentFrame();
  const land = interpolate(frame, [8, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <Portal version={2} doc={v2Doc}>
      <span
        style={{
          display: "grid",
          placeItems: "center",
          width: 56,
          height: 56,
          borderRadius: 99,
          background: color.okBg,
          color: color.okText,
          fontSize: 28,
          fontWeight: 900,
        }}
      >
        ✓
      </span>
      <p
        style={{
          margin: "14px 0 0",
          fontSize: 26,
          fontWeight: 900,
          letterSpacing: "-0.04em",
        }}
      >
        Решението е записано
      </p>
      <p
        style={{
          margin: "8px 0 0",
          fontSize: 15,
          lineHeight: 1.5,
          color: "#284955",
        }}
      >
        Одобрихте версия 2 за 384,00 €. Разписката е в имейла ви.
      </p>
      <div
        style={{
          marginTop: 16,
          padding: 14,
          borderRadius: 14,
          background: color.paper,
          fontFamily: font.mono,
          fontSize: 12,
          lineHeight: 1.8,
          color: color.muted,
        }}
      >
        <p style={{ margin: 0 }}>ИВАН ПЕТРОВ · 24.09.2026 · 14:32</p>
        <p style={{ margin: 0 }}>КОД ДО IV•••@GMAIL.COM ✓</p>
        <p style={{ margin: 0 }}>ОТПЕЧАТЪК 3f9a8c…dc21e</p>
      </div>
      <div
        style={{
          position: "absolute",
          right: 26,
          bottom: 26,
          opacity: land,
          transform: `scale(${interpolate(land, [0, 1], [1.8, 1])})`,
        }}
      >
        <Stamp />
      </div>
    </Portal>
  );
}
