// Tests for generatePaletteName functionality
import assert from "assert";
import { getPaletteTitle } from "../src/generatePaletteName.js";

let passed = 0;
let failed = 0;

function logResult(name, err) {
  if (!err) {
    console.log(`✓ ${name}`);
    passed++;
  } else {
    console.error(`✗ ${name}`);
    console.error("  ", err.message);
    failed++;
  }
}

// Test: Single name should return the name unchanged
try {
  const result = getPaletteTitle(["Red"]);
  assert.strictEqual(result, "Red");
  logResult("should return single name unchanged");
} catch (err) {
  logResult("should return single name unchanged", err);
}

// Test: Deterministic behavior with same input
try {
  const names = ["Red Wine", "Blue Sky", "Green Forest"];
  const result1 = getPaletteTitle(names);
  const result2 = getPaletteTitle(names);
  assert.strictEqual(result1, result2);
  logResult("should be deterministic with same input");
} catch (err) {
  logResult("should be deterministic with same input", err);
}

// Test: Different order should produce different results
try {
  const names1 = ["Red Wine", "Blue Sky"];
  const names2 = ["Blue Sky", "Red Wine"];
  const result1 = getPaletteTitle(names1);
  const result2 = getPaletteTitle(names2);
  assert.notStrictEqual(result1, result2);
  logResult("should produce different results for different order");
} catch (err) {
  logResult("should produce different results for different order", err);
}

// Test: Duplicate names should be removed
try {
  const names = ["Red", "Red", "Blue"];
  const result = getPaletteTitle(names);
  // Should behave the same as ['Red', 'Blue']
  const expected = getPaletteTitle(["Red", "Blue"]);
  assert.strictEqual(result, expected);
  logResult("should remove duplicate names");
} catch (err) {
  logResult("should remove duplicate names", err);
}

// Test: Result should be a non-empty string
try {
  const names = ["Dark Red", "Light Blue"];
  const result = getPaletteTitle(names);
  assert.strictEqual(typeof result, "string");
  assert(result.length > 0);
  logResult("should return non-empty string");
} catch (err) {
  logResult("should return non-empty string", err);
}

// Test: Custom separator regex
try {
  const names = ["Red_Wine", "Blue_Sky"];
  const result = getPaletteTitle(names, /(_)+/g);
  assert.strictEqual(typeof result, "string");
  assert(result.length > 0);
  logResult("should work with custom separator regex");
} catch (err) {
  logResult("should work with custom separator regex", err);
}

// Test: Names with single words (no separators)
try {
  const names = ["Red", "Blue", "Green"];
  const result = getPaletteTitle(names);
  assert.strictEqual(typeof result, "string");
  assert(result.length > 0);
  logResult("should handle single word names");
} catch (err) {
  logResult("should handle single word names", err);
}

// Test: Names with multiple parts
try {
  const names = ["Dark Forest Green", "Light Ocean Blue"];
  const result = getPaletteTitle(names);
  assert.strictEqual(typeof result, "string");
  assert(result.length > 0);
  logResult("should handle multi-part names");
} catch (err) {
  logResult("should handle multi-part names", err);
}

// Test: Mixed names with and without separators
try {
  const names = ["Red", "Deep Blue", "Forest-Green"];
  const result = getPaletteTitle(names);
  assert.strictEqual(typeof result, "string");
  assert(result.length > 0);
  logResult("should handle mixed name formats");
} catch (err) {
  logResult("should handle mixed name formats", err);
}

// Test: Specific known behavior - test a few known combinations
try {
  // Test with known inputs to verify specific behavior
  const names = ["Apple Red", "Sky Blue"];
  const result = getPaletteTitle(names);

  // The result should contain parts from both names
  // Due to the deterministic nature, we can test for consistency
  const secondResult = getPaletteTitle(names);
  assert.strictEqual(result, secondResult);

  // The result should be different from either original name
  assert.notStrictEqual(result, "Apple Red");
  assert.notStrictEqual(result, "Sky Blue");

  logResult("should create new combination from input names");
} catch (err) {
  logResult("should create new combination from input names", err);
}

// Test: Should avoid returning duplicate words (e.g., "Black Black")
try {
  const names = ["Black Black Black Red", "Blue Sky"];
  const result = getPaletteTitle(names);

  // The result should not contain consecutive duplicate words
  const words = result.split(/\s+/);
  let hasConsecutiveDuplicates = false;
  for (let i = 0; i < words.length - 1; i++) {
    if (words[i].toLowerCase() === words[i + 1].toLowerCase()) {
      hasConsecutiveDuplicates = true;
      break;
    }
  }

  assert.strictEqual(
    hasConsecutiveDuplicates,
    false,
    `Result "${result}" contains consecutive duplicate words`,
  );
  logResult('should avoid consecutive duplicate words like "Black Black"');
} catch (err) {
  logResult('should avoid consecutive duplicate words like "Black Black"', err);
}

// Test: Multiple cases with consecutive duplicates in input
try {
  const testCases = [
    ["Red Red Red Wine", "Green Forest"],
    ["Deep Deep Blue", "Bright Yellow"],
    ["Dark Dark Dark Night", "Light Day"],
    ["Purple Purple", "Orange Sunset"],
  ];

  for (const names of testCases) {
    const result = getPaletteTitle(names);
    const words = result.split(/\s+/);
    let hasConsecutiveDuplicates = false;

    for (let i = 0; i < words.length - 1; i++) {
      if (words[i].toLowerCase() === words[i + 1].toLowerCase()) {
        hasConsecutiveDuplicates = true;
        break;
      }
    }

    assert.strictEqual(
      hasConsecutiveDuplicates,
      false,
      `Result "${result}" from names [${names.join(", ")}] contains consecutive duplicate words`,
    );
  }

  logResult("should handle multiple cases with consecutive duplicates");
} catch (err) {
  logResult("should handle multiple cases with consecutive duplicates", err);
}

// Test: Empty array should return empty string
try {
  const result = getPaletteTitle([]);
  assert.strictEqual(result, "");
  logResult("should return empty string for empty array");
} catch (err) {
  logResult("should return empty string for empty array", err);
}

// Print summary
console.log(`\nTest Summary:`);
console.log(`✓ Passed: ${passed}`);
console.log(`✗ Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);

if (failed > 0) {
  process.exit(1);
}
