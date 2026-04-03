import { build } from "esbuild";

const common = {
  bundle: true,
  format: "esm",
  target: "es2020",
  legalComments: "none",
  logLevel: "info",
};

await build({
  ...common,
  entryPoints: ["src/modular-person-entity-card.js"],
  outfile: "modular-person-entity-card.js",
});

await build({
  ...common,
  entryPoints: ["src/modular-person-entity-card-editor.js"],
  outfile: "modular-person-entity-card-editor.js",
});
