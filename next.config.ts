import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    authInterrupts: true,
    // Hover upgrades a partial prefetch to the full dynamic payload, so the click paints from cache.
    dynamicOnHover: true,
    // CSS arrives inside the HTML, so the first paint does not wait for a stylesheet round trip
    // (Lighthouse mobile: FCP 1.5 s → see docs). Costs ~30 KB on each full page load; client-side
    // navigations do not re-download it.
    inlineCss: true,
    // "Връзка с нас" sends up to 10 MB of screenshots in one action (plus multipart overhead);
    // the proxy buffers the same body, so both limits move together.
    serverActions: { bodySizeLimit: "12mb" },
    proxyClientMaxBodySize: "12mb",
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  outputFileTracingIncludes: {
    "/api/changes/[changeOrderId]/pdf": [
      "./src/modules/pdf/fonts/NotoSans-Regular.ttf",
      "./src/modules/pdf/fonts/NotoSans-SemiBold.ttf",
    ],
    "/api/organization/demo-offer": [
      "./src/modules/pdf/fonts/NotoSans-Regular.ttf",
      "./src/modules/pdf/fonts/NotoSans-SemiBold.ttf",
    ],
  },
  async redirects() {
    return [
      { source: "/app/changes/new", destination: "/app/offers/changes/new", permanent: true },
      { source: "/app/changes/:id", destination: "/app/offers/:id", permanent: true },
      { source: "/app/changes", destination: "/app/offers", permanent: true },
    ];
  },
  async headers() {
    // Every page: no framing by other sites (clickjacking), no MIME sniffing, no full URLs to other
    // sites. HSTS is set by nginx on the VPS (docs/deployment-notes.md), where https ends.
    const siteHeaders = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ];
    // Later entries win for the same header, so the portal keeps its stricter values.
    const portalHeaders = [
      { key: "Cache-Control", value: "private, no-store, max-age=0" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
    ];
    return [
      { source: "/:path*", headers: siteHeaders },
      { source: "/portal/:path*", headers: portalHeaders },
      { source: "/access/:path*", headers: portalHeaders },
    ];
  },
};

export default nextConfig;
