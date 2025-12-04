/**
 * Color Name API - Entry Point
 * Bun + Hono server with Socket.IO support
 */

import { createServer } from "node:http";
import app, { initApp } from "./app";
import { initSocketService, shutdownSocketService } from "./services";

// Configuration
const PORT = parseInt(process.env.PORT || "8080", 10);
const SOCKET_ENABLED = process.env.SOCKET === "true";

/**
 * Detect runtime environment
 */
function getRuntime(): string {
	if (typeof Bun !== "undefined") {
		return `Bun ${Bun.version}`;
	}
	return `Node ${process.version}`;
}

/**
 * Main startup function
 */
async function main(): Promise<void> {
	console.log("=".repeat(50));
	console.log("  Color Name API - Starting...");
	console.log("=".repeat(50));
	console.log(`  Runtime: ${getRuntime()}`);
	console.log(`  Port: ${PORT}`);
	console.log(`  Socket.IO: ${SOCKET_ENABLED ? "Enabled" : "Disabled"}`);
	console.log(`  Environment: ${process.env.NODE_ENV || "development"}`);
	console.log("=".repeat(50));

	// Initialize the Hono app (loads color data)
	await initApp();

	// Create HTTP server for Socket.IO compatibility
	const httpServer = createServer(async (req, res) => {
		// Let Hono handle the request
		const url = `http://${req.headers.host}${req.url}`;
		const headers = new Headers();
		Object.entries(req.headers).forEach(([key, value]) => {
			if (value) headers.set(key, Array.isArray(value) ? value[0] : value);
		});

		const method = req.method || "GET";
		let body: Buffer | null = null;

		if (method !== "GET" && method !== "HEAD") {
			const chunks: Buffer[] = [];
			for await (const chunk of req) {
				chunks.push(Buffer.from(chunk));
			}
			body = Buffer.concat(chunks);
		}

		const request = new Request(url, {
			method,
			headers,
			body,
		});

		const response = await app.fetch(request);

		// Set response headers
		res.statusCode = response.status;
		response.headers.forEach((value, key) => {
			res.setHeader(key, value);
		});

		// Send response body
		if (response.body) {
			const reader = response.body.getReader();
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				res.write(value);
			}
		}
		res.end();
	});

	// Initialize Socket.IO if enabled
	if (SOCKET_ENABLED) {
		initSocketService(httpServer);
	}

	// Start the server on all interfaces (0.0.0.0 for Fly.io)
	httpServer.listen(PORT, "0.0.0.0", () => {
		console.log("");
		console.log(`Server running at http://0.0.0.0:${PORT}/`);
		console.log(`API available at http://0.0.0.0:${PORT}/v1/`);
		console.log(`Health check at http://0.0.0.0:${PORT}/health`);
		console.log("");
	});

	// Graceful shutdown handlers
	const shutdown = async (signal: string) => {
		console.log(`\n${signal} received, shutting down gracefully...`);

		// Close HTTP server
		httpServer.close(() => {
			console.log("HTTP server closed");
		});

		// Close Socket.IO
		if (SOCKET_ENABLED) {
			await shutdownSocketService();
		}

		// Give time for cleanup
		setTimeout(() => {
			console.log("Shutdown complete");
			process.exit(0);
		}, 1000);
	};

	process.on("SIGTERM", () => shutdown("SIGTERM"));
	process.on("SIGINT", () => shutdown("SIGINT"));
}

// Run the server
main().catch((error) => {
	console.error("Failed to start server:", error);
	process.exit(1);
});
