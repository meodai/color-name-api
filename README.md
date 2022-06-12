# Color Name API

Rest API that returns a bunch of color names for a given color-value.

##.Getting started with the REST API

### Hello World

Let's start by testing our setup. Open up a command prompt and enter the following command:

```shell
$ curl https://api.color.pizza/v1/aaffcc

➜ {
  "colors":
    [
      {
        "name":"Neo Mint",
        "hex":"#aaffcc",
        "rgb":{"r":170,"g":255,"b":204},
        "hsl":{"h":144,"s":100,"l":83.33333},
        "lab":{"l":93.57729,"a":-34.63514,"b":15.94209},
        "luminance":159.78151,
        "luminanceWCAG":0.84426,
        "requestedHex":"#aaffcc",
        "distance":0
       }
    ], 
    "paletteTitle":"Neo Mint"
  }⏎
```
