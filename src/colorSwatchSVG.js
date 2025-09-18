/**
 * @param {string} colorValue color value in a CSS compatible format
 * @param {string} colorName color name
 * @return {string} svg string
 */
export const svgTemplate = (colorValue, colorName) => {
  let name = colorName;
  if (colorName && colorName.length > 19) {
    name = `${colorName.substring(0, 19)}…`;
  }

  return `
    <svg viewBox="0 0 100 ${colorName ? 127 : 100}" xmlns="http://www.w3.org/2000/svg">
      <style>
        text {
          font: 12px sans-serif; 
          font-weight: bold;
          fill: #202125;
        }
        text.val {
          font-size: 8px;
          font-weight: normal;
        }
      </style>
      <rect width="100" height="100" fill="${colorValue}" />
      ${
        colorName
          ? `
        <rect y="100" x="0" width="100" height="27" fill="#fff" />
        <text y="113" x="3">${colorValue}</text>
        <text y="122" x="3" class="val">${name}</text>
      `
          : ''
      }
    </svg>`
    .replace(/\s+/g, ' ')
    .trim();
};
