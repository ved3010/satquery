import type { NextConfig } from "next";

/*
  `next build` and `next dev` both write to .next by default, so running a
  build while the dev server is up overwrites the chunks the dev server is
  serving and every request 500s with "Cannot find module './NNN.js'".

  NEXT_DIST_DIR gives the build its own directory. It is read from the
  environment rather than inferred from argv because Next spawns build workers
