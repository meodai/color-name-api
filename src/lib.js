const RGB_HEX = /^#?(?:([\da-f]{3})[\da-f]?|([\da-f]{6})(?:[\da-f]{2})?)$/i;

export const lib = {
  // return HSP luminance http://alienryderflex.com/hsp.html
  luminance: (rgb) => (Math.sqrt(
      Math.pow(0.299 * rgb.r, 2) +
      Math.pow(0.587 * rgb.g, 2) +
      Math.pow(0.114 * rgb.b, 2)
  )),

  /**
   * disassembles a HEX color to its RGB components
   * https: //gist.github.com/comficker/871d378c535854c1c460f7867a191a5a#gistcomment-2615849
   * @param   {string} hexSrt hex color representatin
   * @return  {object} {r,g,b}
   */
  hexToRgb: (hexSrt) => {
    const [, short, long] = String(hexSrt).match(RGB_HEX) || [];

    if (long) {
      const value = Number.parseInt(long, 16);
      return {
        r: value >> 16,
        g: value >> 8 & 0xFF,
        b: value & 0xFF,
      };
    } else if (short) {
      const rgbArray = Array.from(short,
          (s) => Number.parseInt(s, 16)
      ).map((n) => (n << 4) | n);
      return {
        r: rgbArray[0],
        g: rgbArray[1],
        b: rgbArray[2],
      };
    }
  },

  /**
   * Converts an RGB color value to HSL. Conversion formula
   * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
   * Assumes r, g, and b are contained in the set [0, 255] and
   * returns h, s, and l in the set [0, 1].
   *
   * @param   {Number}  r       The red color value
   * @param   {Number}  g       The green color value
   * @param   {Number}  b       The blue color value
   * @return  {Object}          The HSL representation
   */
  rgbToHsl: (r, g, b) => {
    r = r / 255;
    g = g / 255;
    b = b / 255;

    const min = Math.min(r, g, b);
    const max = Math.max(r, g, b);
    const delta = max - min;

    let h;
    let s;
    let l;

    if (max === min) {
      h = 0;
    } else if (r === max) {
      h = (g - b) / delta;
    } else if (g === max) {
      h = 2 + (b - r) / delta;
    } else if (b === max) {
      h = 4 + (r - g) / delta;
    }

    h = Math.min(h * 60, 360);

    if (h < 0) {
      h += 360;
    }

    l = (min + max) / 2;

    if (max === min) {
      s = 0;
    } else if (l <= 0.5) {
      s = delta / (max + min);
    } else {
      s = delta / (2 - max - min);
    }

    s *= 100;
    l *= 100;
    return {
      h,
      s,
      l,
    };
  },

  /**
   * calculates the distabce between two RGB colors
   * @param {object} rgb1 object containing r,g and b properties
   * @param {object} rgb2 object containing r,g and b properties
   * @return {int} distance
   */
  distance: (rgb1, rgb2) => (
    Math.sqrt(
        Math.pow(rgb1.r - rgb2.r, 2) +
        Math.pow(rgb1.g - rgb2.g, 2) +
        Math.pow(rgb1.b - rgb2.b, 2)
    )
  ),
};
