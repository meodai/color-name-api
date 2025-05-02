import http from 'http';
import zlib from 'zlib';
import { promisify } from 'util';
import fs from 'fs/promises';
import colorNameLists from 'color-name-lists';
import {colornames as colors} from 'color-name-list';
import {colornames as colorsBestOf } from "color-name-list/bestof";
import {colornames as colorsShort } from 'color-name-list/short';
import { Server } from 'socket.io';
import requestIp from 'request-ip';
import { lookup } from "ip-location-api";
import * as dotenv from 'dotenv';
import { LRUCache } from 'lru-cache'; // Import LRUCache

import { FindColors } from './findColors.js';
import { getPaletteTitle } from './generatePaletteName.js';
import { svgTemplate } from './colorSwatchSVG.js';
import { createColorRecord } from './lib.js';
import { initDatabase, addResponseToTable } from './database.js';

dotenv.config();

const gzip = promisify(zlib.gzip);

const port = process.env.PORT || 8080;
const socket = process.env.SOCKET || false;
const allowedSocketOrigins = (
  process.env.ALLOWED_SOCKET_ORIGINS
  && process.env.ALLOWED_SOCKET_ORIGINS.split(',')
) || `http://localhost:${port}`;
const currentVersion = 'v1';
const urlNameSubpath = 'names';
const APIurl = ''; // subfolder for the API
const baseUrl = `${APIurl}${currentVersion}/`;
const baseUrlNames = `${baseUrl}${urlNameSubpath}/`;
const urlColorSeparator = ',';
const gzipCacheSize = 500; // Max size of the gzip cache
const ipCacheSize = 1000; // Cache size for IP lookup results

// Declare variables for async loading
let docsHTML;
let gzippedDocsHTML; // Cache for gzipped docs
const gzipCache = new LRUCache({ max: gzipCacheSize });
const ipCache = new LRUCache({ max: ipCacheSize }); // Cache for IP lookups

let io;
let hasDb = false;

const responseHeaderObj = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET',
  'Access-Control-Allow-Credentials': false,
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Headers': 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept',
  'Content-Type': 'application/json; charset=utf-8',
};

const responseHandlerSVG = {
  ...responseHeaderObj,
  'Content-Type': 'image/svg+xml',
};

const responseHandlerHTML = {
  ...responseHeaderObj,
  'Content-Type': 'text/html; charset=utf-8',
};

// [{name: 'red', value: '#f00'}, ...]
const colorsLists = {
  default: colors,
  bestOf: colorsBestOf,
  short: colorsShort,
};

Object.assign(colorsLists, colorNameLists.lists);

const availableColorNameLists = Object.keys(colorsLists);

// add meta data to the color lists that are not in the color-name-lists package
const colorNameListMeta = {
  title: 'Handpicked Color Names',
  description: `A large hand-picked list of ${colors.length} unique color names from various sources and thousands of curated user submissions.`,
  source: 'https://github.com/meodai/color-names',
  key: 'colors',
  colorCount: colors.length,
};

colorNameLists.meta.default = { ...colorNameListMeta, key: 'default' };

colorNameLists.meta.bestOf = {
  title: 'Best of Color Names',
  source: 'https://github.com/meodai/color-names',
  description: 'Best color names selected from various sources.',
  key: 'bestOf',
  colorCount: colorsBestOf.length,
};

colorNameLists.meta.short = {
  title: 'Short Color Names',
  source: 'https://github.com/meodai/color-names',
  description: 'A list of short color names. (12 characters max)',
  key: 'short',
  colorCount: colorsShort.length,
};

// add endpoint urls to the meta data
Object.keys(colorNameLists.meta).forEach(
  (key) => {
    colorNameLists.meta[key].url = `/${baseUrl}?list=${key}`;
  },
);

const findColors = new FindColors(colorsLists);

/**
 * validates a hex color
 * @param   {string} color hex representation of color
 * @return  {boolean}
 */
const validateColor = (color) => (
  /^[0-9A-F]{3}([0-9A-F]{3})?$/i.test(color)
);

/**
 * validates a list of hex colors separated by a comma
 * @param   {string} hexColors list of hex colors
 * @return  {boolean}
 */
const validateColors = (hexColors) => (
  hexColors.split(urlColorSeparator).every(validateColor)
);

/**
 * gets the list key from the search params
 * @param   {object} searchParams
 * @param   {boolean} returnDefault whether to return the default list key
 * @return  {string|null} list key
 */
const getListKey = (searchParams, returnDefault = true) => {
  const goodNamesMode = searchParams.has('goodnamesonly')
                        && searchParams.get('goodnamesonly') === 'true';

  let listKey = searchParams.has('list')
                && searchParams.get('list');

  listKey = listKey || (returnDefault && (goodNamesMode ? 'bestOf' : 'default'));

  return listKey && availableColorNameLists.includes(listKey) ? listKey : null;
};

/**
 * Gets client IP and location info, with caching
 * @param {object} request - HTTP request object
 * @returns {object} Object containing clientIp and clientLocation
 */
const getClientInfo = (request) => {
  const clientIp = requestIp.getClientIp(request);
  
  if (!clientIp) {
    return { clientIp: null, clientLocation: null };
  }
  
  // Check if we already have this IP's location in cache
  if (ipCache.has(clientIp)) {
    return ipCache.get(clientIp);
  }
  
  // Look up location and cache the result
  const clientLocation = lookup(clientIp);
  const result = { clientIp, clientLocation };
  ipCache.set(clientIp, result);
  
  return result;
};

/**
 * responds to the client
 * @param {object} response      server response object
 * @param {object} responseObj   the actual response object
 * @param {*} statusCode         HTTP status code
 */
const httpRespond = async ( // Make httpRespond async
  response,
  responseObj = {},
  statusCode = 200,
  responseHeader = responseHeaderObj,
  type = 'json',
) => {
  response.writeHead(statusCode, responseHeader);

  // Handle specific content types
  if (type === 'html') {
    if (responseHeader['Content-Encoding'] === 'gzip' && gzippedDocsHTML) {
      response.end(gzippedDocsHTML);
    } else if (docsHTML) {
      response.end(docsHTML);
    } else {
      // Fallback if docsHTML hasn't loaded (should not happen in normal flow)
      response.writeHead(500, { 'Content-Type': 'text/plain' });
      response.end('Internal Server Error: Could not load documentation.');
    }
    return;
  }

  if (type === 'svg') {
     // SVG is small, gzip on the fly if needed, no caching needed here
     const svgString = responseObj; // Assuming responseObj is the SVG string for type 'svg'
     if (responseHeader['Content-Encoding'] === 'gzip') {
        const gzippedSvg = await gzip(svgString);
        response.end(gzippedSvg);
     } else {
        response.end(svgString);
     }
     return;
  }

  // Default to JSON handling
  const stringifiedResponse = JSON.stringify(responseObj);

  if (responseHeader['Content-Encoding'] === 'gzip') {
    // Check cache first for JSON responses using LRUCache methods
    let gzippedResponse = gzipCache.get(stringifiedResponse);
    if (!gzippedResponse) {
      try {
        gzippedResponse = await gzip(stringifiedResponse);
        gzipCache.set(stringifiedResponse, gzippedResponse); // Cache the gzipped result
      } catch (err) {
         console.error('Gzip compression failed:', err);
         // Send uncompressed if gzip fails
         response.writeHead(statusCode, { ...responseHeader, 'Content-Encoding': undefined });
         response.end(stringifiedResponse);
         return;
      }
    }
    response.end(gzippedResponse);
  } else {
    response.end(stringifiedResponse);
  }
};

const respondNameSearch = async ( // Make async
  searchParams,
  requestUrl,
  request,
  response,
  responseHeader,
) => {
  const nameQuery = request.url.replace(requestUrl.search, '')
  // splits the base url from everything
  // after the API URL
    .split(baseUrlNames)[1] || '';

  const listKey = getListKey(searchParams);

  // gets the name
  const nameString = searchParams.has('name')
    ? searchParams.get('name') : '';

  const searchString = decodeURI(nameString || nameQuery).trim();

  if (searchString.length < 3) {
    return await httpRespond(
      response,
      {
        error: {
          status: 404,
          message: 'the color name your are looking for must be at least 3 characters long.',
        },
      },
      404,
      responseHeader,
    );
  }

  return await httpRespond(response, {
    colors: findColors.searchNames(searchString, listKey),
  }, 200, responseHeader);
};

const respondValueSearch = async (
  searchParams,
  requestUrl,
  request,
  response,
  responseHeader,
) => {
  const uniqueMode = searchParams.has('noduplicates')
                    && searchParams.get('noduplicates') === 'true';

  const listKey = getListKey(searchParams);

  const colorQuery = request.url.replace(requestUrl.search, '')
  // splits the base url from everything
  // after the API URL
    .split(baseUrl)[1] || '';

  const colorListString = searchParams.has('values')
    ? searchParams.get('values') : '';

  // gets all the colors after
  const urlColorList = (colorQuery || colorListString).toLowerCase()
    .split(urlColorSeparator)
    .filter((hex) => hex);

  // creates a list of invalid colors
  const invalidColors = urlColorList.filter((hex) => (
    !validateColor(hex) && hex
  ));

  if (invalidColors.length) {
    return await httpRespond(
      response,
      {
        error: {
          status: 404,
          message: `'${invalidColors.join(', ')}' is not a valid HEX color`,
        },
      },
      404,
      responseHeader,
    );
  }

  let paletteTitle;
  let colorsResponse;

  if (urlColorList[0]) {
    colorsResponse = findColors.getNamesForValues(urlColorList, uniqueMode, listKey);
    
    // Check if we've exhausted all colors in unique mode
    if (uniqueMode && colorsResponse.some(color => color.error)) {
      const exhaustedColor = colorsResponse.find(color => color.error);
      return await httpRespond(
        response,
        {
          error: {
            status: 409, // Conflict - best status code for "resource exhausted"
            message: exhaustedColor.error,
            availableCount: exhaustedColor.availableCount,
            totalCount: exhaustedColor.totalCount,
            requestedCount: urlColorList.length
          },
        },
        409,
        responseHeader,
      );
    }
  } else {
    colorsResponse = colorsLists[listKey];
  }

  if (urlColorList.length === 1) {
    // if there is only one color, just return its name as palette title
    paletteTitle = colorsResponse[0].name;
  } else if (urlColorList.length > 1) {
    // get a palette title for the returned colors
    paletteTitle = getPaletteTitle(colorsResponse.map((color) => color.name));
  } else {
    // return all colors if no colors were given
    paletteTitle = `All the ${listKey} names`;
  }

  // emits the response with the colors on socket.io
  if (socket) {
    const { clientIp, clientLocation } = getClientInfo(request);
    
    // Just use the pathname and search directly, without constructing URL objects
    const relativePath = requestUrl.pathname + requestUrl.search;
    
    io.emit('colors', {
      paletteTitle,
      colors: colorsResponse,
      list: listKey,
      request: {
        url: relativePath,
        method: request.method,
        // headers: request.headers,
        // clientIp, // don't think its safe to send this
        clientLocation,
      }
    });
  }

  // Save response to database
  if (hasDb) {
    const record = createColorRecord({ paletteTitle, colors: colorsResponse, list: listKey });
    addResponseToTable(record);
  }

  // actual http response
  return await httpRespond(response, {
    paletteTitle,
    colors: colorsResponse,
  }, 200, responseHeader);
};

const respondLists = async (
  searchParams,
  requestUrl,
  request,
  response,
  responseHeader,
) => {
  const listKey = getListKey(searchParams, false);

  if (listKey) {
    return await httpRespond(
      response,
      colorNameLists.meta[listKey],
      200,
      responseHeader,
    );
  }

  const localAvailableColorNameLists = Object.keys(colorsLists);
  return await httpRespond(response, {
    availableColorNameLists: localAvailableColorNameLists,
    listDescriptions: colorNameLists.meta,
  }, 200, responseHeader);
};

const routes = [
  {
    path: '/docs/',
    handler: async (
      searchParams,
      requestUrl,
      request,
      response,
      responseHeader
    ) => await httpRespond(
      response,
      docsHTML,
      200,
      { ...responseHeader, ...responseHandlerHTML },
      'html',
    ),
  },
  {
    path: '/names/',
    handler: respondNameSearch,
  },
  {
    path: '/lists/',
    handler: respondLists,
  },
  {
    path: '/swatch/',
    handler: async (
      searchParams,
      requestUrl,
      request,
      response,
      responseHeader,
    ) => {
      // Input validation for color and name parameters
      const colorParam = searchParams.get('color');
      const nameParam = searchParams.get('name'); // Optional

      if (!colorParam || !/^[0-9a-fA-F]+$/.test(colorParam)) {
        return await httpRespond(
          response,
          {
            error: {
              status: 400, // Use 400 for bad request
              message: 'A valid hex color parameter (without #) is required.',
            },
          },
          400, // Bad Request
          responseHeader,
        );
      }

      // Optional: More robust validation/sanitization for name if needed
      const sanitizedName = nameParam ? String(nameParam).trim() : null; // Basic sanitization

      return await httpRespond(
        response,
        svgTemplate(`#${colorParam}`, sanitizedName), // Pass sanitized name
        200,
        { ...responseHeader, ...responseHandlerSVG }, // Merge headers, ensure correct content type
        'svg',
      );
    },
  },
  {
    path: '/',
    handler: respondValueSearch,
  },
];

const getHandlerForPath = (path) => {
  // Normalize path by removing trailing slash except for root path
  const normalizedPath = path === '/' ? '/' : path.replace(/\/+$/, '');
  
  // Find a matching route with normalized paths
  const matchingRoute = routes.find((route) => {
    const routePath = route.path === '/' ? '/' : route.path.replace(/\/+$/, '');
    return routePath === normalizedPath || routePath === normalizedPath + '/';
  });

  if (matchingRoute) {
    return matchingRoute.handler;
  }

  // If no route matches, check if it is a color (for backwards compatibility)
  if (validateColors(path.slice(1))) {
    return respondValueSearch;
  }

  return null;
};

/**
 * Paths:
 *
 * /                      => Error
 * /v1/                   => all colors
 * /v1/212121             => array with one color
 * /v1/212121,222,f02f123 => array with 3 color
 * /v1/names/             => all colors
 * /v1/names/red          => all colors containing the word red
 * /v1/lists/             => all available lists
 * /v1/swatch/?color=212121&name=red => svg with color and name
 */

const requestHandler = async (request, response) => { // Make requestHandler async
  const requestUrl = new URL(request.url, 'http://localhost');
  const isAPI = requestUrl.pathname.includes(baseUrl);
  const path = requestUrl.pathname.replace(baseUrl, '');
  const responseHeader = { ...responseHeaderObj };
  const responseHandler = getHandlerForPath(path);
  const isSocket = request.headers.upgrade === 'websocket';

  // if the request is a socket, we don't want to respond
  // with the http response
  if (isSocket) {
    return true;
  }

  // Determine if client accepts gzip
  const acceptEncoding = request.headers['accept-encoding'] || '';
  if (acceptEncoding.toLowerCase().includes('gzip')) {
    responseHeader['Content-Encoding'] = 'gzip';
  }

  // const accpets = request.headers['accept-encoding'];

  // makes sure the API is beeing requested
  if (!isAPI) {
    return await httpRespond(
      response,
      {
        error: {
          status: 404,
          message: 'invalid URL: make sure to provide the API version',
        },
      },
      404,
      responseHeader,
    );
  }

  if (responseHandler === null) {
    return await httpRespond(
      response,
      {
        error: {
          status: 404,
          message: `invalid URL: you provided '${path}', available endpoints are ${routes.map((route) => `'${route.path}'`).join(', ')}`,
        },
      },
      404,
      responseHeader,
    );
  }

  // const search = requestUrl.search || '';
  const searchParams = new URLSearchParams(requestUrl.search);

  // Validate list key before proceeding
  const listKeyValidation = getListKey(searchParams); // Check if list key is valid or default is applicable
  const requiresListKey = !['/docs/', '/swatch/'].includes(path); // Some paths don't need a list key

  if (requiresListKey && !listKeyValidation) {
    return await httpRespond(
      response,
      {
        error: {
          status: 400, // Use 400 for bad request
          message: `Invalid or missing list key: '${searchParams.get('list') || ''}'. Available keys are: ${availableColorNameLists.join(', ')}. Check /lists/ for more info.`,
        },
      },
      400, // Bad Request
      responseHeader // Pass header which might include gzip
    );
  }

  const from = request.headers.origin || request.headers.host || request.headers.referer;
  // understanding where requests come from
  if (from) {
    console.info('request from', from);
  }

  // Get client info once, log it here but could be reused elsewhere
  const { clientIp, clientLocation } = getClientInfo(request);
  if (clientIp) {
    console.info('client ip', clientIp);
    console.log('client location', clientLocation);
  }

  return await responseHandler(
    searchParams,
    requestUrl,
    request,
    response,
    responseHeader,
  );
};

const server = http.createServer(requestHandler);

// Configure Server Timeouts
server.keepAliveTimeout = 5000; // 5 seconds - Node default is 5s
server.headersTimeout = 60000; // 60 seconds - Node default is 60s
server.requestTimeout = 300000; // 5 minutes (adjust as needed) - Node default is 5min

if (socket) {
  io = new Server(server, {
    port,
    cors: {
      origin: allowedSocketOrigins,
      methods: ['GET'],
    },
  });
}

// --- Async Initialization ---
async function initializeServer() {
  try {
    // Load docs HTML asynchronously
    docsHTML = await fs.readFile('./docs/index.html', 'utf8');
    // Pre-gzip docs HTML
    gzippedDocsHTML = await gzip(docsHTML);
    console.log('Documentation HTML loaded and pre-gzipped.');

    // Initialize database if configured
    if (
      !process.env.NODB &&
      process.env.SUPRABASEURL &&
      process.env.SUPRABASEKEY
    ) {
      console.log('Initializing database...');
      await initDatabase(process.env.SUPRABASEURL, process.env.SUPRABASEKEY); // Assuming initDatabase might be async
      hasDb = true;
      console.log('Database initialized.');
    } else {
      console.log('No database connection configured.');
    }

    // Start the server only after async setup is complete
    server.listen(port, '0.0.0.0', (error) => {
      if (error) {
        console.error(`Server failed to start: ${error}`);
        process.exit(1); // Exit if server can't start
      }
      console.log(`Server running and listening on port ${port}`);
      console.log(`http://localhost:${port}/${baseUrl}`);
    });

  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1); // Exit if initialization fails
  }
}

// Start the initialization process
initializeServer();
