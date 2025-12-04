/**
 * Type definitions for Color Name API
 */

// Color record from color-name-list package
export interface RawColor {
	name: string;
	hex: string;
}

// Parsed color for VP-tree operations
export interface ParsedColor {
	mode: string;
	l: number;
	a: number;
	b: number;
}

// Color with index for VP-tree
export interface IndexedColor {
	color: ParsedColor;
	index: number;
}

// RGB color components
export interface RGB {
	r: number;
	g: number;
	b: number;
}

// HSL color components
export interface HSL {
	h: number;
	s: number;
	l: number;
}

// Lab color components
export interface Lab {
	l: number;
	a: number;
	b: number;
}

// Swatch image URLs
export interface SwatchImg {
	svgNamed: string;
	svg: string;
}

// Fully hydrated color with all computed properties
export interface HydratedColor {
	name: string;
	hex: string;
	rgb: RGB;
	hsl: HSL;
	lab: Lab;
	luminance: number;
	luminanceWCAG: number;
	bestContrast: "black" | "white";
	swatchImg: SwatchImg;
	requestedHex?: string;
	distance?: number;
}

// Color search result
export interface ColorSearchResult {
	closest: RawColor;
	index: number;
}

// Color exhaustion error
export interface ColorExhaustionError {
	error: string;
	availableCount: number;
	totalCount: number;
}

// Rate limit record
export interface RateLimitRecord {
	count: number;
	resetTime: number;
}

// Rate limit check result
export interface RateLimitResult {
	limited: boolean;
	remaining: number;
	resetTime: number;
	tier?: string;
}

// Tier configuration for rate limiting
export interface TierConfig {
	requestsPerMinute: number;
	windowMs: number;
}

// Available rate limit tiers
export interface TierConfigs {
	anonymous: TierConfig;
	free: TierConfig;
	pro: TierConfig;
	enterprise: TierConfig;
}

// API error response
export interface APIError {
	error: {
		status: number;
		message: string;
		[key: string]: unknown;
	};
}

// Color list metadata
export interface ColorListMeta {
	title: string;
	description?: string;
	source?: string;
	key: string;
	colorCount?: number;
	license?: string;
	url?: string;
}

// VP-tree node
export interface VPTreeNode {
	point: IndexedColor;
	threshold: number;
	left: VPTreeNode | null;
	right: VPTreeNode | null;
}

// VP-tree search result
export interface VPTreeSearchResult {
	point: IndexedColor;
	index: number;
	distance: number;
}

// Color service options
export interface ColorSearchOptions {
	list?: string;
	unique?: boolean;
	maxResults?: number;
}

// Socket color event payload
export interface SocketColorEvent {
	paletteTitle: string;
	colors: HydratedColor[];
	list: string;
	request?: {
		url: string;
		method: string;
		clientLocation?: unknown;
		xReferrer?: string | null;
	};
}

// Environment configuration
export interface AppConfig {
	port: number;
	socketEnabled: boolean;
	rateLimitEnabled: boolean;
	rateLimitWindowMs: number;
	rateLimitMaxRequests: number;
	maxColorsPerRequest: number;
	allowedSocketOrigins: string[];
}

// Response headers
export interface ResponseHeaders {
	"Access-Control-Allow-Origin": string;
	"Access-Control-Allow-Methods": string;
	"Access-Control-Allow-Credentials": string;
	"Access-Control-Max-Age": string;
	"Access-Control-Allow-Headers": string;
	"Content-Type": string;
	"Content-Encoding"?: string;
}
