/**
 * Rate limiting middleware for Hono
 * IP-based rate limiting with configurable limits per tier
 */

import type { Context, MiddlewareHandler, Next } from "hono";
import { LRUCache } from "lru-cache";
import type {
	RateLimitRecord,
	RateLimitResult,
	TierConfig,
	TierConfigs,
} from "../types";

// Default rate limit configuration
const DEFAULT_WINDOW_MS = 60000; // 1 minute
const DEFAULT_MAX_REQUESTS = 100;
const MAX_RATE_LIMIT_CACHE_SIZE = 10000;

// Tier configurations
const TIER_CONFIGS: TierConfigs = {
	anonymous: { requestsPerMinute: 60, windowMs: 60000 },
	free: { requestsPerMinute: 100, windowMs: 60000 },
	pro: { requestsPerMinute: 1000, windowMs: 60000 },
	enterprise: { requestsPerMinute: 10000, windowMs: 60000 },
};

// Rate limit cache (IP -> record)
const rateLimitCache = new LRUCache<string, RateLimitRecord>({
	max: MAX_RATE_LIMIT_CACHE_SIZE,
});

/**
 * Rate limit configuration options
 */
export interface RateLimitOptions {
	windowMs?: number;
	maxRequests?: number;
	enabled?: boolean;
	keyGenerator?: (c: Context) => string;
	skip?: (c: Context) => boolean;
}

/**
 * Get client IP from request
 */
function getClientIP(c: Context): string {
	// Check various headers for proxied requests
	const forwarded = c.req.header("x-forwarded-for");
	if (forwarded) {
		return forwarded.split(",")[0].trim();
	}

	const realIP = c.req.header("x-real-ip");
	if (realIP) {
		return realIP.trim();
	}

	// Fallback to unknown
	return "unknown";
}

/**
 * Check rate limit for a given key
 */
export function checkRateLimit(
	key: string,
	windowMs: number = DEFAULT_WINDOW_MS,
	maxRequests: number = DEFAULT_MAX_REQUESTS,
): RateLimitResult {
	const now = Date.now();
	let record = rateLimitCache.get(key);

	// Create or reset record if expired
	if (!record || now > record.resetTime) {
		record = {
			count: 1,
			resetTime: now + windowMs,
		};
	} else {
		record.count++;
	}

	rateLimitCache.set(key, record);

	const remaining = Math.max(0, maxRequests - record.count);
	const limited = record.count > maxRequests;

	return {
		limited,
		remaining,
		resetTime: record.resetTime,
	};
}

/**
 * Get rate limit for a tier
 */
export function getTierConfig(tier: keyof TierConfigs): TierConfig {
	return TIER_CONFIGS[tier] || TIER_CONFIGS.anonymous;
}

/**
 * Create rate limit middleware for Hono
 */
export function rateLimit(options: RateLimitOptions = {}): MiddlewareHandler {
	const {
		windowMs = parseInt(
			process.env.RATE_LIMIT_WINDOW_MS || String(DEFAULT_WINDOW_MS),
			10,
		),
		maxRequests = parseInt(
			process.env.RATE_LIMIT_MAX_REQUESTS || String(DEFAULT_MAX_REQUESTS),
			10,
		),
		enabled = process.env.RATE_LIMIT_ENABLED !== "false",
		keyGenerator = getClientIP,
		skip,
	} = options;

	return async (c: Context, next: Next) => {
		// Skip if disabled or skip function returns true
		if (!enabled || skip?.(c)) {
			await next();
			return;
		}

		const key = keyGenerator(c);
		const result = checkRateLimit(key, windowMs, maxRequests);

		// Set rate limit headers
		c.header("X-RateLimit-Limit", String(maxRequests));
		c.header("X-RateLimit-Remaining", String(result.remaining));
		c.header("X-RateLimit-Reset", String(Math.ceil(result.resetTime / 1000)));

		if (result.limited) {
			const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
			c.header("Retry-After", String(retryAfter));

			return c.json(
				{
					error: {
						status: 429,
						message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
					},
				},
				429,
			);
		}

		await next();
	};
}

/**
 * Clear rate limit cache (useful for testing)
 */
export function clearRateLimitCache(): void {
	rateLimitCache.clear();
}

/**
 * Get current rate limit stats for an IP
 */
export function getRateLimitStats(ip: string): RateLimitRecord | undefined {
	return rateLimitCache.get(ip);
}
