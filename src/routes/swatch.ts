/**
 * SVG color swatch routes
 * Handles /v1/swatch/ endpoint
 */

import type { Context } from "hono";
import { Hono } from "hono";
import { svgTemplate } from "../lib/index";

// Create router
const swatch = new Hono();

/**
 * Create error response
 */
function errorResponse(c: Context, status: number, message: string) {
	return c.json(
		{
			error: {
				status,
				message,
			},
		},
		status as 400,
	);
}

/**
 * Validate hex color format (without #)
 */
function isValidHex(hex: string): boolean {
	return /^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(hex);
}

/**
 * GET /v1/swatch/
 * Generate SVG color swatch
 */
swatch.get("/", async (c) => {
	const color = c.req.query("color");
	const name = c.req.query("name");

	// Validate color parameter
	if (!color) {
		return errorResponse(c, 400, "Color parameter is required");
	}

	if (!isValidHex(color)) {
		return errorResponse(
			c,
			400,
			"Invalid hex color format. Use 3 or 6 hex characters without #",
		);
	}

	// Generate SVG
	const svg = svgTemplate(`#${color}`, name || undefined);

	// Return SVG response
	return new Response(svg, {
		status: 200,
		headers: {
			"Content-Type": "image/svg+xml",
			"Cache-Control": "public, max-age=31536000", // Cache for 1 year
		},
	});
});

export default swatch;
