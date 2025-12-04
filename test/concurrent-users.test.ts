/**
 * Concurrent Users Test
 * Simulates 5 different users sending different color values simultaneously
 * Tests the API's ability to handle concurrent requests correctly
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
	responseTime: number;
	error?: string;
}

const localhost = "127.0.0.1";
const port = process.env.PORT || 8080;
const baseUrl = `http://${localhost}:${port}/v1`;

// Define 5 different users with different color requests
const userRequests: UserRequest[] = [
	{
		userId: "user1",
		colors: ["ff0000", "00ff00", "0000ff"], // Primary colors
		list: "default",
		noduplicates: false,
	},
	{
		userId: "user2",
		colors: ["ffa500", "800080", "ffc0cb", "40e0d0", "ffd700"], // Mixed palette
		list: "bestOf",
		noduplicates: true,
	},
	{
		userId: "user3",
		colors: ["000000", "333333", "666666", "999999", "cccccc", "ffffff"], // Grayscale
		list: "default",
		noduplicates: true,
	},
	{
		userId: "user4",
		colors: [
			"e6194b",
			"3cb44b",
			"ffe119",
			"4363d8",
			"f58231",
			"911eb4",
			"46f0f0",
			"f032e6",
		], // Vibrant palette
		list: "short",
		noduplicates: false,
	},
	{
		userId: "user5",
		colors: ["2c3e50", "34495e", "7f8c8d", "95a5a6", "bdc3c7"], // Muted tones
		list: "bestOf",
		noduplicates: true,
	},
];

/**
 * Send a color request for a user
 */
async function sendUserRequest(user: UserRequest): Promise<TestResult> {
	const startTime = performance.now();
	const colorValues = user.colors.join(",");
	const url = `${baseUrl}/?values=${colorValues}&list=${user.list}${user.noduplicates ? "&noduplicates=true" : ""}`;

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
				responseTime: endTime - startTime,
				error: data.error.message,
			};
		}

		const returnedColors = data.colors?.length || 0;
		const success = returnedColors === user.colors.length;

		return {
			userId: user.userId,
			success,
			requestedColors: user.colors,
			returnedColors,
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
			responseTime: endTime - startTime,
			error: (err as Error).message,
		};
	}
}

/**
 * Verify response data integrity
 */
async function verifyResponseIntegrity(user: UserRequest): Promise<boolean> {
	const colorValues = user.colors.join(",");
	const url = `${baseUrl}/?values=${colorValues}&list=${user.list}${user.noduplicates ? "&noduplicates=true" : ""}`;

	const response = await fetch(url);
	const data = (await response.json()) as ColorResponse;

	if (!data.colors || data.colors.length !== user.colors.length) {
		return false;
	}

	// Verify each color has required properties
	for (const color of data.colors) {
		if (!color.name || !color.hex || !color.rgb || !color.hsl || !color.lab) {
			return false;
		}
	}

	// If noduplicates is true, verify all names are unique
	if (user.noduplicates) {
		const names = data.colors.map((c) => c.name);
		const uniqueNames = new Set(names);
		if (names.length !== uniqueNames.size) {
			console.error(
				`  ❌ ${user.userId}: Duplicate names found when noduplicates=true`,
			);
			return false;
		}
	}

	return true;
}

async function runConcurrentTest(): Promise<void> {
	console.log("=== Concurrent Users Test ===\n");

	// Check if server is running
	try {
		await fetch(`${baseUrl}/`);
		console.log("✅ Server is running\n");
	} catch {
		console.error("❌ ERROR: Server is not running!");
		console.error(`Make sure the server is running on port ${port}`);
		process.exit(1);
	}

	console.log("Simulating 5 users sending requests concurrently...\n");
	console.log("User configurations:");
	userRequests.forEach((user) => {
		console.log(
			`  ${user.userId}: ${user.colors.length} colors, list=${user.list}, noduplicates=${user.noduplicates}`,
		);
	});
	console.log("");

	// Run all requests concurrently
	console.log("--- Round 1: Concurrent Requests ---");
	const startTime = performance.now();
	const results = await Promise.all(userRequests.map(sendUserRequest));
	const totalTime = performance.now() - startTime;

	// Display results
	let allPassed = true;
	results.forEach((result) => {
		const status = result.success ? "✅" : "❌";
		console.log(
			`${status} ${result.userId}: ${result.returnedColors}/${result.requestedColors.length} colors in ${result.responseTime.toFixed(2)}ms`,
		);
		if (result.error) {
			console.log(`   Error: ${result.error}`);
			allPassed = false;
		}
	});

	console.log(`\nTotal concurrent request time: ${totalTime.toFixed(2)}ms`);

	// Run multiple rounds to stress test
	console.log("\n--- Round 2-4: Stress Test (3 more rounds) ---");
	for (let round = 2; round <= 4; round++) {
		const roundStart = performance.now();
		const roundResults = await Promise.all(userRequests.map(sendUserRequest));
		const roundTime = performance.now() - roundStart;

		const successCount = roundResults.filter((r) => r.success).length;
		console.log(
			`Round ${round}: ${successCount}/${roundResults.length} succeeded in ${roundTime.toFixed(2)}ms`,
		);

		if (successCount !== roundResults.length) {
			allPassed = false;
		}
	}

	// Verify data integrity
	console.log("\n--- Data Integrity Verification ---");
	const integrityResults = await Promise.all(
		userRequests.map(async (user) => {
			const isValid = await verifyResponseIntegrity(user);
			console.log(
				`${isValid ? "✅" : "❌"} ${user.userId}: Data integrity ${isValid ? "OK" : "FAILED"}`,
			);
			return isValid;
		}),
	);

	const integrityPassed = integrityResults.every((r) => r);

	// Summary
	console.log("\n=== Test Summary ===");
	console.log(`Concurrent requests: ${allPassed ? "✅ PASSED" : "❌ FAILED"}`);
	console.log(`Data integrity: ${integrityPassed ? "✅ PASSED" : "❌ FAILED"}`);

	if (allPassed && integrityPassed) {
		console.log("\n✅ All concurrent user tests passed!");
		process.exit(0);
	} else {
		console.log("\n❌ Some tests failed!");
		process.exit(1);
	}
}

runConcurrentTest();
