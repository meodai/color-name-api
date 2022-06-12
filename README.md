# Color Name API

Rest API that returns a bunch of color names for a given color-value.

##.Getting started with the REST API

### Hello World

Let's start by testing the API. Open up a command prompt and enter the following command:

```shell
$ curl https://api.color.pizza/v1/?colors=aaffcc

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

Now when some of the requested colors are very similar you might get some duplicate names:

```shell
$ curl 'https://api.color.pizza/v1/?values=1b2b11,1c2f11,2e3f24&list=wikipedia'
```

Notice how `Phthalo Green` was returned twice. 
What makes this API unique is that you can ask to return a color name only once. So if you ask for similar colors the api will make sure to return a unique color name per requested color.

```shell
$ curl 'https://api.color.pizza/v1/?values=1b2b11,1c2f11,2e3f24&list=wikipedia&noduplicates=true'
```

In smaller color name lists. This can lead to strage results. So we suggest using this feature with some the larger lists: `default`, `bestOf`, `wikipedia`, `ntc`, `ral`, `ridgway` or `xkcd`



