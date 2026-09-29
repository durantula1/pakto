import { Composition } from "remotion";

import { DesktopClip } from "./DesktopClip";
import { PhoneClip } from "./PhoneClip";
import { FPS } from "./theme";
import { TOTAL_FRAMES } from "./timeline";

/**
 * Two clips of the same story, each in two frames: on phones (both sides' phones on a desk) and on
 * desktop (the company's app and the client's portal in browser windows); 16:9 for wide screens,
 * 4:5 for phones.
 */
const clips = [
  { id: "phone", component: PhoneClip },
  { id: "desktop", component: DesktopClip },
] as const;

const frames = [
  { id: "landscape", width: 1920, height: 1080 },
  { id: "portrait", width: 1080, height: 1350 },
] as const;

export function Root() {
  return (
    <>
      {clips.flatMap((clip) =>
        frames.map((frame) => (
          <Composition
            key={`${clip.id}-${frame.id}`}
            id={`${clip.id}-${frame.id}`}
            component={clip.component}
            defaultProps={{ layout: frame.id }}
            durationInFrames={TOTAL_FRAMES}
            fps={FPS}
            width={frame.width}
            height={frame.height}
          />
        )),
      )}
    </>
  );
}
