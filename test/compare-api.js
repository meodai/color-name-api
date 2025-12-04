import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FindColors } from "../src/findColors.js";

// Setup paths using ESM compatible approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");

// Set up test configuration
// Using Fly.io backend (api.color.pizza is the old version)
const LIVE_API_URL = "https://color-name-api.fly.dev/v1/";
const TEST_COLORS = [
	"ff0000", // Red
	"00ff00", // Green
	"0000ff", // Blue
	"ffff00", // Yellow
	"00ffff", // Cyan
	"ff00ff", // Magenta
	"000000", // Black
	"ffffff", // White
	"556b2f", // Dark Olive Green
	"7b3f00", // Chocolate
	"c0c0c0", // Silver
	"1e90ff", // Dodger Blue
	"ffa500", // Orange
	"ffc0cb", // Pink
	"800080", // Purple
	"8a2be2", // Blueviolet
	// Add any specific colors you want to test
];

// Special test cases for API features
const SPECIAL_TEST_CASES = [
	{
		name: "Multiple duplicate colors with noduplicates=true",
		colors: ["8a2be2", "8a2be2", "8a2be2"],
		listType: "bestOf",
		unique: true,
	},
	{
		name: "Multiple duplicate colors with noduplicates=false",
		colors: ["8a2be2", "8a2be2", "8a2be2"],
		listType: "bestOf",
		unique: false,
	},
	{
		name: "Different shades of purple with noduplicates=true",
		colors: ["8a2be2", "9400d3", "a020f0", "9370db"],
		listType: "bestOf",
		unique: true,
	},
	{
		name: "Multiple colors across the spectrum with noduplicates=true",
		colors: ["ff0000", "00ff00", "0000ff", "ffff00", "ff00ff"],
		listType: "default",
		unique: true,
	},
	{
		name: "Edge case colors with short list",
		colors: ["010101", "fefefe", "7f7f7f", "ff00ff"],
		listType: "short",
		unique: false,
	},
];

// Load the color data
async function loadColorLists() {
	try {
		// Get the main color list
		const mainListPath = path.join(
			rootDir,
			"node_modules",
			"color-name-list",
			"dist",
			"colornames.json",
		);
		const mainList = JSON.parse(await fs.readFile(mainListPath, "utf8")); // Use await fs.readFile

		// Load other lists if needed
		const bestOfPath = path.join(
			rootDir,
			"node_modules",
			"color-name-list",
			"dist",
			"colornames.bestof.json",
		);
		const bestOf = JSON.parse(await fs.readFile(bestOfPath, "utf8")); // Use await fs.readFile

		// Load the short list
		const shortPath = path.join(
			rootDir,
			"node_modules",
			"color-name-list",
			"dist",
			"colornames.short.json",
		);
		const short = JSON.parse(await fs.readFile(shortPath, "utf8")); // Use await fs.readFile

		// Return all lists
		return {
			default: mainList,
			bestOf,
			short,
		};
	} catch (err) {
		console.error("Error loading color lists:", err);
		process.exit(1);
	}
}

// Initialize local FindColors instance
async function initializeLocalFindColors() {
	const colorLists = await loadColorLists();
	return new FindColors(colorLists);
}

// Function to fetch multiple colors from live API
async function fetchLiveApiColors(
	hexColors,
	listType = "default",
	unique = false,
) {
	try {
		// Join multiple colors with commas
		const colorString = hexColors.join(",");
		// Construct URL with appropriate parameters
		// Basic input validation/sanitization for listType
		const validListType = /^[a-zA-Z0-9]+$/.test(listType)
			? listType
			: "default";
		const url = `${LIVE_API_URL}?values=${encodeURIComponent(colorString)}${validListType !== "default" ? `&list=${encodeURIComponent(validListType)}` : ""}${unique ? "&noduplicates=true" : ""}`;

		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`API returned status ${response.status}`);
		}

		const data = await response.json();
		return data.colors || [];
	} catch (err) {
		console.error(`Error fetching from live API for colors ${hexColors}:`, err);
		return [];
	}
}

// Function to fetch single color from live API (kept for backward compatibility)
async function fetchLiveApiColor(hexColor, listType = "default") {
	try {
		// Basic input validation/sanitization
		const validHexColor = /^[0-9a-fA-F]{3,6}$/.test(hexColor)
			? hexColor
			: "000000";
		const validListType = /^[a-zA-Z0-9]+$/.test(listType)
			? listType
			: "default";
		const url = `${LIVE_API_URL}?values=${encodeURIComponent(validHexColor)}${validListType !== "default" ? `&list=${encodeURIComponent(validListType)}` : ""}`;
		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`API returned status ${response.status}`);
		}

		const data = await response.json();
		return data.colors?.length ? data.colors[0] : null;
	} catch (err) {
		console.error(`Error fetching from live API for color ${hexColor}:`, err);
		return null;
	}
}

// Function to get multiple colors from local implementation
function getLocalColors(
	findColors,
	hexColors,
	listType = "default",
	unique = false,
) {
	try {
		// Basic validation before passing to findColors
		const validHexColors = hexColors.filter((hex) =>
			/^[0-9a-fA-F]{3,6}$/.test(hex),
		);
		if (validHexColors.length !== hexColors.length) {
			console.warn(
				"Some invalid hex colors were filtered out:",
				hexColors.filter((hex) => !/^[0-9a-fA-F]{3,6}$/.test(hex)),
			);
		}
		const validListType = /^[a-zA-Z0-9]+$/.test(listType)
			? listType
			: "default";
		return findColors.getNamesForValues(validHexColors, unique, validListType);
	} catch (err) {
		console.error(`Error getting colors from local implementation:`, err);
		return [];
	}
}

// Function to get single color from local implementation (kept for backward compatibility)
function getLocalColor(findColors, hexColor, listType = "default") {
	try {
		// Basic validation
		const validHexColor = /^[0-9a-fA-F]{3,6}$/.test(hexColor) ? hexColor : null;
		if (!validHexColor) {
			console.warn(`Invalid hex color provided to getLocalColor: ${hexColor}`);
			return null;
		}
		const validListType = /^[a-zA-Z0-9]+$/.test(listType)
			? listType
			: "default";
		const result = findColors.getNamesForValues(
			[validHexColor],
			false,
			validListType,
		);
		return result?.length ? result[0] : null;
	} catch (err) {
		console.error(
			`Error getting color from local implementation for ${hexColor}:`,
			err,
		);
		return null;
	}
}

// Compare colors and return differences
function compareColors(liveColor, localColor) {
	if (!liveColor || !localColor) {
		return { error: "One or both colors are null" };
	}

	// Track differences
	const differences = {};

	// Compare names
	if (liveColor.name !== localColor.name) {
		differences.name = {
			live: liveColor.name,
			local: localColor.name,
		};
	}

	// Compare hex values
	if (liveColor.hex !== localColor.hex) {
		differences.hex = {
			live: liveColor.hex,
			local: localColor.hex,
		};
	}

	// Compare distance values (with tolerance for floating point)
	const distanceDiff = Math.abs(liveColor.distance - localColor.distance);
	if (distanceDiff > 0.001) {
		differences.distance = {
			live: liveColor.distance,
			local: localColor.distance,
			diff: distanceDiff,
		};
	}

	// Compare RGB values
	if (liveColor.rgb && localColor.rgb) {
		const rgbDiff = {
			r: Math.abs(liveColor.rgb.r - localColor.rgb.r),
			g: Math.abs(liveColor.rgb.g - localColor.rgb.g),
			b: Math.abs(liveColor.rgb.b - localColor.rgb.b),
		};

		if (rgbDiff.r > 0 || rgbDiff.g > 0 || rgbDiff.b > 0) {
			differences.rgb = {
				live: liveColor.rgb,
				local: localColor.rgb,
				diff: rgbDiff,
			};
		}
	}

	return Object.keys(differences).length ? differences : null;
}

// Compare multiple colors and return an array of differences
function compareColorArrays(liveColors, localColors) {
	if (!liveColors || !localColors || liveColors.length !== localColors.length) {
		return [
			{
				error: `Color array length mismatch: live=${liveColors?.length}, local=${localColors?.length}`,
			},
		];
	}

	return liveColors.map((liveColor, index) => {
		const localColor = localColors[index];
		return compareColors(liveColor, localColor);
	});
}

// Test ordering of results for duplicate color requests with noduplicates=true
async function testDuplicateColorOrdering() {
	console.log(
		"\n--- Testing duplicate color ordering with noduplicates=true ---",
	);

	// The color to test with
	const testColor = "2c2060"; // Purple color

	// Create an array with 10 duplicate colors
	const duplicateColors = Array(10).fill(testColor);

	console.log(
		`Testing with ${duplicateColors.length} instances of the same color: ${testColor}`,
	);

	try {
		// Get results from local implementation
		const findColors = await initializeLocalFindColors();
		const localResults = getLocalColors(
			findColors,
			duplicateColors,
			"bestOf",
			true,
		);

		// Get results from live API
		const liveResults = await fetchLiveApiColors(
			duplicateColors,
			"bestOf",
			true,
		);

		// Verify we got 10 results
		console.log(`Local results count: ${localResults.length}`);
		console.log(`Live API results count: ${liveResults.length}`);

		// Check that results are in order of increasing distance
		let isLocalSorted = true;
		let isLiveSorted = true;

		for (let i = 1; i < localResults.length; i++) {
			if (localResults[i].distance < localResults[i - 1].distance) {
				isLocalSorted = false;
				console.log(
					`Local results NOT sorted at index ${i}: ${localResults[i - 1].distance} -> ${localResults[i].distance}`,
				);
				break;
			}
		}

		for (let i = 1; i < liveResults.length; i++) {
			if (liveResults[i].distance < liveResults[i - 1].distance) {
				isLiveSorted = false;
				console.log(
					`Live results NOT sorted at index ${i}: ${liveResults[i - 1].distance} -> ${liveResults[i].distance}`,
				);
				break;
			}
		}

		console.log(
			`Local results sorted by distance: ${isLocalSorted ? "✅ Yes" : "❌ No"}`,
		);
		console.log(
			`Live results sorted by distance: ${isLiveSorted ? "✅ Yes" : "❌ No"}`,
		);

		// Show first few results
		console.log("\nSample of local results (first 5):");
		localResults.slice(0, 5).forEach((result, i) => {
			console.log(`${i + 1}. "${result.name}" (distance: ${result.distance})`);
		});

		// Compare differences
		const differences = compareColorArrays(liveResults, localResults);
		const hasDifferences = differences.some((diff) => diff !== null);

		console.log(
			`\nDifferences between local and live: ${hasDifferences ? "❌ Found differences" : "✅ No differences"}`,
		);
		if (hasDifferences) {
			console.log("First difference found:");
			console.log(differences.find((diff) => diff !== null));
		}
	} catch (error) {
		console.error("Error in duplicate color ordering test:", error);
	}
}

// Main function to run the comparison
async function main() {
	console.log("Initializing local FindColors instance...");
	const findColors = await initializeLocalFindColors();

	console.log("Starting comparison with live API...");
	console.log("---------------------------------------");

	let totalTests = 0;
	let matchCount = 0;
	let differenceCount = 0;
	const listTypes = ["default", "bestOf", "short"];

	// PART 1: Test standard single colors across all lists
	console.log("\n🧪 STANDARD COLOR TESTS");
	console.log("---------------------------------------");

	for (const listType of listTypes) {
		console.log(`\nTesting list type: ${listType}`);
		console.log("---------------------------------------");

		for (const hexColor of TEST_COLORS) {
			totalTests++;
			process.stdout.write(`Testing color #${hexColor}... `);

			// Get colors from both sources
			const liveColor = await fetchLiveApiColor(hexColor, listType);
			const localColor = getLocalColor(findColors, hexColor, listType);

			// Compare results
			const differences = compareColors(liveColor, localColor);

			if (!differences) {
				process.stdout.write("MATCH ✓\n");
				matchCount++;
			} else {
				process.stdout.write("DIFFERENT ✗\n");
				differenceCount++;
				console.log("  Differences:");
				for (const [key, diff] of Object.entries(differences)) {
					console.log(`  - ${key}:`, diff);
				}
			}
		}
	}

	// PART 2: Test special cases with multiple colors and different options
	console.log("\n🧪 SPECIAL API FEATURE TESTS");
	console.log("---------------------------------------");

	for (const testCase of SPECIAL_TEST_CASES) {
		console.log(`\nTest: ${testCase.name}`);
		console.log(`Colors: ${testCase.colors.join(", ")}`);
		console.log(`List: ${testCase.listType}, Unique: ${testCase.unique}`);
		console.log("---------------------------------------");

		// API URL that would be called (for reference)
		const apiUrl = `${LIVE_API_URL}?values=${testCase.colors.join(",")}${testCase.listType !== "default" ? `&list=${testCase.listType}` : ""}${testCase.unique ? "&noduplicates=true" : ""}`;
		console.log(`API URL: ${apiUrl}`);

		// Get colors from both sources
		const liveColors = await fetchLiveApiColors(
			testCase.colors,
			testCase.listType,
			testCase.unique,
		);
		const localColors = getLocalColors(
			findColors,
			testCase.colors,
			testCase.listType,
			testCase.unique,
		);

		// Add to test count
		totalTests++;

		// Compare results
		console.log(
			`Received ${liveColors.length} colors from live API, ${localColors.length} from local implementation`,
		);

		if (liveColors.length !== localColors.length) {
			console.log(`DIFFERENT ✗ - Different number of colors returned`);
			differenceCount++;
			continue;
		}

		const differences = compareColorArrays(liveColors, localColors);
		const hasDifferences = differences.some((diff) => diff !== null);

		if (!hasDifferences) {
			console.log("MATCH ✓ - All colors match exactly");
			matchCount++;
		} else {
			console.log("DIFFERENT ✗ - Found differences in colors");
			differenceCount++;

			// Display differences for each color
			differences.forEach((diff, index) => {
				if (diff) {
					console.log(`  Color #${index + 1} (#${testCase.colors[index]}):`);
					for (const [key, value] of Object.entries(diff)) {
						console.log(`    - ${key}:`, value);
					}
				}
			});
		}
	}

	// Print summary
	console.log("\n---------------------------------------");
	console.log("Comparison Summary:");
	console.log(`Total tests run: ${totalTests}`);
	console.log(
		`Matches: ${matchCount} (${((matchCount / totalTests) * 100).toFixed(2)}%)`,
	);
	console.log(
		`Differences: ${differenceCount} (${((differenceCount / totalTests) * 100).toFixed(2)}%)`,
	);

	// Test duplicate color ordering
	await testDuplicateColorOrdering();

	console.log("\nAll tests completed!");
}

// Run the comparison
main().catch((err) => {
	console.error("Error running comparison:", err);
	process.exit(1);
});
