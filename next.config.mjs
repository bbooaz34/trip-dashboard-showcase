import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// Build identifiers, baked into the client bundle at build time.
// On Vercel, VERCEL_GIT_COMMIT_SHA is provided automatically for every deploy,
// so the login page shows a new value each time you push.
const buildSha = (process.env.VERCEL_GIT_COMMIT_SHA || 'local').slice(0, 7);
const buildTime = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_BUILD_SHA: buildSha,
    NEXT_PUBLIC_BUILD_TIME: buildTime,
  },
  // Allow maplibre-gl to be bundled (it uses some browser globals)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
};

export default nextConfig;
