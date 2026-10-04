import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Option 1: Top-level turbopack config (Next.js 15+)
  turbopack: {
    root: __dirname,
  },

  // Option 2: Tells Next.js tracing where the workspace root is
  outputFileTracingRoot: path.join(__dirname, "../"),

  // Lets the Expo app call the API when it runs in a browser (`npx expo start --web`).
  // Native iOS/Android builds do not need CORS, but it does no harm.
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, x-user-id" },
        ],
      },
    ];
  },
};

export default nextConfig;