/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type colorBasic = {
    /**
     * Name of the closest color relative to the hex value provided
     */
    name: string;
    /**
     * Hex value of the color (can differ from the requested hex value)
     */
    hex: string;
    /**
     * RGB values
     */
    rgb: {
        'r': number;
        'g': number;
        'b': number;
    };
    /**
     * HSL values. All percentages are represented as integers (e.g., 50% as `50`).
     */
    hsl: {
        'h': number;
        's': number;
        'l': number;
    };
    /**
     * LAB values
     */
    lab: {
        'l': number;
        'a': number;
        'b': number;
    };
    /**
     * Luminance value
     */
    luminance: number;
    /**
     * Luminance value according to WCAG
     */
    luminanceWCAG: number;
    /**
     * SVG representation of the color
     */
    swatchImg: {
        /**
         * SVG representation of the color with the name
         */
        svgNamed: string;
        /**
         * SVG representation of the color without the name
         */
        svg: string;
    };
};

