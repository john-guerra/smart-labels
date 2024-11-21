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

See [smartLabels](https://observablehq.com/@john-guerra/smart-labels#smartLabels) for more options

## Known problems

* Doesn't guarantee non-overlapping
* If two marks share the same coordinates it will draw their labels and anchors in the same position. It won't be possible to hover over the repeated ones


## More examples

Please see the [/examples] folder