/**
 * Utility functions for the Color Name API
 */

import type { HydratedColor, RGB } from "../types";

/**
 * Calculate HSP luminance
 * @see http://alienryderflex.com/hsp.html
 */
export function luminance(rgb: RGB): number {
	return Math.sqrt(
		(0.299 * rgb.r) ** 2 + (0.587 * rgb.g) ** 2 + (0.114 * rgb.b) ** 2,
	);
}

/**
 * Type-safe property check
 */
export function hasOwn<T extends object>(
	obj: T,
	prop: PropertyKey,
): prop is keyof T {
	return Object.hasOwn(obj, prop);
}

/**
 * Parsed color record for storage/logging
 */
export interface ParsedColorRecord {
	name: string;
	hex: string;
	requestedHex: string;
}

/**
 * Color record structure
 */
export interface ColorRecord {
	paletteTitle: string;
	list: string;
	parsedColors: ParsedColorRecord[];
}

/**
 * Create a color record from hydrated colors
 */
export function createColorRecord({
	paletteTitle,
	colors,
	list,
}: {
	paletteTitle: string;
	colors: HydratedColor[];
	list: string;
}): ColorRecord {
	const parsedColors: ParsedColorRecord[] = [];

	if (Array.isArray(colors)) {
		colors.forEach((color) => {
			const { name, hex, requestedHex = "" } = color;
			parsedColors.push({ name, hex, requestedHex });
		});
	}

	return { paletteTitle, list, parsedColors };
}

/**
 * Backwards compatible lib export
 */
export const lib = {
	luminance,
};
