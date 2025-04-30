import { differenceCiede2000 } from "culori";
import { hasOwnProperty } from "./lib.js";
import { VPTree } from "./vptree.js";
import { LRUCache } from 'lru-cache';

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
    this.clearCache(false);
  }

  clearCache(indexOnly = this.unique) {
    if (!indexOnly) {
      this.cache = new LRUCache({ max: MAX_CLOSEST_CACHE_SIZE });
    }
    this.previouslyReturnedIndexes = new Set();
  }

  get(searchColor) {
    const searchObj = { color: searchColor, index: -1 };
    const colorUID = JSON.stringify(searchColor); // Use stringified color as cache key

    if (!this.unique && this.cache.has(colorUID)) {
      return this.cache.get(colorUID); 
    }

    if (
      this.unique &&
      this.previouslyReturnedIndexes.size >= this.list.length
    ) {
      return null;
    }

    // Determine how many results we need from the VP-tree search
    let maxResultsNeeded;
    
    if (this.unique) {
      maxResultsNeeded = this.list.length;
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
