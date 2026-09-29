import type { NextConfig } from "next";

// Beveiligingsheaders voor elke respons. Geen HSTS: de app draait op het
// homelab over gewoon HTTP, en HSTS zou de browser dan buitensluiten.
const securityHeaders = [
  // Niet in een iframe van een andere site (clickjacking op login/formulieren).
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Content-Security-Policy",
    // Geen script-src: Next zet inline scripts zonder nonce neer. Dit deel
    // breekt niets en sluit framing, <base>-kaping, formulierposts naar
    // elders en plugins uit.
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // URL's bevatten ?profile=<id>; die hoeven niet mee naar externe sites.
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // De app toont alleen /icon.svg. Zonder optimalisatie is /_next/image
  // (en de libvips/sharp-code erachter, bron van meerdere CVE's) niet
  // bereikbaar.
  images: { unoptimized: true },
  experimental: {
    serverActions: {
      // Formulieren hier zijn een paar honderd bytes; 1 MB (standaard) is
      // alleen ruimte voor misbruik.
      bodySizeLimit: "64kb",
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
