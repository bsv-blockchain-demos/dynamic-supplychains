import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  async redirects() {
    // The gallery moved from /examples to /directory; keep old shared links working.
    return [
      { source: "/examples", destination: "/directory", permanent: true },
      { source: "/examples/:id", destination: "/directory/:id", permanent: true },
    ];
  },
};

export default nextConfig;
