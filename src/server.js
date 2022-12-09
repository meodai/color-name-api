import http from 'http';
//import url from 'url';
import url from 'node:url';
import zlib from 'zlib';
import colorNameLists from 'color-name-lists';
import colors from 'color-name-list/dist/colornames.esm.mjs';
import colorsBestOf from 'color-name-list/dist/colornames.bestof.esm.mjs';
import {FindColors} from './findColors.js';
import {getPaletteTitle} from './generatePaletteName.js';

const port = process.env.PORT || 8080;
const currentVersion = 'v1';
const urlNameSubpath = 'names';
const APIurl = ''; // subfolder for the API
const baseUrl = `${APIurl}${currentVersion}/`;
const baseUrlNames = `${baseUrl}${urlNameSubpath}/`;
const urlColorSeparator = ',';

const responseHeaderObj = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET',
  'Access-Control-Allow-Credentials': false,
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Headers': 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept',
  'Content-Type': 'application/json; charset=utf-8',
};

// image/svg+xml

// accepts encoding

// [{name: 'red', value: '#f00'}, ...]
const colorsLists = {
  default: colors,
  colors: colors,
  bestOf: colorsBestOf,
};

Object.assign(colorsLists, colorNameLists.lists);

const avalibleColorNameLists = Object.keys(colorsLists);

const findColors = new FindColors(colorsLists);

/**
 * validates a hex color
 * @param   {string} color hex representation of color
 * @return  {boolen}
 */
const validateColor = (color) => (
  /^[0-9A-F]{3}([0-9A-F]{3})?$/i.test(color)
);

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
    responseHeader = responseHeaderObj
) => {
  response.writeHead(statusCode, responseHeader);
  const stringifiedResponse = JSON.stringify(responseObj);

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
    searchParams = new URLSearchParams(''),
    listKey = 'default',
    requestUrl,
    request,
    response,
    responseHeader,
) => {
  const nameQuery = request.url.replace(requestUrl.search, '')
  // splits the base url from everything
  // after the API URL
      .split(baseUrlNames)[1] || '';

  // gets the name
  const nameString = searchParams.has('name')
                     ? searchParams.get('name') : '';

  const searchString = decodeURI(nameString || nameQuery);

  if (searchString.length < 3) {
    return httpRespond(
        response,
        {error: {
          status: 404,
          message: `the color name your are looking for must be at least 3 characters long.`,
        }},
        404,
        responseHeader
    );
  }

  return httpRespond(response, {
    colors: findColors.searchNames(searchString, listKey),
  }, 200, responseHeader);
};

const respondValueSearch = (
    searchParams = new URLSearchParams(''),
    listKey = 'default',
    requestUrl,
    request,
    response,
    responseHeader
) => {
  const uniqueMode = searchParams.has('noduplicates')
                    && searchParams.get('noduplicates') === 'true';

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
        }
      },
      404,
      responseHeader
    );
  }

  let paletteTitle;
  let colorsResponse;

  if (urlColorList[0]) {
    colorsResponse = findColors.getNamesForValues(
        urlColorList, uniqueMode, listKey
    );
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

  // actual http response
  return httpRespond(response, {
    paletteTitle,
    colors: colorsResponse,
  }, 200, responseHeader);
};

const routes = [
  {
    path: '/names/',
    handler: respondNameSearch,
  },
  {
    path: '/meta/lists/',
    handler: (request, response) => {},
  },
  {
    path: '/swatch/',
      handler: (request, response) => {},
  },
  {
    path: '/',
    handler: respondValueSearch,
  }
];


const getHandlerForPath = (path) => {
  const route = routes.find((route) => route.path === path);
  if (route) {
    return route.handler;
  } else {
    return null;
  }
}

/**
 * Paths:
 *
 * /                      => Error
 * /v1/                   => all colors
 * /v1/212121             => array with one color
 * /v1/212121,222,f02f123 => array with 3 color
 * /v1/names/             => all colors
 * /v1/names/red          => all colors containing the word red
 */

const requestHandler = (request, response) => {
  const requestUrl = new URL(request.url, 'http://localhost');
  const isAPI = requestUrl.pathname.includes(baseUrl);
  const path = requestUrl.pathname.replace(baseUrl, '');
  const isNamesAPI = requestUrl.pathname.includes(urlNameSubpath + '/');
  const responseHeader = {...responseHeaderObj};

  // understanding where requests come from
  console.info(
      'request from',
      request.headers.origin || request.headers.host || request.headers.referer
  );

  if (request.headers['accept-encoding']) {
    const accepts = request.headers['accept-encoding'];
    if (accepts.toLowerCase().includes("gzip")) {
      responseHeader['Content-Encoding'] = 'gzip';
    }
  }

  let accpets = request.headers['accept-encoding'];

  // makes sure the API is beeing requested
  if (!isAPI) {
    return httpRespond(
      response,
      {
        error: {
          status: 404,
          message: 'invalid URL: make sure to provide the API version',
        }
      },
      404,
      responseHeader
    );
  }

  // const search = requestUrl.search || '';
  const searchParams = new URLSearchParams(requestUrl.search);

  const goodNamesMode = searchParams.has('goodnamesonly')
                        && searchParams.get('goodnamesonly') === 'true';

  let listKey = searchParams.has('list')
                && searchParams.get('list');

  listKey = goodNamesMode ? 'bestOf' : listKey;
  listKey = listKey || 'default';

  const isValidListKey = listKey && avalibleColorNameLists.includes(listKey);

  if (!isValidListKey) {
    return httpRespond(
      response,
      {
        error: {
          status: 404,
          message: `invalid list key: '${listKey}, available keys are: ${avalibleColorNameLists.join(', ')}`,
        }
      },
      404
    );
  }

  console.log(path, getHandlerForPath(path))

  if (!isNamesAPI) {
    return respondValueSearch(
        searchParams,
        listKey,
        requestUrl,
        request,
        response,
        responseHeader,
    );
  } else {
    return respondNameSearch(
        searchParams,
        listKey,
        requestUrl,
        request,
        response,
        responseHeader,
    );
  }
};

const server = http.createServer(requestHandler);
server.listen(port, '0.0.0.0', (error) => {
  if (error) {
    return console.log(`something terrible happened: ${error}`);
  }
  console.log(`Server running and listening on port ${port}`);
  console.log(`http://localhost:${port}/${baseUrl}`);
});
