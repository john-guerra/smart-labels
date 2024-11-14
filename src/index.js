import * as d3 from "d3";
// Based on https://observablehq.com/@d3/voronoi-labels by Mike Bostock

// ISC License

// Copyright 2018–2023 Observable, Inc.
// Permission to use, copy, modify, and/or distribute this software for any
// purpose with or without fee is hereby granted, provided that the above
// copyright notice and this permission notice appear in all copies.

// THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
// WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
// ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
// WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
// ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
// OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
export default function smartLabels(
  data,
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
  } = {}
) {
  data = data.filter(
    (d, index) =>
      x(d, index) !== undefined &&
      x(d, index) !== null &&
      y(d, index) !== undefined &&
      y(d, index) !== null
  );

  let xExtent = d3.extent(data, x),
    yExtent = d3.extent(data, y);
  width = width || xExtent[1] - xExtent[0];
  height = height || yExtent[1] - yExtent[0];

  if (debug) console.log("✅ smartLabels renderer", renderer);

  function checkIfTargetMatchesRenderer(target, renderer) {
    if (target && target.node) {
      target = target.node();
    }
    if (renderer.toLocaleLowerCase() === "canvas") {
      return target instanceof HTMLCanvasElement;
    } else {
      return target instanceof SVGElement;
    }
  }

  if (!checkIfTargetMatchesRenderer(target, renderer)) {
    if (debug) console.log("❌ smartLabels Target doesn't match the renderer", target, renderer);
    throw new Error("Smartlabels Target doesn't match the renderer", target, renderer);
  }

  // Try to reuse the target
  if (renderer.toLocaleLowerCase() === "canvas") {
    if (target) {
      target = d3.select(target.node ? target.node() : target);
    } else {
      target = d3.create("canvas").attr("width", width).attr("height", height);
    }
    useOcclusion = false;
  } else {
    if (target) {
      target = d3.select(target.node ? target.node() : target);
    } else {
      target = d3.create("svg").attr("viewBox", [0, 0, width, height]);
    }
    target = target || d3.create("svg").attr("viewBox", [0, 0, width, height]);
  }

  const delaunay = d3.Delaunay.from(data, x, y);
  const voronoi = delaunay.voronoi([
    xExtent[0] - 1,
    yExtent[0] - 1,
    xExtent[1] + 1,
    yExtent[1] + 1,
  ]);

  let cells = data.map((d, i) => [d, voronoi.cellPolygon(i)]);
  // Replace null cells with the nearest one
  cells = cells
    .map(([d, cell], index) => [d, getNearestCell(d, cell, index)])
    .map(([d, cell]) => ({ d, cell, show: -d3.polygonArea(cell) > threshold }));

  // cells can be null when we have duplicated coords
  // https://github.com/d3/d3-delaunay/issues/106
  function getNearestCell(d, cell, index) {
    if (!cell) {
      const i = delaunay.find(x(d, index), y(d, index));
      if (i === -1) {
        console.log("couldn't find cell", i, d, x(d, index), y(d, index));
        return null;
      }
      cell = cells[i][1];
    }
    return cell;
  }

  function renderSVG() {
    let anchors = null;
    if (useOcclusion) {
      target
        .selectAll("style.smartLabels")
        .data([0])
        .join("style")
        .attr("class", "smartLabels").html(`
        svg g.labels > text.occluded:not(.selected) { ${occludedStyle} }
    `);
    }

    const mouseRect = target
      .selectAll("rect.smartLabels")
      .data([0])
      .join("rect")
      .attr("class", "smartLabels")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", backgroundFill)
      .attr("stroke", "none");

    const orient = {
      top: (text) =>
        text
          .attr("text-anchor", "middle")
          .attr("y", (d, i) => -(r(d, i) + padding)),
      right: (text) =>
        text
          .attr("text-anchor", "start")
          .attr("dy", "0.35em")
          .attr("x", (d, i) => r(d, i) + padding),
      bottom: (text) =>
        text
          .attr("text-anchor", "middle")
          .attr("dy", "0.71em")
          .attr("y", (d, i) => r(d, i) + padding),
      left: (text) =>
        text
          .attr("text-anchor", "end")
          .attr("dy", "0.35em")
          .attr("x", (d, i) => -(r(d, i) + padding)),
    };

    if (showAnchors || labelsInCentroids) {
      anchors = target
        .selectAll("g#anchors")
        .data([cells])
        .join("g")
        .attr("pointer-events", "none")
        .attr("id", "anchors")
        .attr("stroke", anchorsStroke)
        .attr("fill", anchorsFill)
        .selectAll("path.anchor")
        .data((d) => d)
        .join("path")
        .attr("class", "anchor")
        .attr("display", ({ show }) => (show ? null : "none"))
        .attr("d", ({ d, cell }, index) =>
          cell
            ? `M${d3.polygonCentroid(cell)}L${x(d, index)},${y(d, index)}`
            : null
        );
    }

    if (showVoronoi) {
      target
        .selectAll("path#voronoi")
        .data([1])
        .join("path")
        .attr("id", "voronoi")
        .attr("stroke", voronoiStroke)
        .attr("pointer-events", "none")
        .attr("d", voronoi.render());
    }

    let points;
    if (showPoints) {
      points = target
        .selectAll("circle#points")
        .data([1])
        .join("path")
        .attr("id", "points")
        .attr("pointer-events", "none")
        .attr("stroke", pointsStroke)
        .attr("fill", pointsFill)
        .attr("d", delaunay.renderPoints(null, 2));
    }

    const labels = target
      .selectAll("g.labels")
      .data([cells])
      .join("g")
      .attr("class", "labels")
      .attr("fill", fill)

      .attr("stroke", stroke)
      .attr("stroke-width", strokeWidth)
      .attr("paint-order", "stroke")
      .attr("pointer-events", "none")
      .selectAll("text")
      .data((d) => d)
      .join("text")
      .style("font", font)
      .each(function ({ d, cell }, index) {
        if (!cell) return;
        const [cx, cy] = d3.polygonCentroid(cell);
        const angle =
          (Math.round(
            (Math.atan2(cy - y(d, index), cx - x(d, index)) / Math.PI) * 2
          ) +
            4) %
          4;

        d3.select(this).call(
          angle === 0
            ? orient.right
            : angle === 3
              ? orient.top
              : angle === 1
                ? orient.bottom
                : orient.left
        );
      })
      .attr("transform", ({ d, cell }, index) => {
        if (labelsInCentroids) {
          const [cx, cy] = d3.polygonCentroid(cell);

          return `translate(${cx}, ${cy})`;
        } else {
          return `translate(${x(d, index)}, ${y(d, index)})`;
        }
      })
      .attr("display", ({ show }) => (show ? null : "none"))
      .text(({ d }, i, all) => label(d, i, all));

    let selected = null;
    if (hover) {
      mouseRect.on("mousemove", (event) => {
        // Find the selected point
        const i = delaunay.find(...d3.pointer(event));
        if (i === selected) return;
        selected = i;

        // Update labels
        labels
          .attr("display", ({ show }, i) =>
            i === selected || show ? null : "none"
          )
          .style("font", (_, i) => (i === selected ? hoverFont : font))
          .classed("selected", (_, i) => i === selected)
          .filter((_, i) => i === selected)
          .raise();

        anchors &&
          anchors.attr("display", ({ show }, i) =>
            show || i === selected ? null : "none"
          );

        if (showPoints) {
          points
            .attr("fill", (_, i) =>
              i === selected ? pointsSelectedFill : pointsSelectedFill
            )
            .classed("selected", (_, i) => i === selected);
        }

        if (onHover && typeof onHover === "function") onHover(i);
      });
    }

    // Setup a MutationObserver to wait for the element to be rendered
    // https://stackoverflow.com/questions/15875128/is-there-element-rendered-event
    if (useOcclusion) {
      const observer = new MutationObserver(function () {
        if (document.contains(target.node())) {
          target.call(occlusion, "g.labels > text");
          observer.disconnect();
        }
      });

      observer.observe(document, {
        attributes: false,
        childList: true,
        characterData: false,
        subtree: true,
      });
    }
  } // renderSVG

  function renderCanvasAnchorsVoronoiPoints(context) {
    if (debug)
      console.log(
        "renderCanvasAnchorsVoronoiPoints",
        "showAnchors",
        showAnchors,
        "labelsInCentroids",
        labelsInCentroids,
        "showVoronoi",
        showVoronoi,
        "showPoints",
        showPoints
      );
    if (showAnchors || labelsInCentroids) {
      cells.forEach(({ d, cell, show }, index) => {
        if (!show) return;
        const [cx, cy] = d3.polygonCentroid(cell);
        context.beginPath();
        context.moveTo(cx, cy);
        context.lineTo(x(d, index), y(d, index));
        context.strokeStyle = anchorsStroke;
        context.stroke();
      });
    }

    if (showVoronoi) {
      context.beginPath();
      voronoi.render(context);
      context.strokeStyle = voronoiStroke;
      context.stroke();
    }

    if (showPoints) {
      context.beginPath();
      // delaunay.renderPoints(context, 2);
      context.save();
      context.globalAlpha = 0.7;
      context.fillStyle = "black";
      data.forEach((d, i) => {
        context.beginPath();
        context.arc(x(d, i), y(d, i), r(d, i), 0, 2 * Math.PI);
      });
      context.restore();
      context.fillStyle = pointsFill;
      context.fill();
      context.strokeStyle = pointsStroke;
      context.stroke();
    }
  } // renderCanvasAnchorsVoronoiPoints

  function renderCanvasLabels(context, selected) {
    cells.forEach(({ d, cell, show }, index) => {
      if (!show && index !== selected) return;
      const [cx, cy] = d3.polygonCentroid(cell);
      const angle =
        (Math.round(
          (Math.atan2(cy - y(d, index), cx - x(d, index)) / Math.PI) * 2
        ) +
          4) %
        4;

      context.save();
      const dr = r(d, index) + padding;
      const dx = angle === 0 ? dr : angle === 2 ? -dr : dr;
      const dy = angle === 1 ? dr : angle === 3 ? -dr : dr;
      context.translate(
        labelsInCentroids ? cx : x(d, index) + dx,
        labelsInCentroids ? cy : y(d, index) + dy
      );
      context.textAlign =
        angle === 0
          ? "left"
          : angle === 1
            ? "center"
            : angle === 2
              ? "right"
              : "center";
      context.textBaseline =
        angle === 0
          ? "middle"
          : angle === 1
            ? "top"
            : angle === 2
              ? "middle"
              : "bottom";
      context.font = index === selected ? hoverFont : font;
      context.fillStyle = fill;
      context.strokeStyle = stroke;
      context.lineWidth = strokeWidth;
      // if (debug) console.log(index, dx, dy, angle);
      context.strokeText(label(d, index), 0, 0);
      context.fillText(label(d, index), 0, 0);
      context.restore();
    });
  } // renderCanvasLabels

  function renderCanvas() {
    const context = target.node().getContext("2d");

    renderCanvasAnchorsVoronoiPoints(context);
    renderCanvasLabels(context, selected);

    if (hover) {
      if (debug) console.log("setting onmousemove", target);

      target.on("mousemove", (event) => {
        const [mx, my] = d3.pointer(event);
        const i = delaunay.find(mx, my);
        if (i === selected) return;
        selected = i;

        context.clearRect(0, 0, width, height);
        renderCanvasAnchorsVoronoiPoints(context);
        if (onHover && typeof onHover === "function") onHover(i);
        renderCanvasLabels(context, selected);
      });
    }
  } // renderCanvas

  if (renderer.toLocaleLowerCase() === "canvas") {
    renderCanvas();
  } else {
    renderSVG();
  }

  return Object.assign(target.node(), { delaunay, voronoi, cells });
}

// https://observablehq.com/@d3/occlusion
// ISC License

// Copyright 2020-2023 Philippe Rivière
// Permission to use, copy, modify, and/or distribute this software for any
// purpose with or without fee is hereby granted, provided that the above
// copyright notice and this permission notice appear in all copies.

// THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
// WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
// ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
// WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
// ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
// OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
function occlusion(svg, against = "text") {
  const nodes = d3
    .sort(svg.selectAll(against), (node) => +node.getAttribute("data-priority"))
    .reverse()
    .map((node) => {
      const { x, y, width, height } = node.getBoundingClientRect();
      return { node, x, y, width, height };
    });

  const visible = [];
  for (const d of nodes) {
    const occluded = visible.some((e) => intersectRect(d, e));
    d3.select(d.node).classed("occluded", occluded);
    if (!occluded) visible.push(d);
  }
  return visible;
}

// This intersection function works for rect and text, but not so much for circles.
function intersectRect(a, b) {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}
