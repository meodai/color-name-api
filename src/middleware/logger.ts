/**
 * Request logging middleware for Hono
 */

import type { Context, MiddlewareHandler, Next } from "hono";

/**
 * Logger options
 */
export interface LoggerOptions {
	enabled?: boolean;
	format?: "simple" | "detailed" | "json";
	skip?: (c: Context) => boolean;
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

/**
 * Get client IP from request
 */
function getClientIP(c: Context): string {
	const forwarded = c.req.header("x-forwarded-for");
	if (forwarded) {
		return forwarded.split(",")[0].trim();
	}
	return c.req.header("x-real-ip") || "unknown";
}

/**
 * Get current timestamp in ISO format
 */
function getTimestamp(): string {
	return new Date().toISOString();
}

/**
 * Create logger middleware for Hono
 */
export function logger(options: LoggerOptions = {}): MiddlewareHandler {
	const {
		enabled = process.env.NODE_ENV !== "test",
		format = "simple",
		skip,
	} = options;

	return async (c: Context, next: Next) => {
		// Skip if disabled or skip function returns true
		if (!enabled || skip?.(c)) {
			await next();
			return;
		}

		const start = Date.now();
		const method = c.req.method;
		const path = c.req.path;
		const ip = getClientIP(c);

		await next();

		const duration = Date.now() - start;
		const status = c.res.status;
		const contentLength = c.res.headers.get("content-length");
		const size = contentLength ? parseInt(contentLength, 10) : 0;

		if (format === "json") {
			console.log(
				JSON.stringify({
					timestamp: getTimestamp(),
					method,
					path,
					status,
					duration,
					size,
					ip,
					userAgent: c.req.header("user-agent"),
				}),
			);
		} else if (format === "detailed") {
			console.log(
				`[${getTimestamp()}] ${method} ${path} - ${status} - ${duration}ms - ${formatBytes(size)} - ${ip}`,
			);
		} else {
			// Simple format
			const statusColor =
				status >= 500
					? "31"
					: status >= 400
						? "33"
						: status >= 300
							? "36"
							: "32";
			console.log(
				`\x1b[${statusColor}m${status}\x1b[0m ${method} ${path} - ${duration}ms`,
			);
		}
	};
}

/**
 * Create a simple request logger that logs on request start
 */
export function requestLogger(): MiddlewareHandler {
	return async (c: Context, next: Next) => {
		const method = c.req.method;
		const path = c.req.path;
		console.log(`--> ${method} ${path}`);
		await next();
	};
}
