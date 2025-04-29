import { differenceCiede2000 } from "culori";
import { hasOwnProperty } from "./lib.js";
import { VPTree } from "./vptree.js";

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
    if (!indexOnly) this.cache = {};
    this.previouslyReturnedIndexes = new Set();
  }

  get(searchColor) {
    const searchObj = { color: searchColor, index: -1 };
    const colorUID = JSON.stringify(searchColor);

    if (!this.unique && hasOwnProperty(this.cache, colorUID)) {
      return this.cache[colorUID];
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
          closest: candidate.color,
          index: candidate.index,
        };

        if (this.unique) {
          this.previouslyReturnedIndexes.add(result.index);
        }

        this.cache[colorUID] = result;
        return result;
      }
    }

    return null;
  }
}
