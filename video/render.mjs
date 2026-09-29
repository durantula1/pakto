// Renders the landing-page clips (phone and desktop, each 16:9 and 4:5) as silent MP4 (H.264), plus
// a poster for each, into the site's public/video. H.264 plays everywhere, iPhones included, and
// came out smaller than VP9. Run with `pnpm video:render` from the repo root.
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const out = fileURLToPath(new URL("../public/video/", import.meta.url));
mkdirSync(out, { recursive: true });

// The seal scene, both sides in shot, says the whole story in one frame, so it is the poster.
const POSTER_FRAME = 1110;

const formats = [
  { id: "phone-landscape", name: "pakto-phone-16x9" },
  { id: "phone-portrait", name: "pakto-phone-4x5" },
  { id: "desktop-landscape", name: "pakto-desktop-16x9" },
  { id: "desktop-portrait", name: "pakto-desktop-4x5" },
];

function remotion(...args) {
  execFileSync("pnpm", ["exec", "remotion", ...args], { stdio: "inherit" });
}

for (const { id, name } of formats) {
  // PNG frames keep the H.264 stream in standard (TV) range; JPEG frames would make it yuvj420p.
  remotion(
    "render",
    "src/index.ts",
    id,
    `${out}${name}.mp4`,
    "--codec=h264",
    "--crf=30",
    "--image-format=png",
    "--muted",
  );
  remotion(
    "still",
    "src/index.ts",
    id,
    `${out}${name}.jpg`,
    `--frame=${POSTER_FRAME}`,
    "--image-format=jpeg",
    "--jpeg-quality=82",
  );
}
