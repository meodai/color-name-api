/**
 * Dedicated test for "exhausted colors" scenario
 * This test verifies that the API properly handles requests for more colors than available
 * in unique mode with the basic list (which has 21 colors)
 */

import { hasOwn } from "../src/lib/utils";

interface ErrorResponse {
	error?: {
		message?: string;
		status?: number;
		availableCount?: number;
		totalCount?: number;
		requestedCount?: number;
	};
}

const localhost = "127.0.0.1";
const port = process.env.PORT || 8080;
const currentVersion = "v1";
const APIurl = "";
const baseUrl = `${APIurl}${currentVersion}`;

// We'll use the "basic" list which has 21 colors
const listToTest = "basic";
const colorCount = 21; // Number of colors in the basic list
const testColorCount = colorCount + 1; // Request one more than available

/**
 * Generate test colors
 */
function generateTestColors(count: number): string[] {
	const colors: string[] = [];
	for (let i = 0; i < count; i++) {
		// Generate colors from 000000 to ffffff (padding with zeros)
		const hex = i.toString(16).padStart(6, "0");
		colors.push(hex);
	}
	return colors;
}

async function runTest(): Promise<void> {
	console.log("=== Exhausted Colors Test ===");
	console.log(
		`Testing with list "${listToTest}" which has ${colorCount} colors`,
	);
	console.log(
		`Requesting ${testColorCount} colors to trigger the exhausted colors error`,
	);

	// First check if the server is running
	try {
		await fetch(`http://${localhost}:${port}/${baseUrl}/`);
		console.log("✅ Server is running");
	} catch {
		console.error("❌ ERROR: Server is not running!");
		console.error(`Make sure the server is running on port ${port}`);
		process.exit(1);
	}

	// Generate colors for our test
	const testColors = generateTestColors(testColorCount);
	const testUrl = `/?noduplicates=true&list=${listToTest}&values=${testColors.join(",")}`;

	console.log(`Testing URL: http://${localhost}:${port}/${baseUrl}${testUrl}`);

	try {
		const res = await fetch(`http://${localhost}:${port}/${baseUrl}${testUrl}`);
		console.log(`Response status: ${res.status}`);

		// We expect HTTP 409 (Conflict)
		if (res.status !== 409) {
			throw new Error(`Expected HTTP status 409 but got ${res.status}`);
		}

		const response = (await res.json()) as ErrorResponse;

		// Validate error response structure
		if (!response.error) {
			throw new Error("Response missing error object");
		}

		if (!response.error.message) {
			throw new Error("Error response missing message");
		}

		if (!hasOwn(response.error, "availableCount")) {
			throw new Error("Error response missing availableCount property");
		}

		if (!hasOwn(response.error, "totalCount")) {
			throw new Error("Error response missing totalCount property");
		}

		// Validate error response values
		if (response.error.totalCount !== colorCount) {
			throw new Error(
				`Expected totalCount to be ${colorCount} but got ${response.error.totalCount}`,
			);
		}

		// Print the successful test result
		console.log(
			"\n✅ Test PASSED! The server correctly handles exhausted colors scenario.",
		);
		console.log("Error response received:");
		console.log(`- Status: ${response.error.status}`);
		console.log(`- Message: ${response.error.message}`);
		console.log(`- Available Count: ${response.error.availableCount}`);
		console.log(`- Total Count: ${response.error.totalCount}`);

		process.exit(0);
	} catch (err) {
		console.error(`\n❌ Test FAILED: ${(err as Error).message}`);
		process.exit(1);
	}
}

runTest();
