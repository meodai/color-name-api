/**
 * Closest color finder using VP-Tree for efficient nearest neighbor search
 * Supports unique mode where each color can only be returned once
 */

import type { Lab } from "culori";
import { differenceCiede2000 } from "culori";
import { LRUCache } from "lru-cache";
import type {
	ColorExhaustionError,
	ColorSearchResult,
	RawColor,
} from "../types";
import { VPTree } from "./vptree";

// Define cache size limit
const MAX_CLOSEST_CACHE_SIZE = 5000;

/**
 * Internal indexed color with parsed Lab values
 */
interface IndexedParsedColor {
	color: Lab;
	index: number;
}

/**
 * Result from the closest color search
 */
type ClosestResult = ColorSearchResult | ColorExhaustionError | null;

/**
 * Return closest color from a given list
 * Uses VP-Tree for faster searches and caching for performance.
 * Has the ability to return every match only once (unique mode).
 */
export default class Closest {
	private originalList: RawColor[];
	private list: IndexedParsedColor[];
	private unique: boolean;
	private metric: (a: IndexedParsedColor, b: IndexedParsedColor) => number;
	private vpTree: VPTree<IndexedParsedColor>;
	private cache: LRUCache<string, ColorSearchResult>;
	private previouslyReturnedIndexes: Set<number>;

	/**
	 * Creates a new Closest instance for finding nearest colors
	 * @param colorList Array of parsed Lab colors
	 * @param unique Whether to return each color only once
	 * @param metric Distance function (defaults to CIEDE2000)
	 */
	constructor(
		colorList: Lab[],
		unique: boolean,
		metric: (a: Lab, b: Lab) => number = differenceCiede2000(),
	) {
		this.originalList = colorList as unknown as RawColor[];
		this.list = colorList.map((color, index) => ({ color, index }));
		this.unique = unique;
		this.metric = (a: IndexedParsedColor, b: IndexedParsedColor) =>
			metric(a.color, b.color);
		this.vpTree = new VPTree(this.list, this.metric);
		this.cache = new LRUCache({ max: MAX_CLOSEST_CACHE_SIZE });
		this.previouslyReturnedIndexes = new Set();
	}

	/**
	 * Clears the cache and optionally the returned indexes
	 * @param indexOnly Only clear the returned indexes (for unique mode resets)
	 */
	clearCache(indexOnly: boolean = this.unique): void {
		if (!indexOnly) {
			this.cache = new LRUCache({ max: MAX_CLOSEST_CACHE_SIZE });
		}
		this.previouslyReturnedIndexes = new Set();
	}

	/**
	 * Returns the number of available colors remaining when in unique mode
	 * @returns Number of colors still available
	 */
	getAvailableColorsCount(): number {
		if (!this.unique) {
			return this.list.length; // In non-unique mode, all colors are always available
		}
		return this.list.length - this.previouslyReturnedIndexes.size;
	}

	/**
	 * Find the closest color to the search color
	 * @param searchColor The Lab color to find a match for
	 * @param cacheKey Optional custom cache key
	 * @returns The closest color result, exhaustion error, or null
	 */
	get(searchColor: Lab, cacheKey: string | null = null): ClosestResult {
		const searchObj: IndexedParsedColor = { color: searchColor, index: -1 };
		const colorUID = cacheKey || JSON.stringify(searchColor);

		// Check cache for non-unique mode
		if (!this.unique && this.cache.has(colorUID)) {
			const cached = this.cache.get(colorUID);
			if (cached) return cached;
		}

		// Check if all colors have been used in unique mode
		if (
			this.unique &&
			this.previouslyReturnedIndexes.size >= this.list.length
		) {
			return {
				error: "All available colors have been exhausted",
				availableCount: 0,
				totalCount: this.list.length,
			};
		}

		// Determine how many results we need from the VP-tree search
		let maxResultsNeeded: number;

		if (this.unique) {
			// Use a reasonable batch size instead of the entire list
			// Start with a smaller number of results for better performance
			// 500 is a good balance between performance and accuracy
			maxResultsNeeded = Math.min(500, this.list.length);

			// If we've already used a large percentage of colors, increase the batch size
			// to improve chances of finding unused colors
			if (this.previouslyReturnedIndexes.size > this.list.length * 0.8) {
				maxResultsNeeded = Math.min(2000, this.list.length);
			}
		} else {
			maxResultsNeeded = 1;
		}

		const candidates = this.vpTree.search(searchObj, maxResultsNeeded);

		// If not unique, the first candidate is the result (if found)
		if (!this.unique) {
			if (candidates.length > 0) {
				const result: ColorSearchResult = {
					closest: this.originalList[candidates[0].index],
					index: candidates[0].index,
				};
				this.cache.set(colorUID, result);
				return result;
			} else {
				return null; // Should not happen if list is not empty
			}
		}

		// If unique, iterate through candidates to find the first available one
		for (const candidate of candidates) {
			if (!this.previouslyReturnedIndexes.has(candidate.index)) {
				const result: ColorSearchResult = {
					closest: this.originalList[candidate.index],
					index: candidate.index,
				};
				this.previouslyReturnedIndexes.add(result.index);
				// No caching needed for unique results as they change each time
				return result;
			}
		}

		return null; // All colors have been returned
	}

	/**
	 * Check if this is a color exhaustion error
	 */
	static isExhaustionError(
		result: ClosestResult,
	): result is ColorExhaustionError {
		return result !== null && "error" in result;
	}

	/**
	 * Check if this is a valid search result
	 */
	static isSearchResult(result: ClosestResult): result is ColorSearchResult {
		return result !== null && "closest" in result;
	}
}
