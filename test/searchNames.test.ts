/**
 * Test for the enhanced searchNames functionality
 */

import { FindColors } from "../src/lib/findColors";
import type { RawColor } from "../src/types";

// Mock color data for testing
const mockColors: Record<string, RawColor[]> = {
	default: [
		{ name: "Red", hex: "#ff0000" },
		{ name: "Green", hex: "#00ff00" },
		{ name: "Blue", hex: "#0000ff" },
		{ name: "Dark Red", hex: "#8b0000" },
		{ name: "Light Red", hex: "#ffcccb" },
		{ name: "Salmon", hex: "#fa8072" },
		{ name: "Salmon Pink", hex: "#ff91a4" },
		{ name: "Pink Salmon", hex: "#ff9999" },
		{ name: "Red Orange", hex: "#ff4500" },
		{ name: "Orange Red", hex: "#ff6347" },
	],
};

const findColors = new FindColors(mockColors);

let passed = 0;
let failed = 0;

function logResult(name: string, err?: Error): void {
	if (!err) {
		console.log(`✓ ${name}`);
		passed++;
	} else {
		console.error(`✗ ${name}`);
		console.error("  ", err.message);
		failed++;
	}
}

// Test exact match comes first
try {
	const results = findColors.searchNames("Red");
	if (results.length > 0 && results[0].name === "Red") {
		logResult("Exact match should come first");
	} else {
		throw new Error(`Expected "Red" first, got "${results[0]?.name}"`);
	}
} catch (err) {
	logResult("Exact match should come first", err as Error);
}

// Test substring matches work
try {
	const results = findColors.searchNames("salmon");
	const hasExactSalmon = results.some((r) => r.name.toLowerCase() === "salmon");
	const hasSalmonPink = results.some(
		(r) => r.name.toLowerCase() === "salmon pink",
	);
	if (hasExactSalmon && hasSalmonPink) {
		logResult("Substring matches should work");
	} else {
		throw new Error('Should find both "Salmon" and "Salmon Pink"');
	}
} catch (err) {
	logResult("Substring matches should work", err as Error);
}

// Test fuzzy matching for typos
try {
	const results = findColors.searchNames("reed"); // typo for "red"
	const hasRedMatch = results.some((r) => r.name.toLowerCase().includes("red"));
	if (hasRedMatch) {
		logResult("Fuzzy matching should handle typos");
	} else {
		throw new Error('Should find red-related colors for "reed"');
	}
} catch (err) {
	logResult("Fuzzy matching should handle typos", err as Error);
}

// Test maxResults parameter
try {
	const results = findColors.searchNames("red", "default", 3);
	if (results.length <= 3) {
		logResult("maxResults parameter should limit results");
	} else {
		throw new Error(`Expected <= 3 results, got ${results.length}`);
	}
} catch (err) {
	logResult("maxResults parameter should limit results", err as Error);
}

// Test results are ordered by relevance
try {
	const results = findColors.searchNames("red");
	// Exact match "Red" should come before partial matches like "Dark Red"
	const exactIndex = results.findIndex((r) => r.name === "Red");
	const partialIndex = results.findIndex((r) => r.name === "Dark Red");
	if (exactIndex < partialIndex) {
		logResult("Results should be ordered by relevance");
	} else {
		throw new Error("Exact match should come before partial matches");
	}
} catch (err) {
	logResult("Results should be ordered by relevance", err as Error);
}

console.log(
	`\nSearchNames tests finished. Passed: ${passed}, Failed: ${failed}`,
);
process.exit(failed > 0 ? 1 : 0);
