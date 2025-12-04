import assert from 'node:assert';
import fs from 'node:fs';
import Closest from '../src/closestColor.js';

// Mock data
const mockColors = [
  { name: 'Red', hex: '#ff0000' },
  { name: 'Green', hex: '#00ff00' },
  { name: 'Blue', hex: '#0000ff' },
];

let passed = 0;
let failed = 0;

// Clear log file
fs.writeFileSync('test/caching.log', '');

function logResult(name, err) {
  const msg = err ? `✗ ${name}\n  ${err.message}\n` : `✓ ${name}\n`;
  console.log(msg.trim());
  fs.appendFileSync('test/caching.log', msg);
  if (err) {
    failed++;
  } else {
    passed++;
  }
}

console.log('=== Caching Tests ===');

// Test 1: Closest cache should store results in non-unique mode
try {
  const closest = new Closest(mockColors, false);
  const searchColor = { l: 53.24, a: 80.09, b: 67.2 }; // Approx Red

  // First call
  const result1 = closest.get(searchColor);

  // Check if cache has it
  const cacheKey = JSON.stringify(searchColor);
  if (!closest.cache.has(cacheKey)) {
    throw new Error('Result was not cached');
  }

  // Second call
  const result2 = closest.get(searchColor);

  assert.deepStrictEqual(result1, result2);
  logResult('Closest.get() should cache results in non-unique mode');
} catch (err) {
  logResult('Closest.get() should cache results in non-unique mode', err);
}

// Test 2: Closest cache should be used on subsequent calls
try {
  const closest = new Closest(mockColors, false);
  const searchColor = { l: 50, a: 50, b: 50 };
  const cacheKey = JSON.stringify(searchColor);

  // Manually set cache
  const fakeResult = { closest: { name: 'Fake', hex: '#000000' }, index: 0 };
  closest.cache.set(cacheKey, fakeResult);

  // Call get
  const result = closest.get(searchColor);

  assert.deepStrictEqual(result, fakeResult);
  logResult('Closest.get() should return cached result');
} catch (err) {
  logResult('Closest.get() should return cached result', err);
}

// Test 3: Unique mode should not initialize cache
try {
  const closest = new Closest(mockColors, true); // unique = true

  if (closest.cache !== undefined) {
    throw new Error('Cache should be undefined in unique mode');
  }

  logResult('Closest should not initialize cache in unique mode');
} catch (err) {
  logResult('Closest should not initialize cache in unique mode', err);
}

console.log(`\nCaching tests finished. Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
