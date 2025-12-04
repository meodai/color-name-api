/**
 * SVG color swatch template generation
 */

/**
 * Generate an SVG color swatch
 * @param colorValue Color value in CSS-compatible format (e.g., "#ff0000")
 * @param colorName Optional color name to display
 * @returns SVG string
 */
export function svgTemplate(colorValue: string, colorName?: string): string {
	let name = colorName;
	if (colorName && colorName.length > 19) {
		name = `${colorName.substring(0, 19)}…`;
	}

	const height = colorName ? 127 : 100;
	const nameSection = colorName
		? `
        <rect y="100" x="0" width="100" height="27" fill="#fff" />
        <text y="113" x="3">${colorValue}</text>
        <text y="122" x="3" class="val">${name}</text>
      `
		: "";

	return `
    <svg viewBox="0 0 100 ${height}" xmlns="http://www.w3.org/2000/svg">
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
      ${nameSection}
    </svg>`
		.replace(/\s+/g, " ")
		.trim();
}
