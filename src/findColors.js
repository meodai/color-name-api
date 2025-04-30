import {
  parse,
  converter,
  wcagLuminance,
  differenceCiede2000,
  wcagContrast,
} from 'culori';

import { lib } from './lib.js';
import ClosestColor from './closestColor.js';
import { LRUCache } from 'lru-cache';

const distanceMetric = differenceCiede2000();

/**
 * enriches color object and fills RGB color arrays
 * Warning: Not a pure function at all :D
 * @param   {object} colorObj hex representation of color
 * @param   {array} rgbColorArrRef reference to RGB color array
 * @return  {object} enriched color object
 */
const enrichColorObj = (colorObj, colorListParedRef) => {
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

  // populates array needed for VPTree search
  colorListParedRef.push(currentColor);
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
  localColorObj.luminanceWCAG = parseFloat(wcagLuminance(currentColor).toFixed(5));

  localColorObj.bestContrast = wcagContrast(currentColor, '#000') > wcagContrast(currentColor, '#fff') ? 'black' : 'white';

  localColorObj.swatchImg = {
    svgNamed: `/v1/swatch/?color=${localColorObj.hex.slice(1)}&name=${encodeURI(localColorObj.name)}`,
    svg: `/v1/swatch/?color=${localColorObj.hex.slice(1)}`,
  };

  return localColorObj;
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

    console.log('[FindColors] Initializing color lists and VP-trees for the first time');
    this.colorLists = colorsListsObj;

    // object containing the parsed colors for VPTree
    this.colorListsParsed = {};
    this.closestInstances = {};

    // prepare color array and create VPTree instances
    Object.keys(this.colorLists).forEach((listName) => {
      console.log(`[Color Finder] Initializing VPTree for list: ${listName}`);

      this.colorListsParsed[listName] = [];
      this.colorLists[listName] = this.colorLists[listName].map((c) =>
        enrichColorObj(c, this.colorListsParsed[listName])
      );


      Object.freeze(this.colorLists[listName]);
      
      // Create regular and unique ClosestColor instances using VPTree for this list
      this.closestInstances[listName] = {
        regular: new ClosestColor(this.colorListsParsed[listName], false),
        unique: new ClosestColor(this.colorListsParsed[listName], true)
      };
    });

    // Cache everything at module level for future instances
    colorListsCache = this.colorLists;
    colorListsParsedCache = this.colorListsParsed;
    closestInstancesCache = this.closestInstances;

    // prepare color name response cache
    this.colorNameCache = {};
    // add a key for each color list
    Object.keys(this.colorLists).forEach((listName) => {
      this.colorNameCache[listName] = new LRUCache({ max: MAX_NAME_CACHE_SIZE });
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
   * returns all colors that match a name
   * @param {string} searchStr search term
   * @param {boolean} bestOf    if set only returns good names
   */
  searchNames(searchStr, listKey = 'default') {
    this.validateListKey(listKey);
    const cache = this.colorNameCache[listKey];

    if (cache.has(searchStr)) {
      return cache.get(searchStr);
    }

    const results = this.colorLists[listKey].filter(
      (color) => color.name.toLowerCase().includes(searchStr.toLowerCase()),
    );

    // Add to cache - LRUCache handles size limit and eviction automatically
    cache.set(searchStr, results);

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

    // Process each color one by one
    return colorArr.map((hex) => {
      // parse color
      const parsed = parse(hex);

      // get the closest named colors using VPTree
      const closestColor = localClosest.get(parsed);
      
      // If no color was found (all unique colors used up)
      if (!closestColor) {
        return null;
      }
      
      const color = this.colorLists[listKey][closestColor.index];

      return {
        ...color,
        requestedHex: `#${hex}`,
        swatchImg: {
          svgNamed: `/v1/swatch/?color=${hex}&name=${encodeURI(color.name)}`,
          svg: `/v1/swatch/?color=${hex}`,
        },
        distance: parseFloat(
          distanceMetric(parsed, color.hex).toFixed(5),
        ),
      };
    }).filter(Boolean); // Remove any null values
  }
}
