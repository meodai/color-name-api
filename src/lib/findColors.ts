/**
 * FindColors - Color search and naming service
 * Uses VP-Tree for efficient nearest neighbor color matching
 */

import type { Color, Lab } from "culori";
import {
	converter,
	differenceCiede2000,
	parse,
	wcagContrast,
	wcagLuminance,
} from "culori";
import { distance as levenshteinDistance } from "fastest-levenshtein";
import { LRUCache } from "lru-cache";
import type {
	ColorExhaustionError,
	HSL,
	HydratedColor,
	Lab as LabType,
	RawColor,
	RGB,
	SwatchImg,
} from "../types";
import Closest from "./closestColor";
import { luminance } from "./utils";

const distanceMetric = differenceCiede2000();

// Converters
const toLab = converter("lab");
const toRgb = converter("rgb");
const toHsl = converter("hsl");

/**
 * Hydrates a color object with calculated properties (RGB, HSL, Lab, etc.)
 * This is done on-demand only for colors that are being returned to the client.
 */
export function hydrateColor(colorObj: RawColor): HydratedColor {
	const currentColor = parse(colorObj.hex);
	if (!currentColor) {
		throw new Error(`Invalid color hex: ${colorObj.hex}`);
	}

	const ccLab = toLab(currentColor);
	const rgbFloat = toRgb(currentColor);
	const hslFloat = toHsl(currentColor);

	const rgb: RGB = {
		r: Math.round((rgbFloat?.r ?? 0) * 255),
		g: Math.round((rgbFloat?.g ?? 0) * 255),
		b: Math.round((rgbFloat?.b ?? 0) * 255),
	};

	const hsl: HSL = {
		h: Math.round(hslFloat?.h || 0),
		s: parseFloat((100 * (hslFloat?.s ?? 0)).toFixed(5)),
		l: parseFloat((100 * (hslFloat?.l ?? 0)).toFixed(5)),
	};

	const lab: LabType = {
		l: parseFloat((ccLab?.l ?? 0).toFixed(5)),
		a: parseFloat((ccLab?.a ?? 0).toFixed(5)),
		b: parseFloat((ccLab?.b ?? 0).toFixed(5)),
	};

	const swatchImg: SwatchImg = {
		svgNamed: `/v1/swatch/?color=${colorObj.hex.slice(1)}&name=${encodeURI(colorObj.name)}`,
		svg: `/v1/swatch/?color=${colorObj.hex.slice(1)}`,
	};

	return {
		name: colorObj.name,
		hex: colorObj.hex,
		rgb,
		hsl,
		lab,
		luminance: parseFloat(luminance(rgb).toFixed(5)),
		luminanceWCAG: parseFloat(wcagLuminance(currentColor).toFixed(5)),
		bestContrast:
			wcagContrast(currentColor, "#000") > wcagContrast(currentColor, "#fff")
				? "black"
				: "white",
		swatchImg,
	};
}

/**
 * Prepares color for search index (VPTree)
 */
function prepareColorForSearch(
	colorObj: RawColor,
	colorListParsedRef: Color[],
): RawColor {
	const currentColor = parse(colorObj.hex);
	if (currentColor) {
		colorListParsedRef.push(currentColor);
	}
	return colorObj;
}

// Module-level caches for VP-trees (singleton pattern)
let colorListsCache: Record<string, RawColor[]> | null = null;
let colorListsParsedCache: Record<string, Color[]> = {};
let closestInstancesCache: Record<
	string,
	{ regular: Closest; unique: Closest }
> = {};

// Define cache size limits
const MAX_NAME_CACHE_SIZE = 1000;

/**
 * Color lists dictionary type
 */
export type ColorListsMap = Record<string, RawColor[]>;

/**
 * Result from getNamesForValues - either a hydrated color or an error
 */
export type ColorNameResult = HydratedColor | ColorExhaustionError;

/**
 * Type guard for exhaustion error
 */
export function isExhaustionError(
	result: ColorNameResult,
): result is ColorExhaustionError {
	return "error" in result;
}

/**
 * FindColors class for color search and naming
 * Uses VP-Tree for efficient nearest neighbor color matching
 */
export class FindColors {
	private colorLists: Record<string, RawColor[]>;
	private colorListsParsed: Record<string, Color[]>;
	private closestInstances: Record<
		string,
		{ regular: Closest; unique: Closest }
	>;
	private colorNameCache: Record<string, LRUCache<string, HydratedColor[]>>;

	/**
	 * Creates a new FindColors instance
	 * @param colorsListsObj Dictionary of color lists keyed by list name
	 */
	constructor(colorsListsObj: ColorListsMap) {
		// If we already have the cache, use it instead of rebuilding everything
		if (colorListsCache) {
			this.colorLists = colorListsCache;
			this.colorListsParsed = colorListsParsedCache;
			this.closestInstances = closestInstancesCache;
			this.colorNameCache = {};

			// Initialize name caches
			Object.keys(this.colorLists).forEach((listName) => {
				this.colorNameCache[listName] = new LRUCache({
					max: MAX_NAME_CACHE_SIZE,
				});
			});

			console.log("[FindColors] Using cached VP-trees");
			return;
		}

		console.log(
			"[FindColors] Initializing color lists and VP-trees for the first time",
		);
		this.colorLists = colorsListsObj;
		this.colorListsParsed = {};
		this.closestInstances = {};
		this.colorNameCache = {};

		// Prepare color array and create VPTree instances
		Object.keys(this.colorLists).forEach((listName) => {
			console.log(`[Color Finder] Initializing VPTree for list: ${listName}`);

			this.colorListsParsed[listName] = [];

			// Only prepare for search, don't hydrate yet
			this.colorLists[listName] = this.colorLists[listName].map((c) =>
				prepareColorForSearch(c, this.colorListsParsed[listName]),
			);

			Object.freeze(this.colorLists[listName]);

			// Create regular and unique ClosestColor instances using VPTree for this list
			this.closestInstances[listName] = {
				regular: new Closest(
					this.colorListsParsed[listName] as unknown as Lab[],
					false,
				),
				unique: new Closest(
					this.colorListsParsed[listName] as unknown as Lab[],
					true,
				),
			};

			// Initialize name cache for this list
			this.colorNameCache[listName] = new LRUCache({
				max: MAX_NAME_CACHE_SIZE,
			});
		});

		// Cache everything at module level for future instances
		colorListsCache = this.colorLists;
		colorListsParsedCache = this.colorListsParsed;
		closestInstancesCache = this.closestInstances;
	}

	/**
	 * Validates that a list key exists
	 * @throws Error if list key is invalid
	 */
	validateListKey(listKey: string): boolean {
		if (!this.colorLists[listKey]) {
			throw new Error(`List key "${listKey}" is not valid.`);
		}
		return true;
	}

	/**
	 * Get available list keys
	 */
	getAvailableLists(): string[] {
		return Object.keys(this.colorLists);
	}

	/**
	 * Get all colors from a list
	 */
	getAllColors(listKey: string = "default"): RawColor[] {
		this.validateListKey(listKey);
		return this.colorLists[listKey];
	}

	/**
	 * Get the count of colors in a list
	 */
	getColorCount(listKey: string = "default"): number {
		this.validateListKey(listKey);
		return this.colorLists[listKey].length;
	}

	/**
	 * Returns all colors that match a name, ranked by similarity
	 * @param searchStr Search term
	 * @param listKey The color list to use
	 * @param maxResults Maximum number of results to return
	 */
	searchNames(
		searchStr: string,
		listKey: string = "default",
		maxResults: number = 20,
	): HydratedColor[] {
		this.validateListKey(listKey);
		const cache = this.colorNameCache[listKey];

		// Create cache key that includes maxResults to avoid conflicts
		const cacheKey = `${searchStr}:${maxResults}`;

		const cached = cache.get(cacheKey);
		if (cached) {
			return cached;
		}

		const searchLower = searchStr.toLowerCase();
		const scoredResults: Array<RawColor & { similarity: number }> = [];

		// Score all colors for similarity
		for (const color of this.colorLists[listKey]) {
			const nameLower = color.name.toLowerCase();
			const score = calculateSimilarityScore(
				searchStr,
				color.name,
				searchLower,
				nameLower,
			);

			if (score > 0) {
				scoredResults.push({
					...color,
					similarity: score,
				});
			}
		}

		// Sort by similarity score (descending) then by name length (ascending) for tiebreaking
		scoredResults.sort((a, b) => {
			if (Math.abs(a.similarity - b.similarity) < 0.001) {
				return a.name.length - b.name.length; // Shorter names first for same similarity
			}
			return b.similarity - a.similarity;
		});

		// Limit results but keep similarity score in output
		const results = scoredResults
			.slice(0, maxResults)
			.map((color) => hydrateColor(color));

		// Add to cache
		cache.set(cacheKey, results);

		return results;
	}

	/**
	 * Names an array of colors using VPTree for efficient search
	 * @param colorArr Array containing hex values without the hash
	 * @param unique If set to true every returned name will be unique
	 * @param listKey The color list to use
	 * @returns Array of hydrated colors or exhaustion errors
	 */
	getNamesForValues(
		colorArr: string[],
		unique: boolean = false,
		listKey: string = "default",
	): ColorNameResult[] {
		this.validateListKey(listKey);

		// Use the appropriate pre-built instance based on unique flag
		const localClosest = unique
			? this.closestInstances[listKey].unique
			: this.closestInstances[listKey].regular;

		// If using unique mode, clear any previous cache to start fresh
		if (unique) {
			localClosest.clearCache();
		}

		// In unique mode, check if we have enough colors before proceeding
		if (unique && colorArr.length > this.colorLists[listKey].length) {
			return [
				{
					error: `Too many colors requested in unique mode. Requested ${colorArr.length} colors but only ${this.colorLists[listKey].length} are available.`,
					availableCount: this.colorLists[listKey].length,
					totalCount: this.colorLists[listKey].length,
				},
			];
		}

		// Process each color one by one
		const results: ColorNameResult[] = [];

		for (const hex of colorArr) {
			// Parse color
			const parsed = parse(hex);
			if (!parsed) continue;

			// Get the closest named colors using VPTree
			// Pass hex as cache key to avoid expensive JSON.stringify in Closest.get
			const closestColor = localClosest.get(parsed as Lab, hex);

			// If no color was found (all unique colors used up) or we got an error response
			if (!closestColor) {
				continue;
			}
			if ("error" in closestColor) {
				results.push(closestColor as ColorExhaustionError);
				continue;
			}

			const color = this.colorLists[listKey][closestColor.index];
			const hydrated = hydrateColor(color);

			results.push({
				...hydrated,
				requestedHex: `#${hex}`,
				swatchImg: {
					svgNamed: `/v1/swatch/?color=${hex}&name=${encodeURI(color.name)}`,
					svg: `/v1/swatch/?color=${hex}`,
				},
				distance: parseFloat(
					distanceMetric(parsed, parse(color.hex) as Color).toFixed(5),
				),
			});
		}

		return results;
	}
}

/**
 * Calculate similarity score (0-1, where 1 is perfect match)
 */
function calculateSimilarityScore(
	searchStr: string,
	colorName: string,
	searchLower: string,
	nameLower: string,
): number {
	const maxLen = Math.max(searchStr.length, colorName.length);
	const minLen = Math.min(searchStr.length, colorName.length);

	// Optimization: Check for substring match
	if (nameLower.includes(searchLower)) {
		// Boost score for substring matches
		return 0.5 + 0.5 * (minLen / maxLen);
	}

	// Optimization: Skip Levenshtein if length difference is too large
	if (maxLen - minLen >= 0.5 * maxLen) {
		return 0;
	}

	// Pure Levenshtein similarity only
	const distance = levenshteinDistance(searchLower, nameLower);
	const similarity = 1 - distance / maxLen;
	// Only return matches above threshold to avoid too many irrelevant results
	return similarity > 0.5 ? similarity : 0;
}
