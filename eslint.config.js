import js from "@eslint/js";
import prettierConfig from "eslint-config-prettier";
import prettier from "eslint-plugin-prettier";
import globals from "globals";

export default [
	js.configs.recommended,
	{
		files: ["**/*.js", "**/*.mjs"],
		plugins: {
			prettier,
		},
		languageOptions: {
			ecmaVersion: "latest",
			sourceType: "module",
			globals: {
				...globals.node,
			},
		},
		rules: {
			...prettierConfig.rules,
			"prettier/prettier": "error",
			"no-console": "off",
			"no-unused-vars": [
				"error",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					caughtErrorsIgnorePattern: "^_",
				},
			],
			"prefer-const": "error",
			"no-var": "error",
		},
	},
	{
		files: ["gh-pages/**/*.js"],
		languageOptions: {
			globals: {
				...globals.browser,
			},
		},
	},
	{
		ignores: ["node_modules/", "docs/", "generated/"],
	},
];
