const localhost = '127.0.0.1'; // not localhost, because of the fetch() call fails in node otherwise
const port = process.env.PORT || 8080;
const currentVersion = 'v1';
const APIurl = ''; // subfolder for the API
const baseUrl = `${APIurl}${currentVersion}`;

function colorResponseBasicTest(response) {
  if (typeof response !== 'object') {
    throw new Error('response is not an object');
  }
  if (response.hasOwnProperty('paletteTitle') === false) {
    throw new Error('response does not have property paletteTitle');
  }
  if (response.hasOwnProperty('colors') === false) {
    throw new Error('response does not return any colors');
  }
  if (response.colors.length === 0) {
    throw new Error('response does not return any colors');
  }
}

function colorObjectTest(colorObj) {
  if (colorObj.hasOwnProperty('hex') === false) {
    throw new Error('color object does not have property hex');
  }
  if (colorObj.hasOwnProperty('name') === false) {
    throw new Error('color object does not have property name');
  }
  if (colorObj.hasOwnProperty('rgb') === false && typeof colorObj.rgb !== 'object') {
    throw new Error('color object does not have property rbg');
  }
  if (colorObj.hasOwnProperty('hsl') === false && typeof colorObj.hsl !== 'object') {
    throw new Error('color object does not have property hsl');
  }
  if (colorObj.hasOwnProperty('lab') === false && typeof colorObj.lab !== 'object') {
    throw new Error('color object does not have property lab');
  }
  if (colorObj.hasOwnProperty('luminance') === false) {
    throw new Error('color object does not have property luminance');
  }
  if (colorObj.hasOwnProperty('luminanceWCAG') === false) {
    throw new Error('color object does not have property luminanceWCAG');
  }
  if (colorObj.hasOwnProperty('swatchImg') === false && typeof colorObj.swatchImg !== 'object') {
    throw new Error('color object does not have property swatchImg');
  }
}

function errorResponseTest(reponseObj) {
  if (reponseObj.hasOwnProperty('error') === false) {
    throw new Error('response does not have error property');
  }
  if (reponseObj.error.hasOwnProperty('message') === false) {
    throw new Error('response does not have message property');
  }
}

function testBlackColor (response) {
  colorResponseBasicTest(response);
  if (response.colors.length !== 1) {
    throw new Error('response contains more colors than expected');
  }

  colorObjectTest(response.colors[0]);

  if (response.colors[0].hex !== '#000000') {
    throw new Error('response does not return the expected color');
  }
  if (response.colors[0].name !== 'Black') {
    throw new Error('response does not return the expected color name');
  }
};

const routesToTest = {
  '/': (response) => {
    colorResponseBasicTest(response);
  },
  '/000000': testBlackColor,
  '/?values=000000': testBlackColor,
  '/000000?goodnamesonly=true': testBlackColor,
  '/000000,fff': (response) => {
    colorResponseBasicTest(response);
    if (response.colors.length !== 2) {
      throw new Error('response contains more or less colors than expected');
    }
    colorObjectTest(response.colors[0]);
  },
  '/notahex': (response) => {
    errorResponseTest(response);
  },
  '/000000,notahex': (response) => {
    errorResponseTest(response);
  },
  '/000000,000000?noduplicates=true': (response) => {
    colorResponseBasicTest(response);
    if (response.colors.length !== 2) {
      throw new Error('response contains more colors than expected');
    }
    if (response.colors[0].name === response.colors[1].name) {
      throw new Error('response contains duplicate colors');
    }
  },
  '/?values=000000,000000&noduplicates=true': (response) => {
    colorResponseBasicTest(response);
    if (response.colors.length !== 2) {
      throw new Error('response contains more colors than expected');
    }
    if (response.colors[0].name === response.colors[1].name) {
      throw new Error('response contains duplicate colors');
    }
  },
  '/meta/lists/': (response) => {
    if (typeof response !== 'object') {
      throw new Error('response is not an object');
    }
    if (response.hasOwnProperty('avalibleColorNameLists') === false) {
      throw new Error('response does not have property avalibleColorNameLists');
    }
    if (response.avalibleColorNameLists.length === 0) {
      throw new Error('response does not return any color name list keys');
    }
    if (response.hasOwnProperty('listDescriptions') === false) {
      throw new Error('response does not have property listDescriptions');
    }
    if (typeof response.listDescriptions !== 'object' && typeof response.listDescriptions.colors !== 'object') {
      throw new Error('response does not return any color name lists');
    }
  },
};

Object.keys(routesToTest).forEach((route) => {
  const testFn = routesToTest[route];

  console.log(`testing route: http://${localhost}:${port}/${baseUrl}${route}`);

  fetch(`http://${localhost}:${port}/${baseUrl}${route}`)
    .then((res) => res.json())
    .then(
      testFn,
    ).catch((err) => {
      console.log(err);
      console.log('Make sure the server is running on port', port);
      process.exit(1);
    });
});

process.exit(0);
