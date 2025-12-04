/**
 * Gzip compression middleware with LRU caching
 * Caches compressed responses for better performance
 */

import { gunzipSync, gzipSync } from "node:zlib";
import type { Context, MiddlewareHandler, Next } from "hono";
import { LRUCache } from "lru-cache";

// Cache configuration
const MAX_GZIP_CACHE_SIZE = 500;
const MIN_COMPRESS_SIZE = 1024; // Only compress responses > 1KB

// Gzip cache for repeated responses
const gzipCache = new LRUCache<string, Buffer>({
	max: MAX_GZIP_CACHE_SIZE,
});

/**
 * Compression options
 */
export interface CompressOptions {
	minSize?: number;
	cacheEnabled?: boolean;
}

/**
 * Check if response should be compressed
 */
function shouldCompress(
	c: Context,
	body: string | Buffer,
	minSize: number,
): boolean {
	// Check size threshold
	const size = typeof body === "string" ? Buffer.byteLength(body) : body.length;
	if (size < minSize) {
		return false;
	}

	// Check if client accepts gzip
	const acceptEncoding = c.req.header("accept-encoding") || "";
	if (!acceptEncoding.includes("gzip")) {
		return false;
	}

	// Check content type (only compress text-based responses)
	const contentType = c.res.headers.get("content-type") || "";
	const compressibleTypes = [
		"application/json",
		"text/html",
		"text/plain",
		"text/css",
		"text/javascript",
		"application/javascript",
		"image/svg+xml",
	];

	return compressibleTypes.some((type) => contentType.includes(type));
}

/**
 * Create compression middleware for Hono
 * Note: This is a basic implementation. For production, consider using
 * Hono's built-in compress middleware or a more robust solution.
 */
export function compress(options: CompressOptions = {}): MiddlewareHandler {
	const { minSize = MIN_COMPRESS_SIZE, cacheEnabled = true } = options;

	return async (c: Context, next: Next) => {
		await next();

		// Only process successful responses
		if (!c.res.ok) {
			return;
		}

		// Clone response to read body
		const response = c.res.clone();
		const body = await response.text();

		if (!shouldCompress(c, body, minSize)) {
			return;
		}

		try {
			let compressed: Buffer;

			// Try cache first
			if (cacheEnabled) {
				const cacheKey = `${c.req.url}:${body.length}`;
				const cached = gzipCache.get(cacheKey);

				if (cached) {
					compressed = cached;
				} else {
					compressed = gzipSync(body);
					gzipCache.set(cacheKey, compressed);
				}
			} else {
				compressed = gzipSync(body);
			}

			// Create new response with compressed body
			c.res = new Response(compressed, {
				status: c.res.status,
				headers: c.res.headers,
			});
			c.res.headers.set("Content-Encoding", "gzip");
			c.res.headers.set("Content-Length", String(compressed.length));
			c.res.headers.delete("Content-Length"); // Let it be calculated
		} catch {
			// If compression fails, return original response
			// The response is already set from next()
		}
	};
}

/**
 * Decompress gzip data
 */
export function decompress(data: Buffer): Buffer {
	return gunzipSync(data);
}

/**
 * Clear gzip cache
 */
export function clearGzipCache(): void {
	gzipCache.clear();
}

/**
 * Get gzip cache stats
 */
export function getGzipCacheStats(): { size: number; maxSize: number } {
	return {
		size: gzipCache.size,
		maxSize: MAX_GZIP_CACHE_SIZE,
	};
}
