/* eslint-disable no-console */

import http from 'http';
import zlib from 'zlib';
import colorNameLists from 'color-name-lists';
import colors from 'color-name-list/dist/colornames.esm.mjs';
import colorsBestOf from 'color-name-list/dist/colornames.bestof.esm.mjs';
import { Server } from 'socket.io';
import requestIp from 'request-ip';
import * as dotenv from 'dotenv';

import { FindColors } from './findColors.js';
import { getPaletteTitle } from './generatePaletteName.js';
import { svgTemplate } from './colorSwatchSVG.js';
import { createColorRecord } from './lib.js';
import { initDatabase, addResponseToTable } from './database.js';

import fs from 'fs';

dotenv.config();

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

const docsHTML = fs.readFileSync('./docs/index.html', 'utf8');

let io;
let hasDb = false;

if (
  !process.env.NODB
  && (process.env.SUPRABASEURL && process.env.SUPRABASEKEY)
) {
  console.log('Initializing database...');
  hasDb = true;
  initDatabase(process.env.SUPRABASEURL, process.env.SUPRABASEKEY);
} else {
  console.log('No database connection configured.');
}

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

// accepts encoding

// [{name: 'red', value: '#f00'}, ...]
const colorsLists = {
  default: colors,
  bestOf: colorsBestOf,
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
 * responds to the client
 * @param {object} response      server response object
 * @param {object} responseObj   the actual response object
 * @param {*} statusCode         HTTP status code
 */
const httpRespond = (
  response,
  responseObj = {},
  statusCode = 200,
  responseHeader = responseHeaderObj,
  type = 'json',
) => {
  response.writeHead(statusCode, responseHeader);
  const stringifiedResponse = type === 'json' ? JSON.stringify(responseObj) : responseObj;

  if (responseHeader['Content-Encoding'] === 'gzip') {
    // ends the response with the gziped API answer
    zlib.gzip(stringifiedResponse, (_, result) => {
      response.end(result);
    });
  } else {
    response.end(stringifiedResponse);
  }
};

const respondNameSearch = (
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
    return httpRespond(
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

  return httpRespond(response, {
    colors: findColors.searchNames(searchString, listKey),
  }, 200, responseHeader);
};

const respondValueSearch = (
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
    return httpRespond(
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
    io.emit('colors', {
      paletteTitle,
      colors: colorsResponse,
      list: listKey,
    });
  }

  // Save response to database
  if (hasDb) {
    const record = createColorRecord({ paletteTitle, colors: colorsResponse, list: listKey });
    addResponseToTable(record);
  }

  // actual http response
  return httpRespond(response, {
    paletteTitle,
    colors: colorsResponse,
  }, 200, responseHeader);
};

const respondLists = (
  searchParams,
  requestUrl,
  request,
  response,
  responseHeader,
) => {
  const listKey = getListKey(searchParams, false);

  if (listKey) {
    return httpRespond(
      response,
      colorNameLists.meta[listKey],
      200,
      responseHeader,
    );
  }

  const localAvailableColorNameLists = Object.keys(colorsLists);
  return httpRespond(response, {
    availableColorNameLists: localAvailableColorNameLists,
    listDescriptions: colorNameLists.meta,
  }, 200, responseHeader);
};

const routes = [
  {
    path: '/docs/',
    handler: (
      searchParams,
      requestUrl,
      request,
      response,
    ) => httpRespond(
      response,
      docsHTML,
      200,
      responseHandlerHTML,
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
    handler: (
      searchParams,
      requestUrl,
      request,
      response,
      responseHeader,
    
    ) => {
      const color = searchParams.has('color') ? searchParams.get('color') : null;
      const colorName = searchParams.has('name') ? searchParams.get('name') : null;

      if (!color) {
        return httpRespond(
          response,
          {
            error: {
              status: 404,
              message: 'you need to provide at least a color',
            },
          },
          404,
          responseHeader,
        );
      }

      return httpRespond(
        response,
        svgTemplate(`#${color}`, colorName),
        200,
        responseHandlerSVG,
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
  const route = routes.find((currentRoute) => currentRoute.path === path);

  if (route) {
    return route.handler;
  }

  // if the path is not a route, check if it is a color
  // not super happy about this, but I don't want to
  // break compatibility with the old API
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

const requestHandler = (request, response) => {
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

  if (request.headers['accept-encoding']) {
    const accepts = request.headers['accept-encoding'];
    if (accepts.toLowerCase().includes('gzip')) {
      responseHeader['Content-Encoding'] = 'gzip';
    }
  }

  // const accpets = request.headers['accept-encoding'];

  // makes sure the API is beeing requested
  if (!isAPI) {
    return httpRespond(
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
    return httpRespond(
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

  if (!getListKey(searchParams)) {
    return httpRespond(
      response,
      {
        error: {
          status: 404,
          message: `invalid list key: '${searchParams.get('list')}, available keys are: ${availableColorNameLists.join(', ')} check /lists/ for more info`,
        },
      },
      404,
    );
  }

  const from = request.headers.origin || request.headers.host || request.headers.referer;
  // understanding where requests come from
  if (from) {
    console.info('request from', from);
  }

  const clientIp = requestIp.getClientIp(request);

  if (clientIp) {
    console.info('client ip', clientIp);
  }

  return responseHandler(
    searchParams,
    requestUrl,
    request,
    response,
    responseHeader,
  );
};

const server = http.createServer(requestHandler);

if (socket) {
  io = new Server(server, {
    port,
    cors: {
      origin: allowedSocketOrigins,
      methods: ['GET'],
    },
  });
}

server.listen(port, '0.0.0.0', (error) => {
  if (error) {
    return console.log(`something terrible happened: ${error}`);
  }
  console.log(`Server running and listening on port ${port}`);
  console.log(`http://localhost:${port}/${baseUrl}`);

  return null;
});
