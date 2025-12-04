/**
 * Tests for .well-known endpoints
 */

interface OpenAPIResponse {
	openapi?: string;
	swagger?: string;
	info?: unknown;
	paths?: unknown;
}

interface AIPluginResponse {
	schema_version?: string;
	api?: {
		type?: string;
		url?: string;
	};
}

const localhost = "127.0.0.1";
const port = process.env.PORT || 8080;

async function run(): Promise<void> {
	// verify server is up
	try {
		await fetch(`http://${localhost}:${port}/v1/`);
	} catch {
		console.error("ERROR: Server is not running!");
		process.exit(1);
	}

	const errors: string[] = [];

	// 1) .well-known/openapi.json
	try {
		const res = await fetch(
			`http://${localhost}:${port}/.well-known/openapi.json`,
		);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const data = (await res.json()) as OpenAPIResponse;
		if (!(data && (data.openapi || data.swagger))) {
			throw new Error("Missing openapi/swagger field in JSON");
		}
		if (!data.info || !data.paths) {
			throw new Error("OpenAPI JSON missing required fields (info/paths)");
		}
		console.log("✅ /.well-known/openapi.json OK");
	} catch (e) {
		errors.push(`/.well-known/openapi.json failed: ${(e as Error).message}`);
	}

	// 2) .well-known/security.txt
	try {
		const res = await fetch(
			`http://${localhost}:${port}/.well-known/security.txt`,
		);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const txt = await res.text();
		if (!/Contact:/i.test(txt)) throw new Error("Missing Contact line");
		if (!/Expires:/i.test(txt)) throw new Error("Missing Expires line");
		console.log("✅ /.well-known/security.txt OK");
	} catch (e) {
		errors.push(`/.well-known/security.txt failed: ${(e as Error).message}`);
	}

	// 3) .well-known/ai-plugin.json
	try {
		const res = await fetch(
			`http://${localhost}:${port}/.well-known/ai-plugin.json`,
		);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const data = (await res.json()) as AIPluginResponse;
		if (data.schema_version !== "v1")
			throw new Error("schema_version is not v1");
		if (!data.api || data.api.type !== "openapi")
			throw new Error("api.type is not openapi");
		if (!data.api.url || !data.api.url.endsWith("/openapi.yaml"))
			throw new Error("api.url does not point to /openapi.yaml");
		console.log("✅ /.well-known/ai-plugin.json OK");
	} catch (e) {
		errors.push(`/.well-known/ai-plugin.json failed: ${(e as Error).message}`);
	}

	if (errors.length) {
		console.error("\n❌ Well-known tests failed:");
		for (const err of errors) console.error(`- ${err}`);
		process.exit(1);
	}

	console.log("\nAll well-known endpoint tests passed! 🎉");
	process.exit(0);
}

run();
