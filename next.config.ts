import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native argon2 binding must not be bundled.
  serverExternalPackages: ["@node-rs/argon2"],
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
