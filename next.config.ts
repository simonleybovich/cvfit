import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for a lean production Docker image (only the traced
  // dependency subset gets copied into the runtime stage, not node_modules).
  output: "standalone",
  // Pin the workspace root explicitly: without this, Next.js/Turbopack can
  // mistakenly infer a parent directory as the root if it finds an
  // unrelated lockfile there (e.g. a stray package-lock.json in the user's
  // home directory), which breaks path resolution.
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Keep the Node-only parser external so it is loaded directly at runtime.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
