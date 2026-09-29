import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";

import {
  Captions,
  Cursor,
  DateStamp,
  Desk,
  EndCard,
  Flight,
  Note,
  Stage,
  focusStyle,
  useCamera,
  type Move,
  type Shot,
} from "./camera";
import {
  APPROVE_BUTTON,
  APPROVE_CHECK,
  APPROVE_CODE,
  APPROVE_DIGITS,
  APPROVE_NAME,
  BAR,
  BrowserWindow,
  DeskApprove,
  DeskClientWaiting,
  DeskFirmStatus,
  DeskMail,
  DeskRecord,
  DeskRequest,
  DeskRevise,
  DeskSealed,
  FirmShell,
  FIRM_BUTTON,
  MAIL_BUTTON,
  MAIL_ROW,
  REQUEST_BUTTON,
  REQUEST_COMMENT,
  REQUEST_LINK,
  REQUEST_OPTION,
  REVISE_BUTTON,
} from "./desktop-screens";
import { ChatScene } from "./scenes";
import { glide, progress, type Layout } from "./theme";
import { at, beats } from "./timeline";

/**
 * The desktop clip: the company's Pakto and the client's mail and portal in two browser windows on
 * one desk. The chat that starts the argument is a messenger window that gets closed once Pakto
 * takes over. A pointer does the clicking; the camera follows it.
 */
const WORLD = { width: 2080, height: 1080 } as const;
const FIRM = { x: 60, y: 60, w: 1360, h: 860 } as const;
const CLIENT = { x: 1020, y: 260, w: 1000, h: 740 } as const;
const CHAT = { x: 560, y: 120, w: 560, h: 800 } as const;

const onFirm = (point: { x: number; y: number }) => ({
  x: FIRM.x + point.x,
  y: FIRM.y + BAR + point.y,
});
const onClient = (point: { x: number; y: number }) => ({
  x: CLIENT.x + point.x,
  y: CLIENT.y + BAR + point.y,
});

function shot(
  layout: Layout,
  cx: number,
  cy: number,
  zoom: number,
  focus: string,
): Shot {
  const [vw, vh] = layout === "landscape" ? [1920, 1080] : [1080, 1350];
  const w = vw / zoom;
  const h = vh / zoom;
  return { x: cx - w / 2, y: cy - h / 2, w, h, focus };
}

/** Landscape leaves the left third to the subtitle; portrait leaves the top. */
function moves(layout: Layout): Move[] {
  const l = layout === "landscape";
  const aim = (
    cx: number,
    cy: number,
    zoom: number,
    focus: string,
    push = 200,
  ) =>
    l
      ? shot(layout, cx - push / zoom, cy, zoom, focus)
      : shot(layout, cx, cy - 135 / zoom, zoom, focus);
  const form = onFirm({ x: 800, y: 300 });
  const panel = onClient({ x: 780, y: 330 });
  const s = {
    hook: aim(
      CHAT.x + CHAT.w / 2,
      CHAT.y + CHAT.h / 2,
      l ? 1.3 : 1.5,
      "chat",
      230,
    ),
    firm: l
      ? aim(FIRM.x + FIRM.w / 2, FIRM.y + FIRM.h / 2, 1.2, "firm", 0)
      : aim(onFirm({ x: 796, y: 0 }).x, form.y, 0.95, "firm"),
    firmClose: l
      ? aim(form.x, form.y, 1.6, "firm", 120)
      : aim(onFirm({ x: 900, y: 0 }).x, form.y, 1.2, "firm"),
    client: aim(
      CLIENT.x + CLIENT.w / 2,
      CLIENT.y + CLIENT.h / 2,
      l ? 1.35 : 1.05,
      "client",
      200,
    ),
    clientPanel: aim(panel.x, panel.y, 1.9, "client", 250),
    wide: shot(layout, 1040, 530, l ? 0.95 : 0.5, "all"),
  };
  return [
    { at: 0, duration: 0, shot: s.hook },
    { at: at("hook", 118), duration: 40, shot: s.firm },
    { at: at("record", 60), duration: 40, shot: s.firmClose },
    { at: at("record", 150), duration: 30, shot: s.wide },
    { at: at("email", 0), duration: 24, shot: s.client },
    { at: at("request", 20), duration: 24, shot: s.clientPanel },
    { at: at("request", 140), duration: 22, shot: s.wide },
    { at: at("revise", 0), duration: 22, shot: s.firm },
    { at: at("revise", 128), duration: 20, shot: s.wide },
    { at: at("approve", 6), duration: 22, shot: s.client },
    { at: at("approve", 50), duration: 30, shot: s.clientPanel },
    { at: at("seal", 20), duration: 26, shot: s.wide },
  ];
}

/** The pointer, aimed at the same buttons the phone clip taps, on the same frames. */
const cursor = [
  { at: 0, ...onFirm({ x: 700, y: 560 }) },
  { at: at("record", 20), ...onFirm({ x: 560, y: 220 }) },
  { at: at("record", 110), ...onFirm({ x: 560, y: 340 }) },
  { at: at("record", 160), ...onFirm(FIRM_BUTTON), click: true },
  { at: at("email", 34), ...onClient(MAIL_ROW), click: true },
  { at: at("email", 96), ...onClient(MAIL_BUTTON), click: true },
  { at: at("request", 30), ...onClient(REQUEST_LINK), click: true },
  { at: at("request", 60), ...onClient(REQUEST_OPTION), click: true },
  { at: at("request", 90), ...onClient(REQUEST_COMMENT) },
  { at: at("request", 146), ...onClient(REQUEST_BUTTON), click: true },
  { at: at("revise", 60), ...onFirm({ x: 740, y: 300 }) },
  { at: at("revise", 132), ...onFirm(REVISE_BUTTON), click: true },
  { at: at("approve", 60), ...onClient(APPROVE_NAME) },
  { at: at("approve", 104), ...onClient(APPROVE_CHECK), click: true },
  { at: at("approve", 122), ...onClient(APPROVE_CODE), click: true },
  { at: at("approve", 170), ...onClient(APPROVE_DIGITS) },
  { at: at("approve", 214), ...onClient(APPROVE_BUTTON), click: true },
  { at: at("seal", 60), ...onClient({ x: 900, y: 600 }) },
];

function Screen({
  from,
  duration,
  children,
}: {
  from: number;
  duration: number;
  children: ReactNode;
}) {
  return (
    <Sequence from={from} durationInFrames={duration} layout="none">
      <Cut>{children}</Cut>
    </Sequence>
  );
}

function Cut({ children }: { children: ReactNode }) {
  const frame = useCurrentFrame();
  return (
    <div
      style={{ position: "absolute", inset: 0, opacity: progress(frame, 0, 6) }}
    >
      {children}
    </div>
  );
}

/** Whose window is in front: the one being used. */
function firmInFront(frame: number) {
  return (
    frame < at("email") || (frame >= at("revise") && frame < at("approve"))
  );
}

export function DesktopClip({ layout }: { layout: Layout }) {
  const frame = useCurrentFrame();
  const view = useCamera(moves(layout));
  const both = Math.min(view.focus("firm"), view.focus("client"));
  const chatGone = glide(frame, at("hook", 120), 26);
  const firmButton = onFirm(FIRM_BUTTON);
  const reviseButton = onFirm(REVISE_BUTTON);
  const clientTop = { x: CLIENT.x + CLIENT.w / 2, y: CLIENT.y + 140 };
  const firmTop = { x: FIRM.x + FIRM.w / 2, y: FIRM.y + 160 };

  return (
    <AbsoluteFill>
      <Stage
        view={view}
        width={WORLD.width}
        height={WORLD.height}
        background={<Desk width={WORLD.width} height={WORLD.height} />}
      >
        <BrowserWindow
          url="pakto.bg/app/offers/pr-042"
          width={FIRM.w}
          height={FIRM.h}
          style={{
            left: FIRM.x,
            top: FIRM.y,
            zIndex: firmInFront(frame) ? 3 : 2,
            ...focusStyle(Math.max(view.focus("firm"), 0)),
          }}
        >
          {/* Behind the chat, the company's Pakto is open on the project. */}
          <FirmShell crumb="Обекти / Кухня · Лозенец">{null}</FirmShell>
          <Screen from={at("record")} duration={beats.record.duration}>
            <DeskRecord />
          </Screen>
          <Screen
            from={at("email")}
            duration={beats.email.duration + beats.request.duration}
          >
            <DeskFirmStatus version={1} amount="+450 €" seenAt={96} />
          </Screen>
          <Screen from={at("revise")} duration={beats.revise.duration}>
            <DeskRevise />
          </Screen>
          <Screen
            from={at("approve")}
            duration={
              beats.approve.duration + beats.seal.duration + beats.end.duration
            }
          >
            <DeskFirmStatus
              version={2}
              amount="+384 €"
              seenAt={24}
              approvedAt={beats.approve.duration + 38}
            />
          </Screen>
        </BrowserWindow>
        <BrowserWindow
          url="pakto.bg/portal/kuhnya-lozenets"
          width={CLIENT.w}
          height={CLIENT.h}
          style={{
            left: CLIENT.x,
            top: CLIENT.y,
            zIndex: firmInFront(frame) ? 2 : 3,
            ...focusStyle(view.focus("client")),
          }}
        >
          <Screen from={0} duration={at("request")}>
            <DeskMail />
          </Screen>
          <Screen from={at("request")} duration={beats.request.duration}>
            <DeskRequest />
          </Screen>
          <Screen from={at("revise")} duration={beats.revise.duration}>
            <DeskClientWaiting />
          </Screen>
          <Screen from={at("approve")} duration={beats.approve.duration}>
            <DeskApprove />
          </Screen>
          <Screen
            from={at("seal")}
            duration={beats.seal.duration + beats.end.duration}
          >
            <DeskSealed />
          </Screen>
        </BrowserWindow>
        {chatGone < 1 ? (
          <BrowserWindow
            url="Чат · Иван Петров"
            width={CHAT.w}
            height={CHAT.h}
            style={{
              left: CHAT.x,
              top: CHAT.y,
              zIndex: 5,
              opacity: 1 - chatGone,
              transform: `translateY(${chatGone * 260}px) scale(${1 - chatGone * 0.4})`,
            }}
          >
            <ChatScene />
          </BrowserWindow>
        ) : null}
        <Note
          visible={both}
          style={{ left: FIRM.x + 520, top: FIRM.y - 62, zIndex: 6 }}
        >
          фирмата, в Pakto
        </Note>
        <Note
          visible={both}
          style={{
            left: CLIENT.x + 480,
            top: CLIENT.y + CLIENT.h + 16,
            zIndex: 6,
          }}
        >
          клиентът, в портала
        </Note>
        <Flight
          start={at("record", 172)}
          from={firmButton}
          to={clientTop}
          label="Версия 1"
          amount="450 €"
        />
        <Flight
          start={at("request", 150)}
          from={onClient(REQUEST_BUTTON)}
          to={firmTop}
          label="Искане за промяна"
          amount="v1"
          tone="coral"
        />
        <Flight
          start={at("revise", 136)}
          duration={20}
          from={reviseButton}
          to={clientTop}
          label="Версия 2"
          amount="384 €"
        />
        <Flight
          start={at("seal", 12)}
          from={onClient({ x: 780, y: 330 })}
          to={firmTop}
          label="Одобрено с код"
          amount="384 €"
          tone="coral"
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 60,
            opacity: interpolate(
              frame,
              [at("record") - 10, at("record")],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            ),
          }}
        >
          <Cursor path={cursor} />
        </div>
      </Stage>
      <DateStamp layout={layout} />
      <Captions layout={layout} />
      <Sequence from={beats.end.from} durationInFrames={beats.end.duration}>
        <EndCard layout={layout} />
      </Sequence>
    </AbsoluteFill>
  );
}
