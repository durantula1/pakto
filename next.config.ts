import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A self-contained server.js with only the files it needs: the Docker image copies .next/standalone.
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    authInterrupts: true,
    // Hover upgrades a partial prefetch to the full dynamic payload, so the click paints from cache.
    dynamicOnHover: true,
    // Off: with CSS inlined into the streamed HTML, pages behind a real network (not localhost) hydrated before
    // the stream finished and broke it (React #418, "$RS … parentNode", streamed sections left hidden).
    inlineCss: false,
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
    // Nothing loads from another site, so everything is 'self'. Scripts keep 'unsafe-inline' for Next's inline
    // bootstrap (nonces would make every page dynamic); the policy still stops outside scripts, plugins, <base>
    // tricks, forms posting elsewhere and requests to other hosts. blob:/data: are image previews and fonts.
    const contentSecurityPolicy = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "media-src 'self'",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; ");
    // Every page: no framing by other sites (clickjacking), no MIME sniffing, no full URLs to other
    // sites. HSTS is set by Caddy on the VPS (deploy/Caddyfile), where https ends.
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
      // Pages only: a policy on a PDF response can stop the browser's own PDF viewer.
      { source: "/((?!api/).*)", headers: [{ key: "Content-Security-Policy", value: contentSecurityPolicy }] },
      { source: "/portal/:path*", headers: portalHeaders },
      { source: "/access/:path*", headers: portalHeaders },
    ];
  },
};

export default nextConfig;
