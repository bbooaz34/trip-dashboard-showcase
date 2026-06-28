// App build identifiers. Values are injected at build time via next.config.mjs.
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0';
export const BUILD_SHA = process.env.NEXT_PUBLIC_BUILD_SHA ?? 'local';
export const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME ?? '';

// e.g. "v0.4.0 · a1b2c3d · 2026-06-08 15:30 UTC"
export const VERSION_LABEL =
  `v${APP_VERSION} · ${BUILD_SHA}` + (BUILD_TIME ? ` · ${BUILD_TIME}` : '');
