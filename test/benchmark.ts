/**
 * Benchmark tests for color finding performance
 */
import { colornames as colors } from "color-name-list";
import { colornames as colorsBestOf } from "color-name-list/bestof";
import { colornames as colorsShort } from "color-name-list/short";
import colorNameLists from "color-name-lists";
import { type ColorListsMap, FindColors } from "../src/lib/findColors";
import type { RawColor } from "../src/types";

// --- Configuration ---
const NUM_COLORS_TO_BENCHMARK = 1000; // Number of random colors to test
const DEFAULT_LIST_KEY = "default"; // Which color list to use for benchmarking
// --- End Configuration ---

console.log(
	`Starting benchmark with ${NUM_COLORS_TO_BENCHMARK} random colors using the '${DEFAULT_LIST_KEY}' list...`,
);

let findColors: FindColors;
let testColors: string[];

try {
	// --- Setup FindColors (similar to server.js) ---
	const colorsLists: ColorListsMap = {
		default: colors as RawColor[],
		bestOf: colorsBestOf as RawColor[],
		short: colorsShort as RawColor[],
	};
	Object.assign(colorsLists, colorNameLists.lists);

	console.log("Initializing FindColors...");
	findColors = new FindColors(colorsLists); // This now builds the trees
	console.log("FindColors initialized.");
	// --- End Setup ---

	// --- Helper Functions ---
	/**
	 * Generates a random hex color string (without the #).
	 * @returns Random hex color (e.g., 'a3b1c4')
	 */
	function getRandomHexColor(): string {
		return Math.floor(Math.random() * 16777215)
			.toString(16)
			.padStart(6, "0");
	}

	/**
	 * Generates an array of random hex color strings.
	 * @param count Number of colors to generate.
	 * @returns Array of hex color strings.
	 */
	function generateRandomColors(count: number): string[] {
		const randomColors: string[] = [];
		for (let i = 0; i < count; i++) {
			randomColors.push(getRandomHexColor());
		}
		return randomColors;
	}
	// --- End Helper Functions ---

	// --- Generate Test Data ---
	testColors = generateRandomColors(NUM_COLORS_TO_BENCHMARK);
	console.log(`Generated ${testColors.length} random colors for testing.`);
	// --- End Generate Test Data ---
} catch (error) {
	console.error(
		"Error during benchmark setup (FindColors init or data generation):",
		error,
	);
	process.exit(1); // Exit early if setup fails
}

try {
	// --- Run Benchmarks ---

	// Benchmark: Normal mode (duplicates allowed)
	console.time(`[Benchmark] ${NUM_COLORS_TO_BENCHMARK} colors (normal)`);
	const resultsNormal = findColors.getNamesForValues(
		testColors,
		false,
		DEFAULT_LIST_KEY,
	);
	console.timeEnd(`[Benchmark] ${NUM_COLORS_TO_BENCHMARK} colors (normal)`);
	// Add check for results length consistency
	if (resultsNormal.length !== NUM_COLORS_TO_BENCHMARK) {
		console.warn(
			`Warning: Normal mode returned ${resultsNormal.length} results, expected ${NUM_COLORS_TO_BENCHMARK}`,
		);
	} else {
		console.log(` -> Found ${resultsNormal.length} results.`);
	}

	// Benchmark: Unique mode (no duplicate names)
	console.time(`[Benchmark] ${NUM_COLORS_TO_BENCHMARK} colors (unique)`);
	const resultsUnique = findColors.getNamesForValues(
		testColors,
		true,
		DEFAULT_LIST_KEY,
	);
	console.timeEnd(`[Benchmark] ${NUM_COLORS_TO_BENCHMARK} colors (unique)`);
	// Add check for results length consistency
	if (resultsUnique.length !== NUM_COLORS_TO_BENCHMARK) {
		console.warn(
			`Warning: Unique mode returned ${resultsUnique.length} results, expected ${NUM_COLORS_TO_BENCHMARK}`,
		);
	} else {
		console.log(` -> Found ${resultsUnique.length} results.`);
	}

	// --- End Benchmarks ---
} catch (error) {
	console.error("Error during benchmark execution (getNamesForValues):", error);
	process.exit(1); // Exit if benchmark run fails
}

console.log("\nBenchmark finished.");
process.exit(0); // Explicitly exit with success code
