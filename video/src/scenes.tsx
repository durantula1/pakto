import type { ReactNode } from "react";
import { interpolate, useCurrentFrame } from "remotion";

import { color, enter, font, press, progress, typed } from "./theme";
import { Tap } from "./camera";
import { Banner, Button, Chip, Label, Line, Stamp } from "./ui";

export const COMPANY = "Студио Кухни";
export const TITLE = "Преместване на контакти";

/** A Pakto screen for the company: breadcrumb, title and status, like the app's document header. */
function AppHeader({
  crumb,
  title,
  status,
}: {
  crumb: string;
  title: string;
  status: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 20px 14px",
        borderBottom: `1px solid ${color.line}`,
        background: "rgba(244,239,228,.7)",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <Label style={{ fontSize: 10 }}>{crumb}</Label>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 18,
            fontWeight: 900,
            letterSpacing: "-0.03em",
          }}
        >
          {title}
        </p>
      </div>
      {status}
    </div>
  );
}

/** The client's portal header: who sent it, for which project, and which version this is. */
function PortalHeader({ version }: { version: number }) {
  return (
    <div
      style={{
        padding: "10px 20px 16px",
        borderBottom: `1px solid ${color.line}`,
      }}
    >
      <Label style={{ fontSize: 10 }}>
        🔒 {COMPANY.toUpperCase()} · КУХНЯ · ЛОЗЕНЕЦ
      </Label>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 8,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: "-0.04em",
          }}
        >
          {TITLE}
        </p>
        <Chip tone="info">ВЕРСИЯ {version}</Chip>
      </div>
    </div>
  );
}

function Sheet({ children, top }: { children: ReactNode; top: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        top,
        padding: "22px 20px",
        borderRadius: "26px 26px 0 0",
        background: "#fff",
        boxShadow: "0 -18px 40px rgba(16,43,56,.12)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {children}
    </div>
  );
}

function Toast({
  frame,
  at,
  children,
}: {
  frame: number;
  at: number;
  children: ReactNode;
}) {
  const p = progress(frame, at, 10);
  return (
    <div
      style={{
        position: "absolute",
        left: 20,
        right: 20,
        bottom: 26,
        zIndex: 30,
        padding: "14px 16px",
        borderRadius: 16,
        background: color.ink,
        color: color.sheet,
        fontSize: 15,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        gap: 10,
        opacity: p,
        transform: `translateY(${(1 - p) * 30}px)`,
      }}
    >
      <span
        style={{
          display: "grid",
          placeItems: "center",
          width: 26,
          height: 26,
          borderRadius: 99,
          background: color.lime,
          color: color.ink,
          fontSize: 14,
        }}
      >
        ✓
      </span>
      {children}
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

// Where the fingertip lands, in screen coordinates under the status bar (checked on stills).
const EMAIL_BUTTON_Y = 300;
const REQUEST_LINK_Y = 597;
const REQUEST_OPTION_Y = 340;
const REQUEST_BUTTON_Y = 593;
const APPROVE_CHECK_Y = 612;
const APPROVE_CODE_Y = 700;
const APPROVE_BUTTON_Y = 575;

/** 1. The way it goes today: a quick "yes" in a chat, with the price left for later. */
export function ChatScene() {
  const frame = useCurrentFrame();
  const strike = interpolate(frame, [68, 92], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bubble = {
    maxWidth: 280,
    padding: "12px 15px",
    borderRadius: 20,
    fontSize: 17,
    lineHeight: 1.35,
  } as const;

  return (
    <div style={{ height: "100%", background: "#ece6da" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 18px 14px",
          background: color.card,
          borderBottom: `1px solid ${color.line}`,
        }}
      >
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: 40,
            height: 40,
            borderRadius: 99,
            background: color.sky,
            fontWeight: 900,
            fontSize: 15,
          }}
        >
          ИП
        </span>
        <div>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
            Иван Петров
          </p>
          <p style={{ margin: 0, fontSize: 13, color: color.muted }}>
            клиент · кухня в Лозенец
          </p>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: "26px 16px",
        }}
      >
        <div
          style={{
            ...bubble,
            alignSelf: "flex-start",
            background: "#fff",
            ...enter(frame, 6),
          }}
        >
          Може ли да преместим контактите до прозореца? И един за хладилника.
          <span
            style={{
              display: "block",
              marginTop: 4,
              fontSize: 12,
              color: color.muted,
              textAlign: "right",
            }}
          >
            10:12
          </span>
        </div>
        <div
          style={{
            ...bubble,
            alignSelf: "flex-end",
            background: color.sky,
            position: "relative",
            ...enter(frame, 34),
          }}
        >
          <span style={{ position: "relative" }}>
            Става, после ще сметнем.
            <span
              style={{
                position: "absolute",
                left: 0,
                top: "52%",
                height: 3,
                width: `${strike}%`,
                background: color.coral,
                borderRadius: 3,
              }}
            />
          </span>
          <span
            style={{
              display: "block",
              marginTop: 4,
              fontSize: 12,
              color: color.muted,
              textAlign: "right",
            }}
          >
            10:14 ✓✓
          </span>
        </div>
        {/* Three weeks later, the price nobody wrote down. */}
        <p
          style={{
            alignSelf: "center",
            margin: "10px 0 0",
            padding: "5px 12px",
            borderRadius: 99,
            background: "rgba(16,43,56,.08)",
            fontSize: 12,
            color: color.muted,
            ...enter(frame, 94, 8),
          }}
        >
          3 седмици по-късно
        </p>
        <div
          style={{
            ...bubble,
            alignSelf: "flex-start",
            background: "#fff",
            ...enter(frame, 100),
          }}
        >
          Защо 450 €? Не сме се разбрали така.
          <span
            style={{
              display: "block",
              marginTop: 4,
              fontSize: 12,
              color: color.muted,
              textAlign: "right",
            }}
          >
            18:40
          </span>
        </div>
      </div>
    </div>
  );
}

/** 2. The company records the change on site, with price and deadline, and sends it. */
export function RecordScene() {
  const frame = useCurrentFrame();
  const sent = frame >= 168;
  const total = Math.round(
    interpolate(frame, [96, 122], [0, 450], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

  return (
    <div style={{ height: "100%", position: "relative" }}>
      <AppHeader
        crumb="ОБЕКТ / КУХНЯ · ЛОЗЕНЕЦ"
        title="Бърза промяна · ПР-042"
        status={
          <Chip tone={sent ? "info" : "muted"}>
            {sent ? "ИЗПРАТЕНА" : "ЧЕРНОВА"}
          </Chip>
        }
      />
      <div style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", gap: 6, ...enter(frame, 4, 8) }}>
          {["Допълнителна работа", "Намаление", "Само срок"].map(
            (kind, index) => (
              <span
                key={kind}
                style={{
                  padding: "7px 11px",
                  borderRadius: 99,
                  fontSize: 12,
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
            marginTop: 14,
            padding: "12px 14px",
            minHeight: 70,
            borderRadius: 14,
            border: `1px solid rgba(16,43,56,.15)`,
            background: "#fff",
          }}
        >
          <Label style={{ fontSize: 10 }}>КАКВО СЕ ПРОМЕНЯ</Label>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 16,
              fontWeight: 700,
              lineHeight: 1.35,
            }}
          >
            {typed(
              "Контактите в кухнята се местят към прозореца.",
              frame,
              12,
              1.6,
            )}
            {frame < 50 ? <Caret frame={frame} /> : null}
          </p>
        </div>
        <div style={{ marginTop: 10 }}>
          <Line
            label={TITLE}
            detail="3 бр × 85 €"
            sum="255 €"
            style={enter(frame, 54)}
          />
          <Line
            label="Контакт за хладилника"
            detail="1 бр × 120 €"
            sum="120 €"
            style={enter(frame, 72)}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            paddingTop: 14,
            borderTop: `1px solid ${color.line}`,
            ...enter(frame, 92, 8),
          }}
        >
          <div style={{ fontSize: 13, color: color.muted, lineHeight: 1.6 }}>
            <p style={{ margin: 0 }}>375 € + ДДС 20%</p>
            <p style={{ margin: 0 }}>📅 Краен срок 10.10</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <Label style={{ fontSize: 10 }}>С ДДС</Label>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: 34,
                fontWeight: 900,
                letterSpacing: "-0.05em",
              }}
            >
              +{total} €
            </p>
          </div>
        </div>
        <div
          style={{
            marginTop: 16,
            padding: "12px 14px",
            borderRadius: 14,
            border: `1.5px dashed rgba(16,43,56,.25)`,
            fontSize: 14,
            lineHeight: 1.4,
            ...enter(frame, 120, 10),
          }}
        >
          <b>Вътрешна бележка:</b> кабелът минава през носещата стена.
          <Label style={{ fontSize: 10, marginTop: 4, color: "#e86650" }}>
            КЛИЕНТЪТ НЕ Я ВИЖДА
          </Label>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 20,
          right: 20,
          bottom: 26,
          ...enter(frame, 135, 10),
        }}
      >
        <Button scale={press(frame, 160)}>Изпрати на клиента →</Button>
      </div>
      <Tap at={160} x={230} y={704} />
      {frame >= 168 ? (
        <Toast frame={frame} at={168}>
          Изпратено на Иван Петров · версия 1
        </Toast>
      ) : null}
    </div>
  );
}

/** 3. The client's inbox: a link, and a line on how the decision will be confirmed. */
export function EmailScene() {
  const frame = useCurrentFrame();
  const banner = interpolate(frame, [4, 16, 34, 42], [-140, 0, 0, -140], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ height: "100%", position: "relative", background: "#fff" }}>
      <Banner
        app="Поща"
        title={`${COMPANY} чрез Pakto`}
        body={`${COMPANY} Ви изпрати промяна: ${TITLE}`}
        style={{ transform: `translateY(${banner}px)` }}
      />
      {/* The inbox the banner lands on, until the message opens. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: "112px 22px 0",
          opacity: 1 - progress(frame, 34, 8),
        }}
      >
        <p
          style={{
            margin: "0 0 14px",
            fontSize: 30,
            fontWeight: 900,
            letterSpacing: "-0.04em",
          }}
        >
          Входящи
        </p>
        {[
          {
            from: `${COMPANY} чрез Pakto`,
            line: `Ви изпрати промяна: ${TITLE}`,
            fresh: true,
          },
          { from: "Банка", line: "Месечно извлечение за август" },
          { from: "Куриер", line: "Пратката Ви е доставена" },
          { from: "Мебели Дизайн", line: "Оферта за гардероб" },
        ].map((mail) => (
          <div
            key={mail.from}
            style={{
              padding: "12px 0",
              borderBottom: `1px solid ${color.line}`,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: mail.fresh ? 900 : 400,
              }}
            >
              {mail.fresh ? (
                <span style={{ color: color.coral }}>● </span>
              ) : null}
              {mail.from}
            </p>
            <p style={{ margin: "3px 0 0", fontSize: 14, color: color.muted }}>
              {mail.line}
            </p>
          </div>
        ))}
      </div>
      <div style={{ padding: "16px 22px", ...enter(frame, 36, 12) }}>
        <Label style={{ fontSize: 10 }}>
          ОТ: {COMPANY.toUpperCase()} ЧРЕЗ PAKTO
        </Label>
        <p
          style={{
            margin: "10px 0 0",
            fontSize: 21,
            fontWeight: 900,
            letterSpacing: "-0.03em",
            lineHeight: 1.2,
          }}
        >
          {COMPANY} Ви изпрати промяна: {TITLE}
        </p>
        <div
          style={{
            marginTop: 22,
            fontSize: 16,
            lineHeight: 1.5,
            color: "#284955",
          }}
        >
          <p style={{ margin: 0 }}>Здравейте, Иван Петров!</p>
          <p style={{ margin: "12px 0 0" }}>
            {COMPANY} Ви изпрати промяна „{TITLE}“ (версия 1).
          </p>
        </div>
        <div style={{ marginTop: 22 }}>
          <Button scale={press(frame, 96)}>Прегледайте</Button>
        </div>
        <Tap at={96} x={180} y={EMAIL_BUTTON_Y} />
        <p
          style={{
            margin: "18px 0 0",
            fontSize: 14,
            lineHeight: 1.5,
            color: color.muted,
          }}
        >
          Решението се потвърждава с еднократен код, който получавате само Вие
          на този имейл.
        </p>
      </div>
    </div>
  );
}

/** 4. In the portal the client sees version 1, disagrees and asks for a change. */
export function RequestScene() {
  const frame = useCurrentFrame();
  const objecting = frame >= 44;
  const sheetTop = interpolate(frame, [44, 58], [470, 250], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const comment =
    "Два контакта стигат, без хладилника. И добавете линия за фурната.";

  return (
    <div style={{ height: "100%", position: "relative" }}>
      <PortalHeader version={1} />
      <div style={{ padding: "4px 20px" }}>
        <Line label={TITLE} detail="3 бр × 85 €" sum="255 €" />
        <Line label="Контакт за хладилника" detail="1 бр × 120 €" sum="120 €" />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            paddingTop: 12,
            borderTop: `1px solid ${color.line}`,
          }}
        >
          <span style={{ fontSize: 13, color: color.muted }}>
            Краен срок 10.10
          </span>
          <span style={{ fontSize: 13, color: color.muted }}>с ДДС</span>
        </div>
      </div>
      <Sheet top={sheetTop}>
        {objecting ? (
          <>
            <div style={enter(frame, 46, 8)}>
              <p style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>
                Как искате да продължим?
              </p>
            </div>
            {[
              {
                title: "Искам промяна",
                hint: "Фирмата ще изпрати нова версия",
                selected: frame >= 60,
              },
              {
                title: "Отказвам",
                hint: "Офертата се затваря без работа по нея",
                selected: false,
              },
            ].map((option, index) => (
              <div
                key={option.title}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: option.selected
                    ? `2px solid ${color.ink}`
                    : `1px solid rgba(16,43,56,.15)`,
                  ...enter(frame, 50 + index * 4, 8),
                }}
              >
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 16,
                      fontWeight: 700,
                      color: index ? "#c2412d" : color.ink,
                    }}
                  >
                    {option.title}
                  </p>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: 13,
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
                    width: 22,
                    height: 22,
                    borderRadius: 99,
                    border: `2px solid ${option.selected ? color.ink : "rgba(16,43,56,.25)"}`,
                  }}
                >
                  {option.selected ? (
                    <span
                      style={{
                        width: 11,
                        height: 11,
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
                minHeight: 84,
                padding: "12px 14px",
                borderRadius: 14,
                border: `1px solid rgba(16,43,56,.2)`,
                fontSize: 16,
                lineHeight: 1.4,
                ...enter(frame, 64, 8),
              }}
            >
              {typed(comment, frame, 70, 1.3)}
              {frame >= 70 && frame < 125 ? <Caret frame={frame} /> : null}
            </div>
            <Button scale={press(frame, 146)}>Изпрати ми код</Button>
          </>
        ) : (
          <>
            <p style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>
              Одобрявате
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 36,
                fontWeight: 700,
                letterSpacing: "-0.03em",
              }}
            >
              450,00 €
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 15,
                textDecoration: "underline",
                color: frame >= 30 ? color.ink : color.muted,
                fontWeight: frame >= 30 ? 700 : 400,
              }}
            >
              Не сте съгласни? Поискайте промяна или откажете
            </p>
          </>
        )}
      </Sheet>
      <Tap at={30} x={200} y={REQUEST_LINK_Y} />
      <Tap at={60} x={250} y={REQUEST_OPTION_Y} />
      <Tap at={146} x={210} y={REQUEST_BUTTON_Y} />
      {frame >= 156 ? (
        <Toast frame={frame} at={156}>
          Искането е изпратено на {COMPANY}
        </Toast>
      ) : null}
    </div>
  );
}

/** 5. The company gets the request and sends version 2; version 1 stays locked behind it. */
export function ReviseScene() {
  const frame = useCurrentFrame();
  const banner = interpolate(frame, [2, 14, 40, 50], [-160, 0, 0, -160], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const back = progress(frame, 50, 14);
  const sent = frame >= 138;

  return (
    <div style={{ height: "100%", position: "relative" }}>
      <Banner
        app="Pakto"
        title="Иван Петров поиска промяна"
        body="„Два контакта стигат, без хладилника. И добавете линия за фурната.“"
        style={{ transform: `translateY(${banner}px)` }}
      />
      <AppHeader
        crumb="ОБЕКТ / КУХНЯ · ЛОЗЕНЕЦ"
        title="Промяна · ПР-042"
        status={
          <Chip tone={sent ? "info" : "muted"}>
            {sent ? "ИЗПРАТЕНА" : "ЧЕРНОВА"}
          </Chip>
        }
      />
      <div style={{ position: "relative", padding: "16px 16px 0" }}>
        {/* Version 1: sent, locked, and kept. */}
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 16,
            background: color.paper,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 14,
            opacity: interpolate(back, [0, 1], [1, 0.75]),
            transform: `scale(${interpolate(back, [0, 1], [1, 0.94])})`,
          }}
        >
          <span style={{ fontWeight: 700 }}>🔒 Версия 1 · 18.09</span>
          <span style={{ fontFamily: font.mono, color: color.muted }}>
            заключена · <s>450 €</s>
          </span>
        </div>
        {/* Version 2: the correction, with what changed. */}
        <div
          style={{
            marginTop: 10,
            padding: "14px 18px 6px",
            borderRadius: 18,
            background: "#fff",
            border: `1.5px solid ${color.ink}`,
            ...enter(frame, 58, 30, 14),
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <p style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>Версия 2</p>
            <Label style={{ fontSize: 10 }}>СПРЯМО V1</Label>
          </div>
          <Line
            mark="changed"
            label={TITLE}
            detail="3 → 2 бр × 85 €"
            sum="170 €"
            was="255 €"
            style={enter(frame, 70)}
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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              padding: "12px 0",
              borderTop: `1px solid ${color.line}`,
              ...enter(frame, 112, 8),
            }}
          >
            <span style={{ fontSize: 13, color: color.muted }}>
              С ДДС · беше <s>450 €</s>
            </span>
            <span
              style={{
                fontSize: 30,
                fontWeight: 900,
                letterSpacing: "-0.05em",
              }}
            >
              +384 €
            </span>
          </div>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 20,
          right: 20,
          bottom: 26,
          ...enter(frame, 116, 8),
        }}
      >
        <Button scale={press(frame, 132)}>Изпрати версия 2 →</Button>
      </div>
      <Tap at={132} x={220} y={704} />
    </div>
  );
}

/** 6. The client sees exactly what changed, signs with a name and confirms with the emailed code. */
export function ApproveScene() {
  const frame = useCurrentFrame();
  const mail = interpolate(frame, [2, 14, 40, 50], [-160, 0, 0, -160], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const codeMail = interpolate(
    frame,
    [140, 152, 176, 186],
    [-160, 0, 0, -160],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const coding = frame >= 132;
  const digits = "482913";
  const filled = Math.max(0, Math.min(6, Math.floor((frame - 162) / 5)));
  const name = typed("Иван Петров", frame, 74, 0.9);

  return (
    <div style={{ height: "100%", position: "relative" }}>
      <Banner
        app="Поща"
        title={`${COMPANY} обнови промяна: ${TITLE}`}
        body="Какво се промени: Сума 450,00 → 384,00 €"
        style={{ transform: `translateY(${mail}px)` }}
      />
      <Banner
        app="Поща"
        title="Код за потвърждаване на решението Ви: 482913"
        body="Валиден е 10 минути."
        style={{ transform: `translateY(${codeMail}px)` }}
      />
      <PortalHeader version={2} />
      <div style={{ padding: "4px 20px" }}>
        <Label style={{ fontSize: 10, marginTop: 10 }}>
          КАКВО СЕ ПРОМЕНИ СПРЯМО V1
        </Label>
        <Line
          mark="changed"
          label={TITLE}
          detail="3 → 2 бр × 85 €"
          sum="170 €"
          was="255 €"
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
      </div>
      <Sheet
        top={interpolate(frame, [50, 62, 130, 142], [800, 430, 430, 330], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })}
      >
        {coding ? (
          <>
            <p style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>
              ✉ Въведете кода от имейла
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                lineHeight: 1.45,
                color: color.muted,
              }}
            >
              Изпратихме 6-цифрен код на iv•••@gmail.com. Кодът е само за вас,
              фирмата не го вижда.
            </p>
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "center",
                margin: "6px 0",
              }}
            >
              {digits.split("").map((digit, index) => (
                <span
                  key={index}
                  style={{
                    display: "grid",
                    placeItems: "center",
                    width: 46,
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
            <Button scale={press(frame, 214)} style={{ background: "#1e765d" }}>
              Одобрявам · 384,00 €
            </Button>
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
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
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
            <div>
              <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700 }}>
                Вашето име и фамилия
              </p>
              <div
                style={{
                  height: 48,
                  padding: "0 14px",
                  borderRadius: 12,
                  border: `1px solid rgba(16,43,56,.25)`,
                  display: "flex",
                  alignItems: "center",
                  fontSize: 17,
                  fontWeight: 700,
                }}
              >
                {name}
                {frame >= 74 && frame < 100 ? <Caret frame={frame} /> : null}
              </div>
            </div>
            <div
              style={{
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
            <Button scale={press(frame, 122)}>Изпрати ми код</Button>
          </>
        )}
      </Sheet>
      <Tap at={104} x={44} y={APPROVE_CHECK_Y} />
      <Tap at={122} x={210} y={APPROVE_CODE_Y} />
      <Tap at={214} x={220} y={APPROVE_BUTTON_Y} />
    </div>
  );
}

/** 7. The decision is recorded: the ink seal lands on the client's screen. */
export function SealScene() {
  const frame = useCurrentFrame();
  const land = interpolate(frame, [8, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        height: "100%",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <PortalHeader version={2} />
      <div
        style={{
          padding: "40px 26px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: 64,
            height: 64,
            borderRadius: 99,
            background: color.okBg,
            color: color.okText,
            fontSize: 32,
            fontWeight: 900,
          }}
        >
          ✓
        </span>
        <p
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 900,
            letterSpacing: "-0.04em",
          }}
        >
          Решението е записано
        </p>
        <p
          style={{ margin: 0, fontSize: 16, lineHeight: 1.5, color: "#284955" }}
        >
          Одобрихте версия 2 за 384,00 €. Разписката е в имейла ви.
        </p>
        <div
          style={{
            marginTop: 8,
            padding: 16,
            borderRadius: 16,
            background: color.paper,
            fontFamily: font.mono,
            fontSize: 13,
            lineHeight: 1.8,
            color: color.muted,
          }}
        >
          <p style={{ margin: 0 }}>ИВАН ПЕТРОВ · 24.09.2026 · 14:32</p>
          <p style={{ margin: 0 }}>КОД ДО IV•••@GMAIL.COM ✓</p>
          <p style={{ margin: 0 }}>ОТПЕЧАТЪК 3f9a8c…dc21e</p>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          right: 28,
          bottom: 150,
          opacity: land,
          transform: `scale(${interpolate(land, [0, 1], [1.8, 1])})`,
        }}
      >
        <Stamp />
      </div>
    </div>
  );
}

/** The client's phone before anything arrives: a lock screen with the day's time. */
export function LockScreen({ time, date }: { time: string; date: string }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: "-44px 0 0",
        background: `linear-gradient(160deg, #2c5566 0%, ${color.ink} 55%, #0b1f29 100%)`,
        color: color.sheet,
        textAlign: "center",
      }}
    >
      <p
        style={{
          margin: "130px 0 0",
          fontSize: 18,
          fontWeight: 700,
          opacity: 0.8,
        }}
      >
        {date}
      </p>
      <p
        style={{
          margin: "4px 0 0",
          fontSize: 92,
          fontWeight: 300,
          letterSpacing: "-0.04em",
          lineHeight: 1,
        }}
      >
        {time}
      </p>
    </div>
  );
}

/** The company's view of a sent version: sent, seen by the client, and the decision. */
export function FirmWaiting({
  version,
  amount,
  seenAt,
  approvedAt,
}: {
  version: number;
  amount: string;
  /** Local frame the client opens the link; before it, "not seen yet". */
  seenAt?: number;
  approvedAt?: number;
}) {
  const frame = useCurrentFrame();
  const seen = seenAt !== undefined && frame >= seenAt;
  const approved = approvedAt !== undefined && frame >= approvedAt;
  const banner =
    approvedAt === undefined
      ? -160
      : interpolate(
          frame,
          [approvedAt, approvedAt + 12, approvedAt + 70, approvedAt + 82],
          [-160, 0, 0, -160],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );
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
      label: approved ? "Одобрена с код" : "Чака решение",
      detail: approved ? "Иван Петров · 14:32" : "",
      done: approved,
    },
  ];

  return (
    <div style={{ height: "100%", position: "relative" }}>
      <Banner
        app="Pakto"
        title="Иван Петров одобри версия 2"
        body="+384 € с ДДС · потвърдено с код от имейла"
        style={{ transform: `translateY(${banner}px)` }}
      />
      <AppHeader
        crumb="ОБЕКТ / КУХНЯ · ЛОЗЕНЕЦ"
        title="Промяна · ПР-042"
        status={
          <Chip tone={approved ? "ok" : "info"}>
            {approved ? "ОДОБРЕНА" : "ИЗПРАТЕНА"}
          </Chip>
        }
      />
      <div style={{ padding: "18px 20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{TITLE}</p>
          <p
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: "-0.04em",
            }}
          >
            {amount}
          </p>
        </div>
        <Label style={{ fontSize: 10, marginTop: 4 }}>
          ВЕРСИЯ {version} · С ДДС
        </Label>
        <div
          style={{
            marginTop: 22,
            display: "flex",
            flexDirection: "column",
            gap: 0,
          }}
        >
          {steps.map((step, index) => (
            <div
              key={step.label}
              style={{
                display: "flex",
                gap: 14,
                alignItems: "flex-start",
                minHeight: 64,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  alignSelf: "stretch",
                }}
              >
                <span
                  style={{
                    display: "grid",
                    placeItems: "center",
                    width: 26,
                    height: 26,
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
                    transform: `scale(${index === 1 && seenAt !== undefined ? interpolate(frame, [seenAt, seenAt + 5, seenAt + 12], [1, 1.25, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1})`,
                  }}
                >
                  {step.done ? "✓" : ""}
                </span>
                {index < steps.length - 1 ? (
                  <span
                    style={{
                      flex: 1,
                      width: 2,
                      background: step.done ? color.ink : "rgba(16,43,56,.15)",
                      margin: "4px 0",
                    }}
                  />
                ) : null}
              </div>
              <div>
                <p
                  style={{
                    margin: "2px 0 0",
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
      </div>
    </div>
  );
}

/** The client's portal after asking for a change: nothing to do until version 2 arrives. */
export function ClientWaiting() {
  return (
    <div style={{ height: "100%", position: "relative" }}>
      <PortalHeader version={1} />
      <div
        style={{
          padding: "34px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: 56,
            height: 56,
            borderRadius: 99,
            background: color.waitBg,
            color: color.waitText,
            fontSize: 26,
          }}
        >
          ⏳
        </span>
        <p
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 900,
            letterSpacing: "-0.04em",
          }}
        >
          Искането е изпратено
        </p>
        <p
          style={{ margin: 0, fontSize: 16, lineHeight: 1.5, color: "#284955" }}
        >
          {COMPANY} подготвя нова версия. Ще получите имейл, щом е готова.
        </p>
        <div
          style={{
            marginTop: 10,
            padding: "12px 14px",
            borderRadius: 14,
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
      </div>
    </div>
  );
}
