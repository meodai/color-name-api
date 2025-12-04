import {
  converter,
  differenceCiede2000,
  parse,
  wcagContrast,
  wcagLuminance,
} from 'culori';
import { distance as levenshteinDistance } from 'fastest-levenshtein';
import { LRUCache } from 'lru-cache';
import ClosestColor from './closestColor.js';
import { lib } from './lib.js';

const distanceMetric = differenceCiede2000();

/**
 * Hydrates a color object with calculated properties (RGB, HSL, Lab, etc.)
 * This is done on-demand only for colors that are being returned to the client.
 * @param   {object} colorObj Source color object with hex and name
 * @return  {object} Enriched color object
 */
export const hydrateColor = colorObj => {
  const localColorObj = { ...colorObj };
  const currentColor = parse(colorObj.hex);
  const lab = converter('lab');
  const rgb = converter('rgb');
  const hsl = converter('hsl');

  const ccLab = lab(currentColor);

  const rgbFloat = rgb(currentColor);
  const rgbInt = {
    r: Math.round(rgbFloat.r * 255),
    g: Math.round(rgbFloat.g * 255),
    b: Math.round(rgbFloat.b * 255),
  };
  const hslFloat = hsl(currentColor);
  const hslInt = {
    h: Math.round(hslFloat.h || 0),
    s: parseFloat((100 * hslFloat.s).toFixed(5)),
    l: parseFloat((100 * hslFloat.l).toFixed(5)),
  };

  // transform hex to RGB
  localColorObj.rgb = rgbInt;
  // get hsl color value
  localColorObj.hsl = hslInt;

  localColorObj.lab = {
    l: parseFloat(ccLab.l.toFixed(5)),
    a: parseFloat(ccLab.a.toFixed(5)),
    b: parseFloat(ccLab.b.toFixed(5)),
  };

  // calculate luminancy for each color
  localColorObj.luminance = parseFloat(lib.luminance(rgbInt).toFixed(5));
  localColorObj.luminanceWCAG = parseFloat(
    wcagLuminance(currentColor).toFixed(5)
  );

  localColorObj.bestContrast =
    wcagContrast(currentColor, '#000') > wcagContrast(currentColor, '#fff')
      ? 'black'
      : 'white';

  localColorObj.swatchImg = {
    svgNamed: `/v1/swatch/?color=${localColorObj.hex.slice(1)}&name=${encodeURI(localColorObj.name)}`,
    svg: `/v1/swatch/?color=${localColorObj.hex.slice(1)}`,
  };

  return localColorObj;
};

/**
 * Prepares color for search index (VPTree)
 * @param   {object} colorObj hex representation of color
 * @param   {array} colorListParedRef reference to RGB color array
 * @return  {object} original color object (unchanged)
 */
const prepareColorForSearch = (colorObj, colorListParedRef) => {
  const currentColor = parse(colorObj.hex);
  // populates array needed for VPTree search
  colorListParedRef.push(currentColor);
  return colorObj;
};

// Initialize color lists and VPTrees just once at module level
let colorListsCache = null;
let colorListsParsedCache = {};
let closestInstancesCache = {};

// Define cache size limits
const MAX_NAME_CACHE_SIZE = 1000; // Max entries per list in colorNameCache

export class FindColors {
  constructor(colorsListsObj) {
    // If we already have the cache, use it instead of rebuilding everything
    if (colorListsCache) {
      this.colorLists = colorListsCache;
      this.colorListsParsed = colorListsParsedCache;
      this.closestInstances = closestInstancesCache;
      console.log('[FindColors] Using cached VP-trees');
      return;
    }

    console.log(
      '[FindColors] Initializing color lists and VP-trees for the first time'
    );
    this.colorLists = colorsListsObj;

    // object containing the parsed colors for VPTree
    this.colorListsParsed = {};
    this.closestInstances = {};

    // prepare color array and create VPTree instances
    Object.keys(this.colorLists).forEach(listName => {
      console.log(`[Color Finder] Initializing VPTree for list: ${listName}`);

      this.colorListsParsed[listName] = [];
      // Only prepare for search, don't hydrate yet
      this.colorLists[listName] = this.colorLists[listName].map(c =>
        prepareColorForSearch(c, this.colorListsParsed[listName])
      );

      Object.freeze(this.colorLists[listName]);

      // Create regular and unique ClosestColor instances using VPTree for this list
      this.closestInstances[listName] = {
        regular: new ClosestColor(this.colorListsParsed[listName], false),
        unique: new ClosestColor(this.colorListsParsed[listName], true),
      };
    });

    // Cache everything at module level for future instances
    colorListsCache = this.colorLists;
    colorListsParsedCache = this.colorListsParsed;
    closestInstancesCache = this.closestInstances;

    // prepare color name response cache
    this.colorNameCache = {};
    // add a key for each color list
    Object.keys(this.colorLists).forEach(listName => {
      this.colorNameCache[listName] = new LRUCache({
        max: MAX_NAME_CACHE_SIZE,
      });
    });
  }

  validateListKey(listKey) {
    if (!this.colorLists[listKey]) {
      throw new Error(`List key "${listKey}" is not valid.`);
    } else {
      return true;
    }
  }

  /**
   * returns all colors that match a name, ranked by similarity
   * @param {string} searchStr search term
   * @param {string} listKey the color list to use
   * @param {number} maxResults maximum number of results to return (default: 50)
   */
  searchNames(searchStr, listKey = 'default', maxResults = 20) {
    this.validateListKey(listKey);
    const cache = this.colorNameCache[listKey];

    // Create cache key that includes maxResults to avoid conflicts
    const cacheKey = `${searchStr}:${maxResults}`;

    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    const searchLower = searchStr.toLowerCase();
    const scoredResults = [];

    // Score all colors for similarity
    for (const color of this.colorLists[listKey]) {
      const nameLower = color.name.toLowerCase();
      const score = calculateSimilarityScore(
        searchStr,
        color.name,
        searchLower,
        nameLower
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
      .map(color => hydrateColor(color));

    // Add to cache - LRUCache handles size limit and eviction automatically
    cache.set(cacheKey, results);

    return results;
  }

  /**
   * names an array of colors using VPTree for efficient search
   * @param   {array} colorArr array containing hex values without the hash
   * @param   {boolean} unique if set to true every returned name will be unique
   * @param   {string} listKey the color list to use
   * @return  {object}         object containing all nearest colors
   */
  getNamesForValues(colorArr, unique = false, listKey = 'default') {
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
      // Construct an error object that matches our pattern
      return [
        {
          error: `Too many colors requested in unique mode. Requested ${colorArr.length} colors but only ${this.colorLists[listKey].length} are available.`,
          availableCount: this.colorLists[listKey].length,
          totalCount: this.colorLists[listKey].length,
          requestedCount: colorArr.length,
        },
      ];
    }

    // Process each color one by one
    return colorArr
      .map(hex => {
        // parse color
        const parsed = parse(hex);

        // get the closest named colors using VPTree
        // Pass hex as cache key to avoid expensive JSON.stringify in Closest.get
        const closestColor = localClosest.get(parsed, hex);

        // If no color was found (all unique colors used up) or we got an error response
        if (!closestColor) {
          return null;
        } else if (closestColor.error) {
          // If we got an error object instead of a color (happens when all colors are exhausted)
          return closestColor;
        }

        const color = this.colorLists[listKey][closestColor.index];
        const hydrated = hydrateColor(color);

        return {
          ...hydrated,
          requestedHex: `#${hex}`,
          swatchImg: {
            svgNamed: `/v1/swatch/?color=${hex}&name=${encodeURI(color.name)}`,
            svg: `/v1/swatch/?color=${hex}`,
          },
          distance: parseFloat(distanceMetric(parsed, color.hex).toFixed(5)),
        };
      })
      .filter(Boolean); // Remove any null values
  }
}

// Calculate similarity score (0-1, where 1 is perfect match)
function calculateSimilarityScore(
  searchStr,
  colorName,
  searchLower,
  nameLower
) {
  // Optimization: Skip Levenshtein if length difference is too large
  // We need similarity > 0.5.
  // Similarity = 1 - distance / maxLen.
  // So we need 1 - distance / maxLen > 0.5 => distance < 0.5 * maxLen.
  // Since distance >= abs(lenA - lenB), if abs(lenA - lenB) >= 0.5 * maxLen,
  // then distance >= 0.5 * maxLen, so similarity <= 0.5.
  const maxLen = Math.max(searchStr.length, colorName.length);
  const minLen = Math.min(searchStr.length, colorName.length);

  // Optimization: Check for substring match
  if (nameLower.includes(searchLower)) {
    // Boost score for substring matches to ensure they pass the threshold
    // and are ranked by length ratio (shorter matches are better)
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
