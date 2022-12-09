export const lib = {
  // return HSP luminance http://alienryderflex.com/hsp.html
  luminance: (rgb) => (Math.sqrt(
    (0.299 * rgb.r) ** 2
      + (0.587 * rgb.g) ** 2
      + (0.114 * rgb.b) ** 2,
  )),
};
