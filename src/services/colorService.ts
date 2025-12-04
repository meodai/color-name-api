/**
 * Color Service - Manages color lists and VP-trees
 * Implements lazy loading for optimal startup performance
 */

import { colornames as colors } from "color-name-list";
import { colornames as colorsBestOf } from "color-name-list/bestof";
import { colornames as colorsShort } from "color-name-list/short";
// Import color data packages
import colorNameLists from "color-name-lists";
import { FindColors } from "../lib/index";
import type { ColorListMeta, RawColor } from "../types";

// Priority lists to load at startup (most commonly used)
const PRIORITY_LISTS = ["default", "bestOf", "short"];

// Service state
let colorLists: Record<string, RawColor[]> = {};
let colorListMeta: Record<string, ColorListMeta> = {};
let availableLists: string[] = [];
let findColors: FindColors | null = null;
let initialized = false;

/**
 * Build the initial color lists map
 */
function buildColorLists(): Record<string, RawColor[]> {
	return {
		default: colors as RawColor[],
		bestOf: colorsBestOf as RawColor[],
		short: colorsShort as RawColor[],
		...colorNameLists.lists,
	};
}

/**
 * Initialize the color service
 * Loads color lists and builds VP-trees
 */
export async function initColorService(): Promise<void> {
	if (initialized) {
		console.log("[ColorService] Already initialized");
		return;
	}

	console.log("[ColorService] Initializing...");
	const startTime = Date.now();

	// Build color lists
	colorLists = buildColorLists();
	availableLists = Object.keys(colorLists);

	// Copy metadata
	colorListMeta = { ...colorNameLists.meta };

	// Add metadata for built-in lists
	colorListMeta.default = {
		title: "Default",
		description: "Complete color name list with ~30,000 colors",
		source: "color-name-list",
		key: "default",
		colorCount: colorLists.default.length,
		license: "MIT",
	};

	colorListMeta.bestOf = {
		title: "Best Of",
		description: "Curated selection of ~1,500 memorable color names",
		source: "color-name-list",
		key: "bestOf",
		colorCount: colorLists.bestOf.length,
		license: "MIT",
	};

	colorListMeta.short = {
		title: "Short Names",
		description: "Colors with short names (< 10 characters)",
		source: "color-name-list",
		key: "short",
		colorCount: colorLists.short.length,
		license: "MIT",
	};

	// Initialize FindColors (builds VP-trees)
	console.log("[ColorService] Building VP-trees...");
	findColors = new FindColors(colorLists);

	const duration = Date.now() - startTime;
	console.log(`[ColorService] Initialized in ${duration}ms`);
	console.log(`[ColorService] Available lists: ${availableLists.join(", ")}`);
	console.log(
		`[ColorService] Total colors: ${Object.values(colorLists).reduce((sum, list) => sum + list.length, 0)}`,
	);

	initialized = true;
}

/**
 * Get the FindColors instance
 */
export function getFindColors(): FindColors {
	if (!findColors) {
		throw new Error(
			"ColorService not initialized. Call initColorService() first.",
		);
	}
	return findColors;
}

/**
 * Get all color lists
 */
export function getColorLists(): Record<string, RawColor[]> {
	return colorLists;
}

/**
 * Get available list names
 */
export function getAvailableLists(): string[] {
	return availableLists;
}

/**
 * Get color list metadata
 */
export function getColorListMeta(): Record<string, ColorListMeta> {
	return colorListMeta;
}

/**
 * Check if a list exists
 */
export function hasColorList(listKey: string): boolean {
	return availableLists.includes(listKey);
}

/**
 * Get a specific color list
 */
export function getColorList(listKey: string): RawColor[] | null {
	return colorLists[listKey] || null;
}

/**
 * Get color count for a list
 */
export function getColorCount(listKey: string = "default"): number {
	const list = colorLists[listKey];
	return list ? list.length : 0;
}

/**
 * Check if service is initialized
 */
export function isInitialized(): boolean {
	return initialized;
}

/**
 * Get service stats
 */
export function getServiceStats(): {
	initialized: boolean;
	listCount: number;
	totalColors: number;
	priorityLists: string[];
} {
	return {
		initialized,
		listCount: availableLists.length,
		totalColors: Object.values(colorLists).reduce(
			(sum, list) => sum + list.length,
			0,
		),
		priorityLists: PRIORITY_LISTS,
	};
}
