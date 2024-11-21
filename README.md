# Smart Labels

Add nearest on-hover and labels when there is space to your D3 chart. It should be faster than force based versions as it uses d3-delaunay, and it will choose which labels to show based on the amount of space available in the chart.

Based on the [voronoi-labels](https://observablehq.com/@d3/voronoi-labels) example by [@mbostock](https://observablehq.com/@mbostock), and combining it with [@fil's](https://observablehq.com/@fil) great [occlusion](https://observablehq.com/@fil/occlusion) example. 

Receives the data, accessors for the x and y coordinates as well as the label. Expects all the coordinates to come in pixels. 

## Usage

```html  
  <script src="https://cdn.jsdelivr.net/npm/smart-labels"></script>
  <script>
    const svg = d3.create("svg")   
    // 𓈓 add your own marks (e.g. points), we will add the text labels
      
    smartLabels(data, {
        target: svg, // where to draw
        label: (d) => d.name, // where to find the label in the data
        x: (d) => xScale(d.x), // expected in pixels
        y: (d) => yScale(d.y),
        labelsInCentroids : true, // Draw the labels in the centroid of the voronoi
        useOcclusion: true // Make occluded labels transparent
    })
  </script>
```

### Default options

```js
{
    x = (d) => d[0], // x coordinate accessor, expected to be in pixels
    y = (d) => d[1], // y coordinate accessor, expected to be in pixels
    r = () => 3, // radius accessor, expected to be in pixels
    label = (d, i) => i, // Accessor for the label
    fill = "#333", // label fill color
    stroke = "white", // label stroke color
    threshold = 2000, // Areas over this size would get labels
    width = null,
    height = null,
    target = null, // Where do you want it to draw
    font = "10px sans-serif",
    hover = true, // Show label of the hovered point
    onHover = (i) => i, // callback when hovered, will pass the index of the selected element
    hoverFont = "bolder 12px sans-serif",
    labelsInCentroids = true,

    backgroundFill = "#fefefe01", // What to paint the bg rect of the labels. Needed for the onHover
    strokeWidth = 5,

    showVoronoi = false,
    voronoiStroke = "#ccc",

    showAnchors = false,
    anchorsStroke = "orange",
    anchorsFill = "none",

    useOcclusion = true,
    occludedStyle = "opacity: 0.2", // css style rules to be used on occluded labels

    // For debugging
    showPoints = false,
    pointsFill = "#ccc",
    pointsSelectedFill = "firebrick",
    pointsStroke = "#ccc",
    renderer = "svg",
    debug = false,
    selected = null,
    padding = 3, // label padding in pixels
  }
```


## Known problems

* Doesn't guarantee non-overlapping
* If two marks share the same coordinates it will draw their labels and anchors in the same position. It won't be possible to hover over the repeated ones


## More examples

For observable notebooks please see [@john-guerra/smart-labels](https://observablehq.com/@john-guerra/smart-labels#smartLabels)

For other vanilla JS examples see the [/examples](/examples) folder