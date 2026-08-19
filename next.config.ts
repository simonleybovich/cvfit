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
  // pdfjs-dist (used by pdf-parse) tries to set up a worker file at runtime.
  // Bundling it breaks that file resolution, so keep it external and let
  // Node load it directly from node_modules instead.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
