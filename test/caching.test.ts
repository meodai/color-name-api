/**
 * Tests for color caching functionality
 */
import assert from "node:assert";
import fs from "node:fs";
import type { Lab } from "culori";
import Closest from "../src/lib/closestColor";

// Mock data
const mockColors: Lab[] = [
	{ mode: "lab", l: 53.23, a: 80.11, b: 67.22 }, // Red
	{ mode: "lab", l: 87.74, a: -86.18, b: 83.18 }, // Green
	{ mode: "lab", l: 32.3, a: 79.2, b: -107.86 }, // Blue
];

let passed = 0;
let failed = 0;

// Clear log file
fs.writeFileSync("test/caching.log", "");

function logResult(name: string, err?: Error): void {
	const msg = err ? `✗ ${name}\n  ${err.message}\n` : `✓ ${name}\n`;
	console.log(msg.trim());
	fs.appendFileSync("test/caching.log", msg);
	if (err) {
		failed++;
	} else {
		passed++;
	}
}

console.log("=== Caching Tests ===");

// Test 1: Closest cache should store results in non-unique mode
try {
	const closest = new Closest(mockColors, false);
	const searchColor: Lab = { mode: "lab", l: 53.24, a: 80.09, b: 67.2 }; // Approx Red

	// First call
	const result1 = closest.get(searchColor);

	// Check if cache has it
	const cacheKey = JSON.stringify(searchColor);
	// Access private cache for testing via type assertion
	const closestAny = closest as unknown as { cache: Map<string, unknown> };
	if (!closestAny.cache.has(cacheKey)) {
		throw new Error("Result was not cached");
	}

	// Second call
	const result2 = closest.get(searchColor);

	assert.deepStrictEqual(result1, result2);
	logResult("Closest.get() should cache results in non-unique mode");
} catch (err) {
	logResult(
		"Closest.get() should cache results in non-unique mode",
		err as Error,
	);
}

// Test 2: Closest cache should be used on subsequent calls
try {
	const closest = new Closest(mockColors, false);
	const searchColor: Lab = { mode: "lab", l: 50, a: 50, b: 50 };
	const cacheKey = JSON.stringify(searchColor);

	// Manually set cache
	const fakeResult = { closest: { name: "Fake", hex: "#000000" }, index: 0 };
	const closestAny = closest as unknown as { cache: Map<string, unknown> };
	closestAny.cache.set(cacheKey, fakeResult);

	// Call get
	const result = closest.get(searchColor);

	assert.deepStrictEqual(result, fakeResult);
	logResult("Closest.get() should return cached result");
} catch (err) {
	logResult("Closest.get() should return cached result", err as Error);
}

// Test 3: Unique mode should still have a cache (but it won't be used for results)
try {
	const closest = new Closest(mockColors, true); // unique = true

	// In the new implementation, cache exists but previouslyReturnedIndexes is used for unique mode
	const closestAny = closest as unknown as {
		previouslyReturnedIndexes: Set<number>;
	};
	if (closestAny.previouslyReturnedIndexes === undefined) {
		throw new Error(
			"previouslyReturnedIndexes should be defined in unique mode",
		);
	}

	logResult("Closest should use previouslyReturnedIndexes in unique mode");
} catch (err) {
	logResult(
		"Closest should use previouslyReturnedIndexes in unique mode",
		err as Error,
	);
}

console.log(`\nCaching tests finished. Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
