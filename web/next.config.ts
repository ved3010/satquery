import type { NextConfig } from "next";

/*
  `next build` and `next dev` both write to .next by default, so running a
  build while the dev server is up overwrites the chunks the dev server is
  serving and every request 500s with "Cannot find module './NNN.js'".

  NEXT_DIST_DIR gives the build its own directory. It is read from the
  environment rather than inferred from argv because Next spawns build workers
  whose argv does not contain "build" -- those workers would then resolve a
  different distDir than the parent and the build fails on a missing manifest.
  Environment variables are inherited by every worker; argv is not.

  `npm run build` and `npm start` set it via scripts/with-dist-dir.mjs, which
  works the same on Windows and POSIX (an inline VAR=value prefix does not).
*/
const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
