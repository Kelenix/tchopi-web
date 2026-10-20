// Worker de MapLibre (module) servi tel quel depuis public/maplibre : la compilation ne le copie pas d'elle-même.
import { copyFileSync, mkdirSync } from "node:fs";

const from = "node_modules/maplibre-gl/dist";
mkdirSync("public/maplibre", { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) copyFileSync(`${from}/${file}`, `public/maplibre/${file}`);
