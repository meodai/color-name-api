/**
 * Color name search routes
 * Handles /v1/names/ endpoint
 */

import type { Context } from "hono";
import { Hono } from "hono";
import type { FindColors } from "../lib/index";

// Create router
const names = new Hono();

// Will be initialized by colorService
let findColors: FindColors | null = null;
let availableLists: string[] = [];

/**
 * Initialize names route with color data
 */
export function initNamesRoute(finder: FindColors, listNames: string[]): void {
	findColors = finder;
	availableLists = listNames;
}

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
		status as 400 | 500,
	);
}

/**
 * Handle name search logic
 */
async function handleNameSearch(c: Context) {
	if (!findColors) {
		return errorResponse(c, 500, "Color service not initialized");
	}

	// Get query from path param or query string
	const query = c.req.param("query") || c.req.query("name") || "";
	const list = c.req.query("list") || "default";
	const maxResultsParam = c.req.query("maxResults");

	// Configurable search result limits
	const defaultMaxResults = parseInt(
		process.env.DEFAULT_SEARCH_RESULTS || "20",
		10,
	);
	const maxResultsLimit = parseInt(process.env.MAX_SEARCH_RESULTS || "50", 10);
	const maxResults = Math.min(
		parseInt(maxResultsParam || String(defaultMaxResults), 10),
		maxResultsLimit,
	);

	// Validate list
	if (!availableLists.includes(list)) {
		return errorResponse(
			c,
			400,
			`Invalid list. Available: ${availableLists.join(", ")}`,
		);
	}

	// Validate query length
	if (query.length < 3) {
		return errorResponse(c, 400, "Search query must be at least 3 characters");
	}

	// Search for matching color names
	const results = findColors.searchNames(query, list, maxResults);

	return c.json({
		colors: results,
	});
}

/**
 * GET /v1/names/
 * Search for colors by name using query param
 */
names.get("/", handleNameSearch);

/**
 * GET /v1/names/:query
 * Search for colors by name using path param
 */
names.get("/:query", handleNameSearch);

export default names;
