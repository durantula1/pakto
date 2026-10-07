import type { ReactNode } from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";

import {
  Captions,
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
  ApproveScene,
  ChatScene,
  ClientWaiting,
  EmailScene,
  FirmWaiting,
  LockScreen,
  RecordScene,
  RequestScene,
  ReviseScene,
  SealScene,
} from "./scenes";
import { progress, type Layout } from "./theme";
import { at, beatAt, beats, clock } from "./timeline";
import { Phone, SCREEN } from "./ui";

/**
 * The phone clip: the company's phone and the client's phone side by side on a desk. The camera
 * moves to whoever acts, pulls back while the change flies across, and both are in shot for the
 * final "yes".
 */
const WORLD = { width: 1920, height: 1080 } as const;
const PHONE = { width: SCREEN.width + 24, height: SCREEN.height + 24 } as const;
const firm = { left: 460, top: 128 } as const;
const client = { left: 1046, top: 128 } as const;
const centre = (phone: { left: number; top: number }) => ({
  x: phone.left + PHONE.width / 2,
  y: phone.top + PHONE.height / 2,
});

/** A shot centred on (cx, cy) at a given zoom, in the frame size of the layout. */
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

/**
 * Landscape keeps the phone right of centre so the subtitle has the left; portrait keeps it low so
 * the subtitle has the top.
 */
function shots(layout: Layout) {
  const landscape = layout === "landscape";
  const on = (
    phone: { left: number; top: number },
    zoom: number,
    lift = 0,
    focus = "",
  ) => {
    const c = centre(phone);
    return landscape
      ? shot(layout, c.x - 230 / zoom, c.y + lift, zoom, focus)
      : shot(layout, c.x, c.y - 135 / zoom + lift, zoom, focus);
  };
  return {
    hook: landscape
      ? shot(layout, centre(firm).x - 144, 440, 1.6, "firm")
      : shot(layout, centre(firm).x, 383, 1.7, "firm"),
    firm: on(firm, landscape ? 1.2 : 1.24, 0, "firm"),
    firmClose: on(firm, landscape ? 1.42 : 1.4, 70, "firm"),
    client: on(client, landscape ? 1.2 : 1.24, 0, "client"),
    clientClose: on(client, landscape ? 1.42 : 1.4, 110, "client"),
    wide: landscape
      ? shot(layout, 960, 560, 0.95, "all")
      : shot(layout, 960, 383, 0.86, "all"),
  };
}

function moves(layout: Layout): Move[] {
  const s = shots(layout);
  return [
    { at: 0, duration: 0, shot: s.hook },
    { at: at("hook", 118), duration: 40, shot: s.firm },
    { at: at("record", 70), duration: 40, shot: s.firmClose },
    { at: at("record", 150), duration: 30, shot: s.wide },
    { at: at("email", 0), duration: 24, shot: s.client },
    { at: at("request", 140), duration: 22, shot: s.wide },
    { at: at("revise", 0), duration: 22, shot: s.firm },
    { at: at("revise", 128), duration: 20, shot: s.wide },
    { at: at("approve", 6), duration: 22, shot: s.client },
    { at: at("approve", 130), duration: 30, shot: s.clientClose },
    { at: at("seal", 0), duration: 26, shot: s.wide },
  ];
}

/** The phone keeps its frame; only the screen under the status bar changes, with a quick fade. */
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
      style={{
        position: "absolute",
        inset: "44px 0 0",
        opacity: progress(frame, 0, 6),
      }}
    >
      {children}
    </div>
  );
}

export function PhoneClip({ layout }: { layout: Layout }) {
  const frame = useCurrentFrame();
  const view = useCamera(moves(layout));
  const time = clock[beatAt(frame)];
  const firmFocus = view.focus("firm");
  const clientFocus = view.focus("client");
  const both = Math.min(firmFocus, clientFocus);
  const firmAt = centre(firm);
  const clientAt = centre(client);

  return (
    <AbsoluteFill>
      <Stage
        view={view}
        width={WORLD.width}
        height={WORLD.height}
        background={<Desk width={WORLD.width} height={WORLD.height} />}
      >
        <div
          style={{
            position: "absolute",
            ...firm,
            transform: "rotate(-1.5deg)",
            ...focusStyle(firmFocus),
          }}
        >
          <Phone time={time}>
            <Screen from={0} duration={beats.hook.duration}>
              <ChatScene />
            </Screen>
            <Screen from={at("record")} duration={beats.record.duration}>
              <RecordScene />
            </Screen>
            <Screen
              from={at("email")}
              duration={beats.email.duration + beats.request.duration}
            >
              <FirmWaiting version={1} amount="+450 €" seenAt={96} />
            </Screen>
            <Screen from={at("revise")} duration={beats.revise.duration}>
              <ReviseScene />
            </Screen>
            <Screen
              from={at("approve")}
              duration={
                beats.approve.duration +
                beats.seal.duration +
                beats.end.duration
              }
            >
              <FirmWaiting
                version={2}
                amount="+384 €"
                seenAt={24}
                approvedAt={beats.approve.duration + 38}
              />
            </Screen>
          </Phone>
        </div>
        <div
          style={{
            position: "absolute",
            ...client,
            transform: "rotate(1.5deg)",
            ...focusStyle(clientFocus),
          }}
        >
          <Phone time={time}>
            <Screen from={0} duration={at("email")}>
              <LockScreen time={clock.record} date="петък, 18 септември" />
            </Screen>
            <Screen from={at("email")} duration={beats.email.duration}>
              <EmailScene />
            </Screen>
            <Screen from={at("request")} duration={beats.request.duration}>
              <RequestScene />
            </Screen>
            <Screen from={at("revise")} duration={beats.revise.duration}>
              <ClientWaiting />
            </Screen>
            <Screen from={at("approve")} duration={beats.approve.duration}>
              <ApproveScene />
            </Screen>
            <Screen
              from={at("seal")}
              duration={beats.seal.duration + beats.end.duration}
            >
              <SealScene />
            </Screen>
          </Phone>
        </div>
        <Note
          visible={both}
          style={{ left: firm.left + 20, top: firm.top - 66 }}
        >
          фирмата
        </Note>
        <Note
          visible={both}
          style={{ left: client.left + 20, top: client.top - 66 }}
        >
          клиентът
        </Note>
        <Flight
          start={at("record", 172)}
          from={{ x: firmAt.x, y: firmAt.y + 200 }}
          to={{ x: clientAt.x, y: clientAt.y - 220 }}
          label="Версия 1"
          amount="450 €"
        />
        <Flight
          start={at("request", 150)}
          from={{ x: clientAt.x, y: clientAt.y + 80 }}
          to={{ x: firmAt.x, y: firmAt.y - 220 }}
          label="Искане за промяна"
          amount="в. 1"
          tone="coral"
        />
        <Flight
          start={at("revise", 136)}
          duration={20}
          from={{ x: firmAt.x, y: firmAt.y + 200 }}
          to={{ x: clientAt.x, y: clientAt.y - 220 }}
          label="Версия 2"
          amount="384 €"
        />
        <Flight
          start={at("seal", 12)}
          from={{ x: clientAt.x, y: clientAt.y }}
          to={{ x: firmAt.x, y: firmAt.y - 220 }}
          label="Одобрено с код"
          amount="384 €"
          tone="coral"
        />
      </Stage>
      <DateStamp layout={layout} />
      <Captions layout={layout} />
      <Sequence from={beats.end.from} durationInFrames={beats.end.duration}>
        <EndCard layout={layout} />
      </Sequence>
    </AbsoluteFill>
  );
}
