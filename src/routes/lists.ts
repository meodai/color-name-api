/**
 * Color lists metadata routes
 * Handles /v1/lists/ endpoint
 */

import type { Context } from "hono";
import { Hono } from "hono";
import type { ColorListMeta } from "../types";

// Create router
const lists = new Hono();

// Will be initialized by colorService
let availableLists: string[] = [];
let listMeta: Record<string, ColorListMeta> = {};

/**
 * Initialize lists route with metadata
 */
export function initListsRoute(
	listNames: string[],
	meta: Record<string, ColorListMeta>,
): void {
	availableLists = listNames;
	listMeta = meta;
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
		status as 400,
	);
}

/**
 * GET /v1/lists/
 * Get available color lists and their metadata
 */
lists.get("/", async (c) => {
	const listKey = c.req.query("list");

	// If specific list requested, return its metadata
	if (listKey) {
		if (!availableLists.includes(listKey)) {
			return errorResponse(c, 400, `Invalid list: ${listKey}`);
		}

		const meta = listMeta[listKey];
		if (meta) {
			return c.json(meta);
		}

		// Return basic info if no metadata available
		return c.json({
			key: listKey,
			title: listKey,
			description: `Color list: ${listKey}`,
		});
	}

	// Return all available lists
	return c.json({
		availableColorNameLists: availableLists,
		listDescriptions: listMeta,
	});
});

export default lists;
