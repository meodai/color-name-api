/**
 * Tests for gzip Content-Encoding header handling
 */
import assert from "node:assert";

const localhost = "127.0.0.1";
const port = process.env.PORT || 8080;
const currentVersion = "v1";
const APIurl = "";
const baseUrl = `${APIurl}${currentVersion}`;

async function ensureServerRunning(): Promise<void> {
	try {
		await fetch(`http://${localhost}:${port}/${baseUrl}/`);
	} catch {
		console.error("ERROR: Server is not running for gzip header test!");
		console.error(`Make sure the server is running on port ${port}`);
		process.exit(1);
	}
}

async function runGzipHeaderTests(): Promise<void> {
	await ensureServerRunning();

	// Request with gzip accepted
	const res = await fetch(`http://${localhost}:${port}/${baseUrl}/`, {
		headers: {
			"Accept-Encoding": "gzip",
		},
	});

	// Node will throw before this point if an invalid header value is set,
	// so reaching here already means the regression is fixed.
	const encoding = res.headers.get("content-encoding");

	// Either we get gzipped content, or no encoding header at all –
	// but it must never be an invalid/undefined value.
	assert(
		encoding === "gzip" || encoding === null,
		`Unexpected Content-Encoding header: ${encoding}`,
	);

	console.log("✅ Gzip Content-Encoding header test passed");
}

runGzipHeaderTests().catch((err: Error) => {
	console.error("❌ Gzip header test failed", err);
	process.exit(1);
});
