import { hasOwnProperty as hasOwn } from "../src/lib.js";

const localhost = "127.0.0.1"; // not localhost, because of the fetch() call fails in node otherwise
const port = process.env.PORT || 8080;
const currentVersion = "v1";
const APIurl = ""; // subfolder for the API
const baseUrl = `${APIurl}${currentVersion}`;

function colorResponseBasicTest(response) {
	if (typeof response !== "object") {
		throw new Error("response is not an object");
	}
	if (hasOwn(response, "paletteTitle") === false) {
		throw new Error("response does not have property paletteTitle");
	}
	if (hasOwn(response, "colors") === false) {
		throw new Error("response does not return any colors");
	}
	if (response.colors.length === 0) {
		throw new Error("response does not return any colors");
	}
}

function colorObjectTest(colorObj) {
	if (hasOwn(colorObj, "hex") === false) {
		throw new Error("color object does not have property hex");
	}
	if (hasOwn(colorObj, "name") === false) {
		throw new Error("color object does not have property name");
	}
	if (hasOwn(colorObj, "rgb") === false && typeof colorObj.rgb !== "object") {
		throw new Error("color object does not have property rbg");
	}
	if (hasOwn(colorObj, "hsl") === false && typeof colorObj.hsl !== "object") {
		throw new Error("color object does not have property hsl");
	}
	if (hasOwn(colorObj, "lab") === false && typeof colorObj.lab !== "object") {
		throw new Error("color object does not have property lab");
	}
	if (hasOwn(colorObj, "luminance") === false) {
		throw new Error("color object does not have property luminance");
	}
	if (hasOwn(colorObj, "luminanceWCAG") === false) {
		throw new Error("color object does not have property luminanceWCAG");
	}
	if (
		hasOwn(colorObj, "swatchImg") === false &&
		typeof colorObj.swatchImg !== "object"
	) {
		throw new Error("color object does not have property swatchImg");
	}
}

function errorResponseTest(responseObj) {
	if (hasOwn(responseObj, "error") === false) {
		throw new Error("response does not have error property");
	}
	if (hasOwn(responseObj.error, "message") === false) {
		throw new Error("error response does not have message property");
	}
	if (hasOwn(responseObj.error, "status") === false) {
		throw new Error("error response does not have status property");
	}
}

function testBlackColor(response) {
	colorResponseBasicTest(response);
	if (response.colors.length !== 1) {
		throw new Error("response contains more colors than expected");
	}

	colorObjectTest(response.colors[0]);

	if (response.colors[0].hex !== "#000000") {
		throw new Error("response does not return the expected color");
	}
	if (response.colors[0].name !== "Black") {
		throw new Error("response does not return the expected color name");
	}

	if (response.colors[0].bestContrast !== "white") {
		throw new Error("response does not return the correct bestContrast value");
	}
}

const routesToTest = {
	"/": (response) => {
		colorResponseBasicTest(response);
	},
	"/000000": testBlackColor,
	"/?values=000000": testBlackColor,
	"/000000?goodnamesonly=true": testBlackColor,
	"/000000,fff": (response) => {
		colorResponseBasicTest(response);
		if (response.colors.length !== 2) {
			throw new Error("response contains more or less colors than expected");
		}
		colorObjectTest(response.colors[0]);
	},
	"/notahex": (response) => {
		errorResponseTest(response);
	},
	"/000000,notahex": (response) => {
		errorResponseTest(response);
	},
	"/000000,000000?noduplicates=true": (response) => {
		colorResponseBasicTest(response);
		if (response.colors.length !== 2) {
			throw new Error("response contains more colors than expected");
		}
		if (response.colors[0].name === response.colors[1].name) {
			throw new Error("response contains duplicate colors");
		}
	},
	"/?values=000000,000000&noduplicates=true": (response) => {
		colorResponseBasicTest(response);
		if (response.colors.length !== 2) {
			throw new Error("response contains more colors than expected");
		}
		if (response.colors[0].name === response.colors[1].name) {
			throw new Error("response contains duplicate colors");
		}
	},
	// Test for requesting more colors than are available in unique mode
	// The "basic" list has 21 colors so requesting 22 should trigger our error handling
	"/?noduplicates=true&list=basic&values=000000,111111,222222,333333,444444,555555,666666,777777,888888,999999,aaaaaa,bbbbbb,cccccc,dddddd,eeeeee,ffffff,123456,654321,abcdef,fedcba,010101,020202":
		(response) => {
			// We should get an error response since we're requesting 22 colors but the basic list only has 21
			if (!response.error) {
				throw new Error(
					"Expected an error response for exhausted colors but got a success response",
				);
			}

			errorResponseTest(response);

			// Check for specific error properties in the exhausted colors case
			if (!hasOwn(response.error, "availableCount")) {
				throw new Error("Error response missing availableCount property");
			}
			if (!hasOwn(response.error, "totalCount")) {
				throw new Error("Error response missing totalCount property");
			}
			if (!hasOwn(response.error, "requestedCount")) {
				throw new Error("Error response missing requestedCount property");
			}

			// Verify correct status code
			if (response.error.status !== 409) {
				throw new Error(`Expected status 409 but got ${response.error.status}`);
			}

			// The requested count should match the number of colors we requested (22)
			if (response.error.requestedCount !== 22) {
				throw new Error(
					`Expected requestedCount to be 22 but got ${response.error.requestedCount}`,
				);
			}

			// The total count should be 21 (number of colors in basic list)
			if (response.error.totalCount !== 21) {
				throw new Error(
					`Expected totalCount to be 21 but got ${response.error.totalCount}`,
				);
			}

			console.log("✅ Exhausted colors test passed!");
		},
	// Test for requesting exactly the number of colors available (21) in the basic list
	"/?noduplicates=true&list=basic&values=000000,111111,222222,333333,444444,555555,666666,777777,888888,999999,aaaaaa,bbbbbb,cccccc,dddddd,eeeeee,ffffff,123456,654321,abcdef,fedcba,010101":
		(response) => {
			// This should succeed since we're requesting exactly the number of available colors
			if (response.error) {
				throw new Error(
					`Got unexpected error when requesting exact number of colors: ${response.error.message}`,
				);
			}

			colorResponseBasicTest(response);

			// We should have received exactly 21 colors
			if (response.colors.length !== 21) {
				throw new Error(`Expected 21 colors but got ${response.colors.length}`);
			}

			// Verify all colors have unique names
			const names = response.colors.map((color) => color.name);
			const uniqueNames = [...new Set(names)];
			if (names.length !== uniqueNames.length) {
				throw new Error(
					"Response contains duplicate color names in unique mode",
				);
			}

			console.log("✅ Exact color count test passed!");
		},
	// Keep the existing short list test with amended expectations
	"/?values=000000,111111,222222,333333,444444&noduplicates=true&list=short": (
		response,
	) => {
		// Note: 'short' is not a short list but a list of colors with short names
		// It likely has more than 5 colors, so we expect a successful response
		colorResponseBasicTest(response);
		if (response.colors.length !== 5) {
			throw new Error(`Expected 5 colors but got ${response.colors.length}`);
		}
		// Verify all colors have unique names
		const names = response.colors.map((color) => color.name);
		const uniqueNames = [...new Set(names)];
		if (names.length !== uniqueNames.length) {
			throw new Error("Response contains duplicate color names in unique mode");
		}
	},
	"/lists/": (response) => {
		if (typeof response !== "object") {
			throw new Error("response is not an object");
		}
		if (hasOwn(response, "availableColorNameLists") === false) {
			throw new Error(
				"response does not have property availableColorNameLists",
			);
		}
		if (response.availableColorNameLists.length === 0) {
			throw new Error("response does not return any color name list keys");
		}
		if (hasOwn(response, "listDescriptions") === false) {
			throw new Error("response does not have property listDescriptions");
		}
		if (
			typeof response.listDescriptions !== "object" &&
			typeof response.listDescriptions.colors !== "object"
		) {
			throw new Error("response does not return any color name lists");
		}
	},
};

async function runTests() {
	console.log(`Starting tests against server on port ${port}`);

	// First test if the server is running
	try {
		await fetch(`http://${localhost}:${port}/${baseUrl}/`);
		console.log("Server is running. Starting tests...");
	} catch {
		console.error("ERROR: Server is not running!");
		console.error(`Make sure the server is running on port ${port}`);
		process.exit(1);
	}

	const routes = Object.keys(routesToTest);
	const results = {
		pass: 0,
		fail: 0,
		errors: [],
	};

	// Run each test in sequence
	for (const route of routes) {
		const testFn = routesToTest[route];
		console.log(
			`Testing route: http://${localhost}:${port}/${baseUrl}${route}`,
		);

		try {
			const res = await fetch(`http://${localhost}:${port}/${baseUrl}${route}`);
			const response = await res.json();

			// Execute the test function
			await testFn(response);
			console.log(`✅ Test passed for ${route}`);
			results.pass++;
		} catch (err) {
			console.error(`❌ Test failed for ${route}: ${err.message}`);
			results.errors.push({ route, error: err.message });
			results.fail++;
		}
	}

	// Output summary
	console.log("\n=== Test Summary ===");
	console.log(`Passed: ${results.pass}/${routes.length}`);
	console.log(`Failed: ${results.fail}/${routes.length}`);

	if (results.fail > 0) {
		console.error("\nFailed tests:");
		results.errors.forEach(({ route, error }) => {
			console.error(`- ${route}: ${error}`);
		});
		process.exit(1);
	} else {
		console.log("\nAll tests passed! 🎉");
		process.exit(0);
	}
}

runTests();
