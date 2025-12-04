/**
 * Hono Application Configuration
 * Main app setup with routes and middleware
 */

import { Hono } from "hono";
import { compress } from "hono/compress";
import { cors } from "hono/cors";

// Import middleware
import { logger, rateLimit } from "./middleware";

// Import routes
import {
	colors,
	docs,
	initColorsRoute,
	initDocsRoute,
	initListsRoute,
	initNamesRoute,
	lists,
	names,
	swatch,
	wellKnown,
} from "./routes";

// Import services
import {
	getAvailableLists,
	getColorListMeta,
	getColorLists,
	getFindColors,
	initColorService,
} from "./services";

// Create Hono app
const app = new Hono();

/**
 * Initialize the application
 * Loads color data and configures routes
 */
export async function initApp(): Promise<typeof app> {
	console.log("[App] Initializing...");

	// Initialize color service (loads VP-trees)
	await initColorService();

	// Initialize docs route (loads OpenAPI spec)
	await initDocsRoute();

	// Initialize routes with color data
	const finder = getFindColors();
	const colorLists = getColorLists();
	const availableLists = getAvailableLists();
	const listMeta = getColorListMeta();

	initColorsRoute(finder, colorLists, availableLists);
	initNamesRoute(finder, availableLists);
	initListsRoute(availableLists, listMeta);

	console.log("[App] Routes initialized");

	return app;
}

// ============================================
// Global Middleware
// ============================================

// CORS - Allow all origins for API access
app.use(
	"*",
	cors({
		origin: "*",
		allowMethods: ["GET", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization", "X-API-Key", "X-Referrer"],
		maxAge: parseInt(process.env.CORS_MAX_AGE || "86400", 10), // Default: 24 hours
	}),
);

// Compression
app.use("*", compress());

// Request logging (only in non-production or when DEBUG is set)
if (process.env.NODE_ENV !== "production" || process.env.DEBUG) {
	app.use("*", logger());
}

// ============================================
// API Routes (with rate limiting)
// ============================================

// Rate limiting for API routes
app.use("/v1/*", rateLimit());

// Mount API routes
// Note: Mount sub-routes first to avoid path conflicts
// Each route needs both with and without trailing slash for Hono
app.route("/v1/names/", names);
app.route("/v1/names", names);
app.route("/v1/lists/", lists);
app.route("/v1/lists", lists);
app.route("/v1/swatch/", swatch);
app.route("/v1/swatch", swatch);
// Colors route handles /v1/ and /v1/:colors - mount last
app.route("/v1/", colors);
app.route("/v1", colors);

// ============================================
// Documentation & Well-Known Routes
// ============================================

// Docs routes (no rate limiting)
app.route("/", docs);

// Well-known routes
app.route("/.well-known", wellKnown);

// ============================================
// Error Handlers
// ============================================

// 404 handler
app.notFound((c) => {
	return c.json(
		{
			error: {
				status: 404,
				message: "Not found",
				path: c.req.path,
			},
		},
		404,
	);
});

// Global error handler
app.onError((err, c) => {
	console.error("[App] Unhandled error:", err);

	// Don't expose internal errors in production
	const message =
		process.env.NODE_ENV === "production"
			? "Internal server error"
			: err.message;

	return c.json(
		{
			error: {
				status: 500,
				message,
			},
		},
		500,
	);
});

export default app;
