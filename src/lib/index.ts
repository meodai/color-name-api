/**
 * Library exports for Color Name API
 */

export { default as Closest } from "./closestColor";
export { svgTemplate } from "./colorSwatchSVG";
export type { ColorListsMap, ColorNameResult } from "./findColors";
export { FindColors, hydrateColor, isExhaustionError } from "./findColors";

// Utilities
export { getPaletteTitle } from "./generatePaletteName";
export type { ColorRecord, ParsedColorRecord } from "./utils";
export { createColorRecord, hasOwn, lib, luminance } from "./utils";
// Core color search
export { VPTree } from "./vptree";
