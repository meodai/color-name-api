/**
 * Route exports for Color Name API
 */

export { default as colors, initColorsRoute } from "./colors";
export {
	default as docs,
	getOpenApiJSONObject,
	getOpenApiYAMLString,
	initDocsRoute,
} from "./docs";
export { default as lists, initListsRoute } from "./lists";
export { default as names, initNamesRoute } from "./names";
export { default as swatch } from "./swatch";
export { default as wellKnown } from "./wellKnown";
