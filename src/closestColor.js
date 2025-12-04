import { differenceCiede2000 } from 'culori';
import { LRUCache } from 'lru-cache';
import { VPTree } from './vptree.js';

// Define cache size limit
const MAX_CLOSEST_CACHE_SIZE = 5000; // Max entries in the instance cache

/**
 * Return closest color from a given list
 * uses VPTree for faster searches and caching for performance.
 * Has the ability to return every match only once.
 */
export default class Closest {
  constructor(colorList, unique, metric = differenceCiede2000()) {
    this.originalList = colorList;
    this.list = colorList.map((color, i) => ({ color, index: i }));
    this.unique = unique;
    this.metric = (a, b) => metric(a.color, b.color);
    this.vpTree = new VPTree(this.list, this.metric);
    this.clearCache();
  }

  clearCache(indexOnly = this.unique) {
    if (!indexOnly) {
      this.cache = new LRUCache({ max: MAX_CLOSEST_CACHE_SIZE });
    }
    this.previouslyReturnedIndexes = new Set();
  }

  /**
   * Returns the number of available colors remaining when in unique mode
   * @returns {number} Number of colors still available
   */
  getAvailableColorsCount() {
    if (!this.unique) {
      return this.list.length; // In non-unique mode, all colors are always available
    }
    return this.list.length - this.previouslyReturnedIndexes.size;
  }

  get(searchColor, cacheKey = null) {
    const searchObj = { color: searchColor, index: -1 };
    const colorUID = cacheKey || JSON.stringify(searchColor); // Use provided key or stringified color

    if (!this.unique && this.cache.has(colorUID)) {
      return this.cache.get(colorUID);
    }

    // Check if all colors have been used in unique mode
    if (
      this.unique &&
      this.previouslyReturnedIndexes.size >= this.list.length
    ) {
      return {
        error: 'All available colors have been exhausted',
        availableCount: 0,
        totalCount: this.list.length,
      };
    }

    // Determine how many results we need from the VP-tree search
    let maxResultsNeeded;

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
        const result = {
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
        const result = {
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
}
