import {
  parse,
  converter,
  wcagLuminance,
  differenceCiede2000,
} from 'culori';

import { lib } from './lib.js';
import ClosestColor from './closestColor.js';

const distanceMetric = differenceCiede2000();

/**
 * enriches color object and fills RGB color arrays
 * Warning: Not a pure function at all :D
 * @param   {object} colorObj hex representation of color
 * @param   {array} rgbColorArrRef reference to RGB color array
 * @return  {object} enriched color object
 */
const enrichColorObj = (colorObj, colorListParedRef) => {
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

  // populates array needed for ClosestVector()
  colorListParedRef.push(currentColor);
  // transform hex to RGB
  colorObj.rgb = rgbInt;
  // get hsl color value
  colorObj.hsl = hslInt;

  colorObj.lab = {
    l: parseFloat(ccLab.l.toFixed(5)),
    a: parseFloat(ccLab.a.toFixed(5)),
    b: parseFloat(ccLab.b.toFixed(5)),
  };

  // calculate luminancy for each color

  colorObj.luminance = parseFloat(lib.luminance(rgbInt).toFixed(5));
  colorObj.luminanceWCAG = parseFloat(wcagLuminance(currentColor).toFixed(5));

  colorObj.swatchImg = {
    svgNamed: `/v1/swatch/?color=${colorObj.hex.slice(1)}&name=${encodeURI(colorObj.name)}`,
    svg: `/v1/swatch/?color=${colorObj.hex.slice(1)}`,
  };

  return colorObj;
};

export class FindColors {
  constructor(colorsListsObj) {
    this.colorLists = colorsListsObj;

    // object containing the name:hex pairs for nearestColor()
    this.colorListsParsed = {};
    this.closestInstances = {};

    // prepare color array
    Object.keys(this.colorLists).forEach((listName) => {
      this.colorListsParsed[listName] = [];

      this.colorLists[listName].forEach((c) => {
        enrichColorObj(c, this.colorListsParsed[listName]);
      });

      Object.freeze(this.colorLists[listName]);
      this.closestInstances[listName] = new ClosestColor(
        this.colorListsParsed[listName],
      );
    });
  }

  _validateListKey(listKey) {
    if (!this.colorLists[listKey]) {
      throw new Error(`List key "${listKey}" is not valid.`);
    } else {
      return true;
    }
  }

  /**
   * returns all colors that match a name
   * @param {string} searchStr search term
   * @param {boolen} bestOf    if set only returns good names
   */
  searchNames(searchStr, listKey = 'default') {
    this._validateListKey(listKey);
    return this.colorLists[listKey].filter(
      (color) => color.name.toLowerCase().includes(searchStr.toLowerCase()),
    );
  }

  /**
   * names an array of colors
   * @param   {array} colorArr array containing hex values without the hash
   * @param   {boolean} unique if set to true every returned name will be unque
   * @param   {boolean} bestOf if set only returns good names
   * @return  {object}         object containing all nearest colors
   */
  getNamesForValues(colorArr, unique = false, listKey = 'default') {
    let localClosest = this.closestInstances[listKey];

    if (unique) {
      localClosest = new ClosestColor(
        this.colorListsParsed[listKey],
        true,
      );
    }

    let lastResult = null;

    const colorResp = colorArr.map((hex) => {
      // parse color
      const parsed = parse(hex);

      // get the closest named colors

      let closestColor = localClosest.get(parsed);

      if (closestColor && unique) {
        lastResult = closestColor;
      } else if (unique) {
        closestColor = lastResult;
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
          distanceMetric(color.hex, parsed).toFixed(5),
        ),
      };
    });

    if (unique) {
      localClosest.clearCache();
    }

    return colorResp;
  }
}
