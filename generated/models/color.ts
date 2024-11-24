/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { colorBasic } from './colorBasic';
export type color = (colorBasic & Record<string, any> & {
    /**
     * The hex value that was requested by the user
     */
    requestedHex?: string;
    /**
     * The distance between the requested hex value and the closest color (0 = exact match)
     */
    distance?: number;
});

