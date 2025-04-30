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
      return this.cache.get(colorUID); // .get() automatically marks as recently used
    }

    if (
      this.unique &&
      this.previouslyReturnedIndexes.size >= this.list.length
    ) {
      return null;
    }

    const allCandidates = this.vpTree.search(searchObj, this.list.length);

    for (const candidate of allCandidates) {
      if (
        !this.unique ||
        !this.previouslyReturnedIndexes.has(candidate.index)
      ) {
        const result = {
          // Use the original color object from the list, not the parsed one used for search
          closest: this.originalList[candidate.index],
          index: candidate.index,
        };

        if (this.unique) {
          this.previouslyReturnedIndexes.add(result.index);
        } else {
          this.cache.set(colorUID, result);
        }

        return result;
      }
    }

    return null; // Should not happen if list is not empty
  }
}
