/**
 * Memory usage test for the color-name-api
 * Tests that full list requests don't cause excessive memory consumption
 */

const localhost = '127.0.0.1';
const port = process.env.PORT || 8080;
const currentVersion = 'v1';
const baseUrl = `${currentVersion}`;

// Helper to format bytes to MB
const formatMB = bytes => (bytes / 1024 / 1024).toFixed(2);

// Helper to get current memory usage
const getMemoryUsage = () => {
  const usage = process.memoryUsage();
  return {
    rss: usage.rss,
    heapTotal: usage.heapTotal,
    heapUsed: usage.heapUsed,
    external: usage.external,
  };
};

// Helper to force garbage collection if available
const forceGC = () => {
  if (global.gc) {
    global.gc();
  }
};

async function testMemoryUsage() {
  console.log('\n🧪 Memory Usage Test');
  console.log('='.repeat(50));

  // Baseline memory
  forceGC();
  await new Promise(resolve => setTimeout(resolve, 100));
  const baselineMemory = getMemoryUsage();
  console.log('\n📊 Baseline Memory:');
  console.log(`  Heap Used: ${formatMB(baselineMemory.heapUsed)} MB`);
  console.log(`  RSS: ${formatMB(baselineMemory.rss)} MB`);

  // Test 1: Request full default list (largest dataset)
  console.log('\n🔄 Test 1: Full default list request');
  const start1 = Date.now();
  const response1 = await fetch(`http://${localhost}:${port}/${baseUrl}/`);
  const data1 = await response1.json();
  const duration1 = Date.now() - start1;

  await new Promise(resolve => setTimeout(resolve, 100));
  const afterFullList = getMemoryUsage();
  const memoryIncrease1 = afterFullList.heapUsed - baselineMemory.heapUsed;

  console.log(`  ✓ Response time: ${duration1}ms`);
  console.log(`  ✓ Colors returned: ${data1.colors.length}`);
  console.log(`  ✓ Heap Used: ${formatMB(afterFullList.heapUsed)} MB`);
  console.log(`  ✓ Memory increase: ${formatMB(memoryIncrease1)} MB`);

  // Test 2: Request same list again (should use cache)
  console.log('\n🔄 Test 2: Cached full list request');
  const start2 = Date.now();
  const response2 = await fetch(`http://${localhost}:${port}/${baseUrl}/`);
  const data2 = await response2.json();
  const duration2 = Date.now() - start2;

  await new Promise(resolve => setTimeout(resolve, 100));
  const afterCachedList = getMemoryUsage();
  const memoryIncrease2 = afterCachedList.heapUsed - afterFullList.heapUsed;

  console.log(`  ✓ Response time: ${duration2}ms (should be faster)`);
  console.log(`  ✓ Colors returned: ${data2.colors.length}`);
  console.log(`  ✓ Heap Used: ${formatMB(afterCachedList.heapUsed)} MB`);
  console.log(
    `  ✓ Additional memory: ${formatMB(memoryIncrease2)} MB (should be minimal)`
  );

  // Test 3: Request all list types
  console.log('\n🔄 Test 3: Multiple list types');
  const lists = ['default', 'bestOf', 'short', 'wikipedia'];
  const listMemoryStart = getMemoryUsage();

  for (const list of lists) {
    const response = await fetch(
      `http://${localhost}:${port}/${baseUrl}/?list=${list}`
    );
    const data = await response.json();
    console.log(`  ✓ ${list}: ${data.colors.length} colors`);
  }

  await new Promise(resolve => setTimeout(resolve, 100));
  const afterAllLists = getMemoryUsage();
  const memoryIncreaseAllLists =
    afterAllLists.heapUsed - listMemoryStart.heapUsed;

  console.log(`  ✓ Heap Used: ${formatMB(afterAllLists.heapUsed)} MB`);
  console.log(`  ✓ Memory increase: ${formatMB(memoryIncreaseAllLists)} MB`);

  // Test 4: Many small requests with gzip
  console.log('\n🔄 Test 4: Many small requests (gzip cache test)');
  const smallRequestsStart = getMemoryUsage();
  const iterations = 20;

  for (let i = 0; i < iterations; i++) {
    await fetch(
      `http://${localhost}:${port}/${baseUrl}/?values=ff0000,00ff00,0000ff`,
      {
        headers: { 'Accept-Encoding': 'gzip' },
      }
    );
  }

  await new Promise(resolve => setTimeout(resolve, 100));
  const afterSmallRequests = getMemoryUsage();
  const memoryIncreaseSmall =
    afterSmallRequests.heapUsed - smallRequestsStart.heapUsed;

  console.log(`  ✓ ${iterations} requests completed`);
  console.log(`  ✓ Heap Used: ${formatMB(afterSmallRequests.heapUsed)} MB`);
  console.log(
    `  ✓ Memory increase: ${formatMB(memoryIncreaseSmall)} MB (should be small)`
  );

  // Final memory report
  console.log('\n📈 Final Memory Report:');
  console.log('='.repeat(50));
  forceGC();
  await new Promise(resolve => setTimeout(resolve, 200));
  const finalMemory = getMemoryUsage();
  const totalIncrease = finalMemory.heapUsed - baselineMemory.heapUsed;

  console.log(`  Baseline: ${formatMB(baselineMemory.heapUsed)} MB`);
  console.log(`  Final: ${formatMB(finalMemory.heapUsed)} MB`);
  console.log(`  Total increase: ${formatMB(totalIncrease)} MB`);
  console.log(`  RSS: ${formatMB(finalMemory.rss)} MB`);

  // Thresholds (adjust based on your Heroku dyno limits)
  const maxAcceptableIncrease = 100; // MB
  const maxAcceptableRSS = 400; // MB (well below 512MB limit)

  console.log('\n🎯 Memory Thresholds:');
  if (totalIncrease / 1024 / 1024 > maxAcceptableIncrease) {
    console.log(
      `  ❌ FAIL: Heap increase (${formatMB(totalIncrease)} MB) exceeds ${maxAcceptableIncrease} MB`
    );
    process.exit(1);
  } else {
    console.log(
      `  ✅ PASS: Heap increase (${formatMB(totalIncrease)} MB) is within ${maxAcceptableIncrease} MB`
    );
  }

  if (finalMemory.rss / 1024 / 1024 > maxAcceptableRSS) {
    console.log(
      `  ❌ FAIL: RSS (${formatMB(finalMemory.rss)} MB) exceeds ${maxAcceptableRSS} MB`
    );
    process.exit(1);
  } else {
    console.log(
      `  ✅ PASS: RSS (${formatMB(finalMemory.rss)} MB) is within ${maxAcceptableRSS} MB`
    );
  }

  console.log('\n✅ All memory tests passed!\n');
}

// Run the test
testMemoryUsage().catch(err => {
  console.error('\n❌ Memory test failed:', err);
  process.exit(1);
});
