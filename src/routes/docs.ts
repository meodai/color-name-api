/**
 * Documentation and health routes
 * Handles /health, /openapi.yaml, /openapi.json endpoints
 */

import fs from "node:fs/promises";
import path from "node:path";
import { Hono } from "hono";
import { parse as parseYAML } from "yaml";

// Create router
const docs = new Hono();

// OpenAPI spec storage
let openApiYAMLString: string | null = null;
let openApiJSONObject: Record<string, unknown> | null = null;

/**
 * Initialize docs route by loading OpenAPI spec
 */
export async function initDocsRoute(specPath?: string): Promise<void> {
	try {
		const effectivePath =
			specPath || path.resolve(process.cwd(), "color-names-v1-OpenAPI.yml");
		openApiYAMLString = await fs.readFile(effectivePath, "utf8");
		openApiJSONObject = parseYAML(openApiYAMLString);
		console.log("[Docs] OpenAPI spec loaded successfully");
	} catch (err) {
		console.error("[Docs] Failed to load OpenAPI spec:", err);
	}
}

/**
 * Get OpenAPI JSON object
 */
export function getOpenApiJSONObject(): Record<string, unknown> | null {
	return openApiJSONObject;
}

/**
 * Get OpenAPI YAML string
 */
export function getOpenApiYAMLString(): string | null {
	return openApiYAMLString;
}

/**
 * GET /
 * Root endpoint - API info
 */
docs.get("/", (c) => {
	return c.json({
		name: "Color Name API",
		version: "1.0.0",
		description: "API for getting human-friendly names for hex colors",
		endpoints: {
			colors: "/v1/?values=ff0000,00ff00",
			colorsByPath: "/v1/ff0000,00ff00",
			names: "/v1/names/:query",
			lists: "/v1/lists/",
			swatch: "/v1/swatch/?color=ff0000&name=Red",
			docs: "/v1/docs/",
			health: "/health",
		},
		documentation: "/openapi.yaml",
		source: "https://github.com/meodai/color-name-api",
	});
});

/**
 * GET /health
 * Health check endpoint
 */
docs.get("/health", (c) => {
	return c.json({
		status: "ok",
		timestamp: new Date().toISOString(),
	});
});

/**
 * GET /openapi.yaml
 * Return OpenAPI spec as YAML
 */
docs.get("/openapi.yaml", (c) => {
	if (!openApiYAMLString) {
		return c.json(
			{ error: { status: 500, message: "OpenAPI spec not loaded" } },
			500,
		);
	}

	return new Response(openApiYAMLString, {
		status: 200,
		headers: {
			"Content-Type": "text/yaml; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
});

/**
 * GET /openapi.json
 * Return OpenAPI spec as JSON
 */
docs.get("/openapi.json", (c) => {
	if (!openApiJSONObject) {
		return c.json(
			{ error: { status: 500, message: "OpenAPI spec not loaded" } },
			500,
		);
	}

	return c.json(openApiJSONObject);
});

/**
 * GET /v1/docs/
 * API documentation info
 */
docs.get("/v1/docs/", (c) => {
	return c.json({
		name: "Color Name API",
		version: "1.0.0",
		description: "API for getting human-friendly names for hex colors",
		endpoints: {
			colors: "/v1/?values=ff0000,00ff00",
			colorsByPath: "/v1/ff0000,00ff00",
			names: "/v1/names/:query",
			lists: "/v1/lists/",
			swatch: "/v1/swatch/?color=ff0000&name=Red",
		},
		documentation: "/openapi.yaml",
		source: "https://github.com/meodai/color-name-api",
	});
});

export default docs;
