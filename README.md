<img src="logo.png" width="274.5" alt="Color Name API Logo" align="right" />

# Color Name API

[![github sponsor count](https://img.shields.io/github/sponsors/meodai)](https://github.com/sponsors/meodai)
[![npm version](https://img.shields.io/npm/v/color-name-api.svg)](https://www.npmjs.com/package/color-name-api)

Rest API that returns a bunch of color names for a given color-value.

Introducing a comprehensive and easy to use color-naming API!
Easily retrieve the color name for any hexadecimal color value, using a variety 
of different color name lists. Whether you're working on a design project or 
building a color-themed application, our API has you covered.

## Getting started with the REST API

### Hello World

Let's start by testing the API. Open up a command prompt and enter the following command:

```shell
$ curl https://api.color.pizza/v1/?values=aaffcc

➜ {
➜   "colors":
➜    [
➜      {
➜        "name":"Neo Mint",
➜        "hex":"#aaffcc",
➜        "rgb":{"r":170,"g":255,"b":204},
➜        "hsl":{"h":144,"s":100,"l":83.33333},
➜        "lab":{"l":93.57729,"a":-34.63514,"b":15.94209},
➜        "luminance":159.78151,
➜        "luminanceWCAG":0.84426,
➜        "requestedHex":"#aaffcc",
➜        "distance":0
➜       }
➜    ], 
➜    "paletteTitle":"Neo Mint"
➜  }
```

The response will be a a JSON Object containing two keys: `colors` and `paletteTitle` 
*colors* will contain an array of all the colors you have asked for, with some useful information like `name` or `hsl`.

Now, let's `GET` the names for multiple colors:
```shell
$ curl 'https://api.color.pizza/v1/?values=0d0d0f,f39d91,d4d4d7'

➜ 
{
  "paletteTitle":"Ruined Amber",
  "colors":[
    {
      "name":"Ruined Smores",
      "hex":"#0f1012",
      "rgb":{
        "r":15,
        "g":16,
        "b":18
      },
      "hsl":{
        "h":220,
        "s":9.09091,
        "l":6.47059
      },
      "lab":{
        "l":4.64662,
        "a":-0.0655,
        "b":-1.21669
      },
      "luminance":10.60828,
      "luminanceWCAG":0.00516,
      "requestedHex":"#0d0d0f",
      "distance":0.7732
    },
    {
      "name":"Peach Amber",
      "hex":"#fb9f93",
      "rgb":{
        "r":251,
        "g":159,
        "b":147
      },
      "hsl":{
        "h":7,
        "s":92.85714,
        "l":78.03922
      },
      "lab":{
        "l":74.88027,
        "a":34.17564,
        "b":21.39099
      },
      "luminance":120.93069,
      "luminanceWCAG":0.47412,
      "requestedHex":"#f39d91",
      "distance":1.39432
    },
    {
      "name":"Nimbus Cloud",
      "hex":"#d5d5d8",
      "rgb":{
        "r":213,
        "g":213,
        "b":216
      },
      "hsl":{
        "h":240,
        "s":3.7037,
        "l":84.11765
      },
      "lab":{
        "l":85.33592,
        "a":0.40788,
        "b":-1.48475
      },
      "luminance":142.46096,
      "luminanceWCAG":0.66693,
      "requestedHex":"#d4d4d7",
      "distance":0.23432
    }
  ]
}
```

The response now contains 3 objects in the `colors` array. The API will return the closest color names if can find for each requested color.
The come from a [large collection](https://github.com/meodai/color-names). If for some reason you don't like the names, there are several other lists to choose from. So lets get the same names from a differet `list`.  

```shell
$ curl 'https://api.color.pizza/v1/?values=0d0d0f,f39d91,d4d4d7&list=wikipedia'
```

### Get supported color name lists

```shell
$ curl 'https://api.color.pizza/v1/lists/'

➜
{
  availableColorNameLists: [
    "defaults",
    "colors",
    "bestOf",
    "basic"
    // ... //
  ],
  listDescriptions: {
    "basic": {
      "title": "Basic",
      "description": "A set of basic colors. Red, Green, Blue...",
      "source": "https://github.com/colorjs/color-namer/tree/master/lib/colors",
      "key": "basic"
      "colorCount": 21,
      "url": "/v1/?list=basic"
    },
    // ... //
  }
}
```

The response contains two keys: `availableColorNameLists` and `listDescriptions`.

`availableColorNameLists` is an array of all the color name lists currently supported by Color Names, such as Wikipedia, HTML color lists, traditional Japanese colors etc.

`listdescriptions`is an object whose keys are the name of the color lists with values containing useful information such as `title`, `description`, `source` etc.

In this [demo](https://codepen.io/bytrangle/full/jOpOrdv), you can preview names of common colors given by each list. You can also change the input colors and the corresponding names in each list will be updated on the spot.

Now when some of the requested colors are very similar you might get some duplicate names:

```shell
$ curl 'https://api.color.pizza/v1/?values=1b2b11,1c2f11,2e3f24&list=wikipedia'
```

Notice how `Phthalo Green` was returned twice. 
What makes this API unique is that you can ask to return a color name only once. So if you ask for similar colors the api will make sure to return a unique color name per requested color.

```shell
$ curl 'https://api.color.pizza/v1/?values=1b2b11,1c2f11,2e3f24&list=wikipedia&noduplicates=true'
```

### Understanding the `noduplicates` Parameter

The `noduplicates=true` parameter is a powerful feature that ensures each requested color receives a unique name, even when colors are similar. When enabled:

- The API will never return the same color name twice in a single response
- Each color in your request will receive the closest available unique name
- Names are assigned in the order colors appear in your request
- The algorithm intelligently selects alternative names with minimal perceptual distance

This is particularly useful for:

- Generating diverse color palettes with distinct names
- Creating color legends where each item needs a unique identifier
- Building accessible interfaces where similar colors need distinguishable names
- Naming elements in data visualizations

#### Technical Implementation

The API uses an efficient Vantage Point Tree (VPTree) spatial data structure to find the nearest unique color names. When `noduplicates=true`, each assigned name is temporarily removed from future consideration within that request.

#### Best Practices

For optimal results with `noduplicates=true`:
- Use with larger color name lists: `default`, `bestOf`, `wikipedia`, `ntc`, `ral`, `ridgway` or `xkcd`
- Order your most important colors first in the request, as they'll receive the closest name matches
- Be aware that with very small color lists or many similar colors, later colors might receive less ideal name matches

In smaller color name lists, this can lead to unexpected results as the algorithm must choose increasingly distant color names. We suggest using this feature with some of the larger lists mentioned above.

### Using WebSockets

The Color Name API also supports real-time color updates via WebSocket connections. It
broadcasts whenever new color names are requested through the API. If you're interested in using WebSockets with the API, please [create an issue](/issues) with your use case and domain.

Codepen is allowed by default. See the [demo](https://codepen.io/meodai/full/rNryZyE) for an example of how to use the WebSocket connection.

To use WebSockets with the API:

1. First, make sure your domain is on the allowed origins list. Currently, WebSocket connections are restricted to approved origins for security purposes. If you need access, please [create an issue](https://github.com/meodai/color-name-api/issues) with your use case and domain.

2. Connect to the WebSocket endpoint using a WebSocket client:

    ```javascript
    const socket = io('https://api.color.pizza', {
      transports: ['websocket']
    });

    // Listen for color updates
    socket.on('colors', (data) => {
      console.log('Received color data:', data);
      // {
      //   paletteTitle: "Neo Mint",
      //   colors: [{
      //     name: "Neo Mint",
      //     hex: "#aaffcc",
      //     // ... other color properties
      //   }],
      //   list: "default"
      // }
    });
    ```

3. The WebSocket connection will automatically receive updates whenever new colors are requested through the API. The data format matches the REST API response structure, containing the `paletteTitle`, `colors` array, and the `list` used.

#### Server Configuration

If you're self-hosting the API, you can enable WebSocket support by setting the following environment variables:

```shell
SOCKET=true
ALLOWED_SOCKET_ORIGINS=https://yourdomain.com,https://otherdomain.com
```

Note that WebSocket support is optional and disabled by default. The REST API endpoints will continue to work regardless of WebSocket configuration.
