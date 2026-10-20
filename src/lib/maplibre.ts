/** MapLibre chargé à la demande, avec son worker servi depuis public/maplibre (scripts/maplibre-worker.mjs). */
export async function loadMapLibre() {
  const lib = await import("maplibre-gl");
  lib.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
  return lib;
}
