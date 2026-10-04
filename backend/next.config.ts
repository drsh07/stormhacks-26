import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
