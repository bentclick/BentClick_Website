import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native argon2 binding must not be bundled.
  serverExternalPackages: ["@node-rs/argon2"],
  // The watermark font is read from disk at runtime; ship it with the functions that render previews.
  outputFileTracingIncludes: { "/api/**": ["./src/assets/fonts/**"] },
  // Watermark logos (≤ 2 MB) are the only files sent through a Server Action.
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
  images: {
    // Gallery photos are served via short-lived signed R2 URLs (see src/lib/r2).
    remotePatterns: [{ protocol: "https", hostname: "*.r2.cloudflarestorage.com" }],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
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
