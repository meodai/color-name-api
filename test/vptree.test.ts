/**
 * Basic unit tests for VPTree
 */
import assert from "node:assert";
import { VPTree } from "../src/lib/vptree";

type Point2D = [number, number];

/**
 * Simple 2D Euclidean distance function
 */
function euclidean(a: Point2D, b: Point2D): number {
	return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
}

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

// Test: should find the nearest neighbor
try {
	const points: Point2D[] = [
		[0, 0],
		[1, 1],
		[2, 2],
		[5, 5],
	];
	const tree = new VPTree(points, euclidean);
	const result = tree.search([1.1, 1.1], 1);
	assert.deepStrictEqual(result[0], [1, 1]);
	logResult("should find the nearest neighbor");
} catch (err) {
	logResult("should find the nearest neighbor", err as Error);
}

// Test: should return multiple nearest neighbors
try {
	const points: Point2D[] = [
		[0, 0],
		[1, 1],
		[2, 2],
		[5, 5],
	];
	const tree = new VPTree(points, euclidean);
	const result = tree.search([1.1, 1.1], 2);
	assert.strictEqual(result.length, 2);
	assert(result.some((p) => p[0] === 1 && p[1] === 1));
	assert(result.some((p) => p[0] === 2 && p[1] === 2));
	logResult("should return multiple nearest neighbors");
} catch (err) {
	logResult("should return multiple nearest neighbors", err as Error);
}

// Test: should handle empty input
try {
	const tree = new VPTree<Point2D>([], euclidean);
	const result = tree.search([0, 0], 1);
	assert.deepStrictEqual(result, []);
	logResult("should handle empty input");
} catch (err) {
	logResult("should handle empty input", err as Error);
}

console.log(`\nVPTree tests finished. Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
