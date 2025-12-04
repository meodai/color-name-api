export const lib = {
  // return HSP luminance http://alienryderflex.com/hsp.html
  luminance: rgb =>
    Math.sqrt(
      (0.299 * rgb.r) ** 2 + (0.587 * rgb.g) ** 2 + (0.114 * rgb.b) ** 2
    ),
};

/**
 * Check if an object has a property
 * @param {Object} obj
 * @param {String} prop
 * @return {Boolean}
 */
export const hasOwn = (obj, prop) => Object.hasOwn(obj, prop);

export function createColorRecord({ paletteTitle, colors, list }) {
  const parsedColors = [];
  // Check if colors is array
  if (Array.isArray(colors)) {
    colors.forEach(color => {
      // Check if requestedHex is part of the color object
      const { name, hex, requestedHex = '' } = color;
      parsedColors.push({ name, hex, requestedHex });
    });
  }
  return { paletteTitle, list, parsedColors };
}
