/**
 * Handlers for /.well-known endpoints to keep server.js tidy.
 * Also provides initialization that loads and parses the OpenAPI spec.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYAML } from 'yaml';

const DEFAULT_CONTACT_EMAIL = 'color-name-api@elastiq.click';

export function buildWellKnownHandler({
  httpRespond,
  responseHeaderObj,
  getOpenApiJSONObject,
}) {
  return async function handleWellKnown(request, response) {
    const requestUrl = new URL(request.url, 'http://localhost');

    // Only handle .well-known paths here
    if (!requestUrl.pathname.startsWith('/.well-known/')) {
      return false;
    }

    const responseHeader = { ...responseHeaderObj };
    const acceptEncoding = request.headers['accept-encoding'] || '';
    if (acceptEncoding.toLowerCase().includes('gzip')) {
      responseHeader['Content-Encoding'] = 'gzip';
    }

    // 1) Standard API discovery
    if (requestUrl.pathname === '/.well-known/openapi.json') {
      const spec = getOpenApiJSONObject();
      if (!spec) {
        await httpRespond(
          response,
          { error: { status: 500, message: 'OpenAPI spec not loaded' } },
          500,
          responseHeader
        );
        return true;
      }
      await httpRespond(response, spec, 200, {
        ...responseHeader,
        'Content-Type': 'application/json; charset=utf-8',
      });
      return true;
    }

    // 2) security.txt
    if (requestUrl.pathname === '/.well-known/security.txt') {
      const oneYearMs = 365 * 24 * 60 * 60 * 1000;
      const expires = new Date(Date.now() + oneYearMs).toISOString();
      const contactEmail =
        process.env.SECURITY_CONTACT || DEFAULT_CONTACT_EMAIL;
      const securityTxt = [
        `Contact: mailto:${contactEmail}`,
        'Contact: https://github.com/meodai/color-name-api/issues',
        'Policy: https://github.com/meodai/color-name-api#security',
        'Preferred-Languages: en',
        `Expires: ${expires}`,
      ].join('\n');

      await httpRespond(
        response,
        securityTxt,
        200,
        { ...responseHeader, 'Content-Type': 'text/plain; charset=utf-8' },
        'text'
      );
      return true;
    }

    // 3) AI plugin manifest
    if (requestUrl.pathname === '/.well-known/ai-plugin.json') {
      const proto = (request.headers['x-forwarded-proto'] || 'http').split(
        ','
      )[0];
      const host = request.headers.host;
      const origin = `${proto}://${host}`;

      const manifest = {
        schema_version: 'v1',
        name_for_human: 'Color Name API',
        name_for_model: 'color_name_api',
        description_for_human:
          'Get human-friendly names for hex colors or search color names.',
        description_for_model:
          'Given hex color values, return likely human-friendly color names; search by name text; list available color-name sources.',
        auth: { type: 'none' },
        api: {
          type: 'openapi',
          url: `${origin}/openapi.yaml`,
          is_user_authenticated: false,
        },
        logo_url:
          'https://raw.githubusercontent.com/meodai/color-name-api/main/logo.png',
        contact_email: process.env.CONTACT_EMAIL || DEFAULT_CONTACT_EMAIL,
        legal_info_url: 'https://github.com/meodai/color-name-api#license',
      };

      await httpRespond(response, manifest, 200, {
        ...responseHeader,
        'Content-Type': 'application/json; charset=utf-8',
      });
      return true;
    }

    // Not handled
    return false;
  };
}

// Initialize well-known support: load OpenAPI spec and return handler + getters
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OPENAPI_PATH = path.resolve(
  __dirname,
  '../color-names-v1-OpenAPI.yml'
);

export async function initWellKnown({
  openApiPath,
  httpRespond,
  responseHeaderObj,
}) {
  let openApiYAMLString;
  let openApiJSONObject;

  try {
    const effectivePath = openApiPath || DEFAULT_OPENAPI_PATH;
    openApiYAMLString = await fs.readFile(effectivePath, 'utf8');
    openApiJSONObject = parseYAML(openApiYAMLString);
    console.log('OpenAPI spec loaded (via wellKnown module).');
  } catch (specErr) {
    console.error(
      'Failed to load OpenAPI spec (via wellKnown module):',
      specErr
    );
  }

  const handleWellKnown = buildWellKnownHandler({
    httpRespond,
    responseHeaderObj,
    getOpenApiJSONObject: () => openApiJSONObject,
  });

  return {
    handleWellKnown,
    getOpenApiJSONObject: () => openApiJSONObject,
    getOpenApiYAMLString: () => openApiYAMLString,
  };
}
