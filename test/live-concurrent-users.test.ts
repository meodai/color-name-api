/**
 * Live Concurrent Users Test
 * Simulates 5 different users sending different color values to the DEPLOYED Fly.io API
 * This test runs against the live production server: https://color-name-api.fly.dev
 */

import type { HydratedColor } from "../src/types";

interface ColorResponse {
	paletteTitle?: string;
	colors?: HydratedColor[];
	error?: {
		message?: string;
		status?: number;
	};
}

interface UserRequest {
	userId: string;
	colors: string[];
	list: string;
	noduplicates: boolean;
}

interface TestResult {
	userId: string;
	success: boolean;
	requestedColors: string[];
	returnedColors: number;
	returnedNames: string[];
	responseTime: number;
	error?: string;
}

// Fly.io deployed backend
const LIVE_API_URL = "https://color-name-api.fly.dev/v1";

// Define 5 different users with different color requests
const userRequests: UserRequest[] = [
	{
		userId: "👤 User 1 (Designer)",
		colors: ["ff6b6b", "4ecdc4", "45b7d1", "96ceb4", "ffeaa7"], // Modern palette
		list: "default",
		noduplicates: true,
	},
	{
		userId: "👤 User 2 (Developer)",
		colors: ["282c34", "61dafb", "98c379", "e06c75", "c678dd"], // Code editor theme
		list: "bestOf",
		noduplicates: true,
	},
	{
		userId: "👤 User 3 (Artist)",
		colors: ["e74c3c", "f39c12", "27ae60", "3498db", "9b59b6", "1abc9c"], // Artistic palette
		list: "default",
		noduplicates: true,
	},
	{
		userId: "👤 User 4 (Photographer)",
		colors: ["2c3e50", "34495e", "7f8c8d", "bdc3c7", "ecf0f1"], // Neutral tones
		list: "bestOf",
		noduplicates: false,
	},
	{
		userId: "👤 User 5 (Brand Manager)",
		colors: [
			"ff4757",
			"2ed573",
			"1e90ff",
			"ffa502",
			"a55eea",
			"ff6b81",
			"70a1ff",
		], // Brand colors
		list: "short",
		noduplicates: true,
	},
];

/**
 * Send a color request for a user
 */
async function sendUserRequest(user: UserRequest): Promise<TestResult> {
	const startTime = performance.now();
	const colorValues = user.colors.join(",");
	const url = `${LIVE_API_URL}/?values=${colorValues}&list=${user.list}${user.noduplicates ? "&noduplicates=true" : ""}`;

	try {
		const response = await fetch(url);
		const data = (await response.json()) as ColorResponse;
		const endTime = performance.now();

		if (data.error) {
			return {
				userId: user.userId,
				success: false,
				requestedColors: user.colors,
				returnedColors: 0,
				returnedNames: [],
				responseTime: endTime - startTime,
				error: data.error.message,
			};
		}

		const returnedColors = data.colors?.length || 0;
		const returnedNames = data.colors?.map((c) => c.name) || [];
		const success = returnedColors === user.colors.length;

		return {
			userId: user.userId,
			success,
			requestedColors: user.colors,
			returnedColors,
			returnedNames,
			responseTime: endTime - startTime,
			error: success
				? undefined
				: `Expected ${user.colors.length} colors, got ${returnedColors}`,
		};
	} catch (err) {
		const endTime = performance.now();
		return {
			userId: user.userId,
			success: false,
			requestedColors: user.colors,
			returnedColors: 0,
			returnedNames: [],
			responseTime: endTime - startTime,
			error: (err as Error).message,
		};
	}
}

async function runLiveConcurrentTest(): Promise<void> {
	console.log("╔════════════════════════════════════════════════════════════╗");
	console.log("║     🌐 LIVE CONCURRENT USERS TEST - FLY.IO BACKEND         ║");
	console.log("╠════════════════════════════════════════════════════════════╣");
	console.log(`║  Target: ${LIVE_API_URL}`);
	console.log(
		"╚════════════════════════════════════════════════════════════╝\n",
	);

	// Check if Fly.io API is accessible
	console.log("🔍 Checking Fly.io API availability...");
	try {
		const healthCheck = await fetch(`${LIVE_API_URL}/`);
		if (!healthCheck.ok) {
			throw new Error(`HTTP ${healthCheck.status}`);
		}
		console.log("✅ Fly.io API is online!\n");
	} catch (err) {
		console.error("❌ ERROR: Cannot reach Fly.io API!");
		console.error(`   ${(err as Error).message}`);
		process.exit(1);
	}

	console.log("👥 Simulating 5 concurrent users...\n");

	// Show user configurations
	console.log(
		"┌─────────────────────────────────────────────────────────────┐",
	);
	console.log(
		"│ USER CONFIGURATIONS                                         │",
	);
	console.log(
		"├─────────────────────────────────────────────────────────────┤",
	);
	userRequests.forEach((user) => {
		console.log(
			`│ ${user.userId.padEnd(25)} │ ${user.colors.length} colors │ ${user.list.padEnd(8)} │`,
		);
	});
	console.log(
		"└─────────────────────────────────────────────────────────────┘\n",
	);

	// Run all requests concurrently
	console.log("🚀 Sending concurrent requests to Fly.io...\n");
	const startTime = performance.now();
	const results = await Promise.all(userRequests.map(sendUserRequest));
	const totalTime = performance.now() - startTime;

	// Display detailed results
	console.log(
		"┌─────────────────────────────────────────────────────────────┐",
	);
	console.log(
		"│ RESULTS                                                     │",
	);
	console.log(
		"├─────────────────────────────────────────────────────────────┤",
	);

	let allPassed = true;
	results.forEach((result) => {
		const status = result.success ? "✅" : "❌";
		console.log(`│ ${status} ${result.userId}`);
		console.log(`│    Response time: ${result.responseTime.toFixed(0)}ms`);
		console.log(
			`│    Colors: ${result.returnedColors}/${result.requestedColors.length}`,
		);

		if (result.success && result.returnedNames.length > 0) {
			console.log(
				`│    Names: ${result.returnedNames.slice(0, 3).join(", ")}${result.returnedNames.length > 3 ? "..." : ""}`,
			);
		}

		if (result.error) {
			console.log(`│    ⚠️  Error: ${result.error}`);
			allPassed = false;
		}
		console.log("│");
	});
	console.log(
		"└─────────────────────────────────────────────────────────────┘\n",
	);

	// Performance summary
	console.log("📊 PERFORMANCE METRICS");
	console.log("───────────────────────────────────────");
	console.log(`   Total concurrent time: ${totalTime.toFixed(0)}ms`);
	console.log(
		`   Average per request:   ${(totalTime / results.length).toFixed(0)}ms`,
	);
	console.log(
		`   Fastest response:      ${Math.min(...results.map((r) => r.responseTime)).toFixed(0)}ms`,
	);
	console.log(
		`   Slowest response:      ${Math.max(...results.map((r) => r.responseTime)).toFixed(0)}ms`,
	);
	console.log("");

	// Run additional rounds
	console.log("🔄 Running 2 more stress test rounds...\n");
	for (let round = 2; round <= 3; round++) {
		const roundStart = performance.now();
		const roundResults = await Promise.all(userRequests.map(sendUserRequest));
		const roundTime = performance.now() - roundStart;
		const successCount = roundResults.filter((r) => r.success).length;
		const avgTime =
			roundResults.reduce((a, b) => a + b.responseTime, 0) /
			roundResults.length;

		console.log(
			`   Round ${round}: ${successCount}/${roundResults.length} succeeded | Total: ${roundTime.toFixed(0)}ms | Avg: ${avgTime.toFixed(0)}ms`,
		);

		if (successCount !== roundResults.length) {
			allPassed = false;
		}
	}

	// Final summary
	console.log(
		"\n╔════════════════════════════════════════════════════════════╗",
	);
	if (allPassed) {
		console.log(
			"║  ✅ ALL TESTS PASSED - Fly.io backend is working great!    ║",
		);
	} else {
		console.log(
			"║  ❌ SOME TESTS FAILED - Check the errors above             ║",
		);
	}
	console.log(
		"╚════════════════════════════════════════════════════════════╝\n",
	);

	process.exit(allPassed ? 0 : 1);
}

runLiveConcurrentTest();
