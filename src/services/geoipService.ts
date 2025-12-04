/**
 * GeoIP Service - Client location lookup
 * Uses ip-location-api for IP geolocation
 * NOTE: The lookup is lazy-loaded to avoid blocking server startup
 */

import type { Context } from "hono";
import { getFromCache, setInCache } from "./cacheService";

export interface ClientLocation {
	country?: string;
	region?: string;
	city?: string;
	ll?: [number, number]; // [latitude, longitude]
}

export interface ClientInfo {
	clientIp: string | null;
	clientLocation: ClientLocation | null;
}

// Lazy-loaded lookup function
let lookupFn: ((ip: string) => unknown) | null = null;
let initPromise: Promise<void> | null = null;
let initFailed = false;

/**
 * Initialize the GeoIP lookup function lazily
 * This prevents blocking server startup
 */
async function initLookup(): Promise<void> {
	if (lookupFn !== null || initFailed) return;

	if (initPromise) {
		await initPromise;
		return;
	}

	initPromise = (async () => {
		try {
			console.log("[GeoIP] Loading ip-location-api module...");
			const module = await import("ip-location-api");
			lookupFn = module.lookup;
			console.log("[GeoIP] ip-location-api loaded successfully");
		} catch (error) {
			console.error("[GeoIP] Failed to load ip-location-api:", error);
			initFailed = true;
		}
	})();

	await initPromise;
}

// Start loading in the background (non-blocking)
setTimeout(() => {
	initLookup().catch((err) =>
		console.error("[GeoIP] Background init failed:", err),
	);
}, 100);

/**
 * Get client IP from Hono context
 * Checks various headers for proxied requests (Fly.io, Cloudflare, etc.)
 */
export function getClientIp(c: Context): string | null {
	// Fly.io header
	const flyClientIp = c.req.header("fly-client-ip");
	if (flyClientIp) return flyClientIp;

	// Standard proxy headers
	const xForwardedFor = c.req.header("x-forwarded-for");
	if (xForwardedFor) {
		// Take the first IP in the chain (original client)
		return xForwardedFor.split(",")[0].trim();
	}

	const xRealIp = c.req.header("x-real-ip");
	if (xRealIp) return xRealIp;

	// Cloudflare
	const cfConnectingIp = c.req.header("cf-connecting-ip");
	if (cfConnectingIp) return cfConnectingIp;

	// Fallback - might not work behind proxies
	return null;
}

/**
 * Get client location from IP
 * Results are cached to avoid repeated lookups
 */
export function getClientLocation(ip: string): ClientLocation | null {
	if (!ip) {
		return null;
	}

	// If GeoIP isn't ready yet, return null (non-blocking)
	if (!lookupFn) {
		console.log("[GeoIP] Lookup not ready yet, skipping");
		return null;
	}

	// Check cache first
	const cached = getFromCache<ClientLocation>("rateLimit", `geo:${ip}`);
	if (cached !== undefined) {
		return cached;
	}

	try {
		const location = lookupFn(ip) as {
			country?: string;
			region?: string;
			city?: string;
			ll?: [number, number];
		} | null;
		if (location) {
			const clientLocation: ClientLocation = {
				country: location.country,
				region: location.region,
				city: location.city,
				ll: location.ll,
			};
			// Cache for future lookups
			setInCache("rateLimit", `geo:${ip}`, clientLocation);
			return clientLocation;
		}
	} catch (error) {
		console.error(`[GeoIP] Failed to lookup IP ${ip}:`, error);
	}

	// Cache null result to avoid repeated failed lookups
	setInCache("rateLimit", `geo:${ip}`, null);
	return null;
}

/**
 * Get complete client info (IP + location)
 */
export function getClientInfo(c: Context): ClientInfo {
	const clientIp = getClientIp(c);
	const clientLocation = clientIp ? getClientLocation(clientIp) : null;

	return {
		clientIp,
		clientLocation,
	};
}
