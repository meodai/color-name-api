/**
 * Well-known endpoint routes
 * Handles /.well-known/* endpoints
 */

import { Hono } from "hono";
import { getOpenApiJSONObject } from "./docs";

// Create router
const wellKnown = new Hono();

// Default contact email
const DEFAULT_CONTACT_EMAIL = "color-name-api@elastiq.click";

/**
 * GET /.well-known/openapi.json
 * Standard API discovery endpoint
 */
wellKnown.get("/openapi.json", (c) => {
	const spec = getOpenApiJSONObject();

	if (!spec) {
		return c.json(
			{ error: { status: 500, message: "OpenAPI spec not loaded" } },
			500,
		);
	}

	return c.json(spec);
});

/**
 * GET /.well-known/security.txt
 * Security contact information
 */
wellKnown.get("/security.txt", (_c) => {
	const oneYearMs = 365 * 24 * 60 * 60 * 1000;
	const expires = new Date(Date.now() + oneYearMs).toISOString();
	const contactEmail = process.env.SECURITY_CONTACT || DEFAULT_CONTACT_EMAIL;

	const securityTxt = [
		`Contact: mailto:${contactEmail}`,
		"Contact: https://github.com/meodai/color-name-api/issues",
		"Policy: https://github.com/meodai/color-name-api#security",
		"Preferred-Languages: en",
		`Expires: ${expires}`,
	].join("\n");

	return new Response(securityTxt, {
		status: 200,
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "public, max-age=86400",
		},
	});
});

/**
 * GET /.well-known/ai-plugin.json
 * AI plugin manifest for ChatGPT and other AI assistants
 */
wellKnown.get("/ai-plugin.json", (c) => {
	const proto = (c.req.header("x-forwarded-proto") || "http").split(",")[0];
	const host = c.req.header("host") || "localhost";
	const origin = `${proto}://${host}`;

	const manifest = {
		schema_version: "v1",
		name_for_human: "Color Name API",
		name_for_model: "color_name_api",
		description_for_human:
			"Get human-friendly names for hex colors or search color names.",
		description_for_model:
			"Given hex color values, return likely human-friendly color names; search by name text; list available color-name sources.",
		auth: { type: "none" },
		api: {
			type: "openapi",
			url: `${origin}/openapi.yaml`,
			is_user_authenticated: false,
		},
		logo_url:
			"https://raw.githubusercontent.com/meodai/color-name-api/main/logo.png",
		contact_email: process.env.CONTACT_EMAIL || DEFAULT_CONTACT_EMAIL,
		legal_info_url: "https://github.com/meodai/color-name-api#license",
	};

	return c.json(manifest);
});

export default wellKnown;
