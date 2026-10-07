import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native argon2 binding must not be bundled.
  serverExternalPackages: ["@node-rs/argon2"],
  // The watermark font is read from disk at runtime; ship it with the functions that render previews.
  outputFileTracingIncludes: { "/api/**": ["./src/assets/fonts/**"] },
  // Watermark logos (≤ 2 MB) are the only files sent through a Server Action.
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
  poweredByHeader: false,
  // Photos are plain <img> tags with signed R2 URLs; the image optimizer stays off so it cannot be used as a proxy.
  images: { unoptimized: true },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
