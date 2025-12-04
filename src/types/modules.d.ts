/**
 * Type declarations for external modules without TypeScript support
 */

declare module "color-name-list" {
	export interface ColorName {
		name: string;
		hex: string;
	}
	export const colornames: ColorName[];
	export default colornames;
}

declare module "color-name-list/bestof" {
	import type { ColorName } from "color-name-list";
	export const colornames: ColorName[];
	export default colornames;
}

declare module "color-name-list/short" {
	import type { ColorName } from "color-name-list";
	export const colornames: ColorName[];
	export default colornames;
}

declare module "color-name-lists" {
	export interface ColorListMeta {
		title: string;
		description?: string;
		source?: string;
		key: string;
		colorCount?: number;
		license?: string;
	}

	export interface ColorNameListsModule {
		lists: Record<string, Array<{ name: string; hex: string }>>;
		meta: Record<string, ColorListMeta>;
	}

	const colorNameLists: ColorNameListsModule;
	export default colorNameLists;
}

declare module "culori" {
	export interface Color {
		mode: string;
		[key: string]: number | string | undefined;
	}

	export interface Lab extends Color {
		mode: "lab";
		l: number;
		a: number;
		b: number;
	}

	export interface Rgb extends Color {
		mode: "rgb";
		r: number;
		g: number;
		b: number;
	}

	export interface Hsl extends Color {
		mode: "hsl";
		h?: number;
		s: number;
		l: number;
	}

	export function lab(color: string | Color): Lab | undefined;
	export function differenceEuclidean(
		mode?: string,
	): (a: Color, b: Color) => number;
	export function differenceCiede2000(): (a: Color, b: Color) => number;
	export function formatHex(color: Color | string): string;
	export function parse(color: string): Color | undefined;
	export function converter(
		mode: "lab",
	): (color: Color | string) => Lab | undefined;
	export function converter(
		mode: "rgb",
	): (color: Color | string) => Rgb | undefined;
	export function converter(
		mode: "hsl",
	): (color: Color | string) => Hsl | undefined;
	export function converter(
		mode: string,
	): (color: Color | string) => Color | undefined;
	export function wcagContrast(a: Color | string, b: Color | string): number;
	export function wcagLuminance(color: Color | string): number;
}

declare module "seedrandom" {
	interface PRNG {
		(): number;
		int32(): number;
		quick(): number;
	}

	function seedrandom(seed?: string, options?: { entropy?: boolean }): PRNG;
	export = seedrandom;
}

declare module "ip-location-api" {
	export interface LocationResult {
		country?: string;
		region?: string;
		city?: string;
		ll?: [number, number]; // [latitude, longitude]
		metro?: number;
		zip?: string;
		area?: number;
	}

	export function lookup(ip: string): LocationResult | null;
}
