/**
 * Color lookup routes
 * Handles /v1/ and /v1/:colors endpoints
 */

import type { Context } from "hono";
import { Hono } from "hono";
import {
	type FindColors,
	getPaletteTitle,
	hydrateColor,
	isExhaustionError,
} from "../lib/index";
import { getClientInfo } from "../services/geoipService";
import { emitColorLookup, isSocketEnabled } from "../services/socketService";
import type { HydratedColor, RawColor } from "../types";

// Create router
const colors = new Hono();

// Max colors per request (configurable via env)
const MAX_COLORS_PER_REQUEST = parseInt(
	process.env.MAX_COLORS_PER_REQUEST || "170",
	10,
);

// Will be initialized by colorService
let findColors: FindColors | null = null;
let colorLists: Record<string, RawColor[]> = {};
let availableLists: string[] = [];

/**
 * Initialize colors route with color data
 */
export function initColorsRoute(
	finder: FindColors,
	lists: Record<string, RawColor[]>,
	listNames: string[],
): void {
	findColors = finder;
	colorLists = lists;
	availableLists = listNames;
}

/**
 * Validate hex color format
 */
function isValidHex(hex: string): boolean {
	return /^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(hex);
}

/**
 * Parse and validate hex colors from string
 */
function parseHexColors(values: string): {
	valid: string[];
	invalid: string[];
} {
	const hexColors = values.toLowerCase().split(",").filter(Boolean);
	const valid: string[] = [];
	const invalid: string[] = [];

	for (const hex of hexColors) {
		if (isValidHex(hex)) {
			valid.push(hex);
		} else {
			invalid.push(hex);
		}
	}

	return { valid, invalid };
}

/**
 * Create error response
 */
function errorResponse(
	c: Context,
	status: number,
	message: string,
	extra?: Record<string, unknown>,
) {
	return c.json(
		{
			error: {
				status,
				message,
				...extra,
			},
		},
		status as 400 | 404 | 409 | 500,
	);
}

/**
 * GET /v1/
 * Get all colors or specific colors by hex values
 */
colors.get("/", async (c) => {
	if (!findColors) {
		return errorResponse(c, 500, "Color service not initialized");
	}

	const values = c.req.query("values");
	const list = c.req.query("list") || "default";
	const noduplicates = c.req.query("noduplicates") === "true";

	// Validate list
	if (!availableLists.includes(list)) {
		return errorResponse(
			c,
			400,
			`Invalid list. Available: ${availableLists.join(", ")}`,
		);
	}

	// No values = return all colors from list
	if (!values) {
		const allColors = colorLists[list].map(hydrateColor);
		const paletteTitle = `All ${list} colors`;

		// Broadcast first 50 colors to Socket.IO clients
		if (isSocketEnabled()) {
			const { clientLocation } = getClientInfo(c);
			emitColorLookup(paletteTitle, allColors.slice(0, 50), list, {
				url: c.req.url,
				method: c.req.method,
				xReferrer: c.req.header("referer") || null,
				clientLocation,
			});
		}

		return c.json({
			paletteTitle,
			colors: allColors,
		});
	}

	// Parse and validate hex colors
	const { valid: hexColors, invalid: invalidColors } = parseHexColors(values);

	if (invalidColors.length > 0) {
		return errorResponse(
			c,
			400,
			`Invalid hex colors: ${invalidColors.join(", ")}`,
		);
	}

	if (hexColors.length === 0) {
		return errorResponse(c, 400, "No valid hex colors provided");
	}

	if (hexColors.length > MAX_COLORS_PER_REQUEST) {
		return errorResponse(
			c,
			400,
			`Maximum ${MAX_COLORS_PER_REQUEST} colors per request`,
		);
	}

	// Get color names
	const colorResults = findColors.getNamesForValues(
		hexColors,
		noduplicates,
		list,
	);

	// Check for exhaustion error (when unique mode runs out of colors)
	const exhaustionError = colorResults.find(isExhaustionError);
	if (exhaustionError && isExhaustionError(exhaustionError)) {
		return errorResponse(c, 409, exhaustionError.error, {
			availableCount: exhaustionError.availableCount,
			totalCount: exhaustionError.totalCount,
		});
	}

	// Build response
	const hydratedColors = colorResults as HydratedColor[];
	const paletteTitle =
		hexColors.length === 1
			? hydratedColors[0]?.name || "Unknown"
			: getPaletteTitle(hydratedColors.map((color) => color.name));

	// Broadcast to connected Socket.IO clients
	if (isSocketEnabled()) {
		const { clientLocation } = getClientInfo(c);
		emitColorLookup(paletteTitle, hydratedColors, list, {
			url: c.req.url,
			method: c.req.method,
			xReferrer: c.req.header("referer") || null,
			clientLocation,
		});
	}

	return c.json({
		paletteTitle,
		colors: hydratedColors,
	});
});

/**
 * GET /v1/:colors
 * Get colors by hex values in path (e.g., /v1/ff0000,00ff00)
 */
colors.get("/:colors", async (c) => {
	const colorsParam = c.req.param("colors");

	// Check if it looks like hex colors
	if (!/^[0-9a-f,]+$/i.test(colorsParam)) {
		return errorResponse(c, 404, "Invalid path");
	}

	// Redirect to main handler with values query param
	const url = new URL(c.req.url);
	url.searchParams.set("values", colorsParam);

	// Forward all other query params
	const list = c.req.query("list");
	const noduplicates = c.req.query("noduplicates");
	if (list) url.searchParams.set("list", list);
	if (noduplicates) url.searchParams.set("noduplicates", noduplicates);

	// Construct new path
	const newPath = `/v1/${url.search}`;
	return c.redirect(newPath);
});

export default colors;
