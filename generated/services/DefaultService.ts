/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { color } from '../models/color';
import type { colorBasic } from '../models/colorBasic';
import type { listDescription } from '../models/listDescription';
import type { possibleLists } from '../models/possibleLists';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DefaultService {
    /**
     * Get all colors of the default color name list
     * Returns an array of colors from the specified list, with distance calculations
     * to show how close each match is to the requested colors. When providing multiple
     * values, the endpoint will find the closest match for each color.
     *
     * @param list The name of the color name list to use (case-insensitive)
     * @param values A comma-separated list of hex values (e.g., `FF0000,00FF00` do not include the `#`)
     * @param noduplicates Allow duplicate names or not
     * @returns any OK
     * @throws ApiError
     */
    public static get(
        list?: possibleLists,
        values?: string,
        noduplicates?: boolean,
    ): CancelablePromise<{
        colors?: Array<color>;
        paletteTitle?: string;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/',
            query: {
                'list': list,
                'values': values,
                'noduplicates': noduplicates,
            },
            errors: {
                404: `NOT FOUND`,
            },
        });
    }
    /**
     * Get all colors of the default color name list
     * @param name The name of the color to retrieve (min 3 characters)
     * @param list The name of the color name list to use
     * @returns any OK
     * @throws ApiError
     */
    public static getNames(
        name: string,
        list?: possibleLists,
    ): CancelablePromise<{
        colors?: Array<colorBasic>;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/names/',
            query: {
                'name': name,
                'list': list,
            },
            errors: {
                404: `NOT FOUND`,
            },
        });
    }
    /**
     * Get all colors of the default color name list
     * Returns a list of available color name lists with descriptions and URLs to
     * the color list endpoints.
     *
     * @returns any OK
     * @throws ApiError
     */
    public static getLists(): CancelablePromise<{
        availableColorNameLists?: Array<string>;
        listDescriptions?: {
            default?: listDescription;
            bestOf?: listDescription;
            wikipedia?: listDescription;
            french?: listDescription;
            spanish?: listDescription;
            german?: listDescription;
            ridgway?: listDescription;
            risograph?: listDescription;
            basic?: listDescription;
            chineseTraditional?: listDescription;
            html?: listDescription;
            japaneseTraditional?: listDescription;
            leCorbusier?: listDescription;
            nbsIscc?: listDescription;
            ntc?: listDescription;
            osxcrayons?: listDescription;
            ral?: listDescription;
            sanzoWadaI?: listDescription;
            thesaurus?: listDescription;
            werner?: listDescription;
            windows?: listDescription;
            x11?: listDescription;
            xkcd?: listDescription;
        };
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/lists/',
            errors: {
                404: `NOT FOUND`,
            },
        });
    }
    /**
     * Generate a color swatch for any color
     * Generates an SVG swatch representation of a color. The swatch can include
     * the color name if provided. The SVG is designed to be visually appealing
     * and readable across different backgrounds.
     *
     * @param color The hex value of the color to retrieve without '#'
     * @param name The name of the color
     * @returns string OK
     * @throws ApiError
     */
    public static getSwatch(
        color: string,
        name?: string,
    ): CancelablePromise<string> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/swatch/',
            query: {
                'color': color,
                'name': name,
            },
            errors: {
                404: `NOT FOUND`,
            },
        });
    }
}
