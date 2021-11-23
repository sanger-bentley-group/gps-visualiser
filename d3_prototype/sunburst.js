// Convert from https://observablehq.com/@kerryrodden/sequences-sunburst
// Another good reference https://embed.plnkr.co/plunk/3cBfxm


async function start() {
    const csvData = await d3.text("sequence.csv");
    const csvParsed = d3.csvParseRows(csvData)
    
    let data = buildHierarchy(csvParsed);

    let width = 640;
    let radius = width / 2;
  
    let partition = data =>
    d3.partition().size([2 * Math.PI, radius * radius])(
      d3
        .hierarchy(data)
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value)
    );

    let color = d3.scaleOrdinal(d3.schemeTableau10);

    let arc = d3
    .arc()
    .startAngle(d => d.x0)
    .endAngle(d => d.x1)
    .padAngle(1 / radius)
    .padRadius(radius)
    .innerRadius(d => Math.sqrt(d.y0))
    .outerRadius(d => Math.sqrt(d.y1) - 1);

    let mousearc = d3
    .arc()
    .startAngle(d => d.x0)
    .endAngle(d => d.x1)
    .innerRadius(d => Math.sqrt(d.y0))
    .outerRadius(radius);
  
    const chart = await (() => {
        const root = partition(data);
        const svg = d3.create("svg");
    
         // Make this into a view, so that the currently hovered sequence is available to the breadcrumb
        const element = svg.node();
        element.value = { sequence: [], percentage: 0.0 };
    
        const label = svg
            .append("text")
            .attr("text-anchor", "middle")
            .attr("fill", "#888")
            .style("visibility", "hidden");
    
        label
            .append("tspan")
            .attr("class", "percentage")
            .attr("x", 0)
            .attr("y", 0)
            .attr("dy", "-0.1em")
            .attr("font-size", "3em")
            .text("");
    
        label
            .append("tspan")
            .attr("class", "absolute")
            .attr("x", 0)
            .attr("y", 0)
            .attr("dy", "1.5em")
            .attr("font-size", "1.5em")
            .text("");
        
        label
            .append("tspan")
            .attr("class", "path")
            .attr("x", 0)
            .attr("y", 0)
            .attr("dy", "5em")
            .attr("font-size", "1em")
            .text("");
    
        svg
            .attr("viewBox", `${-radius} ${-radius} ${width} ${width}`)
            .style("max-width", `${width}px`)
            .style("font", "12px sans-serif");
    
        const path = svg
            .append("g")
            .selectAll("path")
            .data(
            root.descendants().filter(d => {
                // Don't draw the root node, and for efficiency, filter out nodes that would be too small to see
                return d.depth && d.x1 - d.x0 > 0.001;
            })
            )
            .join("path")
            .attr("fill", d => color(d.data.name))
            .attr("d", arc);
    
        svg
            .append("g")
            .attr("fill", "none")
            .attr("pointer-events", "all")
            .on("mouseleave", () => {
            path.attr("fill-opacity", 1);
            label.style("visibility", "hidden");
            // Update the value of this view
            element.value = { sequence: [], percentage: 0.0 };
            element.dispatchEvent(new CustomEvent("input"));
            })
            .selectAll("path")
            .data(
            root.descendants().filter(d => {
                // Don't draw the root node, and for efficiency, filter out nodes that would be too small to see
                return d.depth && d.x1 - d.x0 > 0.001;
            })
            )
            .join("path")
            .attr("d", mousearc)
            .on("mouseenter", (event, d) => {
            // Get the ancestors of the current segment, minus the root
            const sequence = d
                .ancestors()
                .reverse()
                .slice(1);
            // Highlight the ancestors
            path.attr("fill-opacity", node =>
                sequence.indexOf(node) >= 0 ? 1.0 : 0.3
            );
            const percentage = ((100 * d.value) / root.value).toPrecision(3);
            label
                .style("visibility", null)
                .select(".percentage")
                .text(percentage + "%");
            label
                .style("visibility", null)
                .select(".absolute")
                .text(`${d.value} of ${root.value}`);
            // Update the value of this view with the currently hovered sequence and percentage
            element.value = { sequence, percentage };
            element.dispatchEvent(new CustomEvent("input"));
            
            // Add path
            let pathOut = [];
            let cur = d;
              while (cur.parent) {
                pathOut.unshift(cur.data.name);
                cur = cur.parent;
            }
            label
                .style("visibility", null)
                .select(".path")
                .text(`${pathOut.join(" - ")}`);


            });
        return element;
    })();
    document.querySelector("#chart").appendChild(chart);
  }
  
start();
  
function buildHierarchy(csv) {
    // Helper function that transforms the given CSV into a hierarchical format.
    const root = { name: "root", children: [] };
    for (let i = 0; i < csv.length; i++) {
      const sequence = csv[i][0];
      const size = +csv[i][1];
      if (isNaN(size)) {
        // e.g. if this is a header row
        continue;
      }
      const parts = sequence.split("-");
      let currentNode = root;
      for (let j = 0; j < parts.length; j++) {
        const children = currentNode["children"];
        const nodeName = parts[j];
        let childNode = null;
        if (j + 1 < parts.length) {
          // Not yet at the end of the sequence; move down the tree.
          let foundChild = false;
          for (let k = 0; k < children.length; k++) {
            if (children[k]["name"] == nodeName) {
              childNode = children[k];
              foundChild = true;
              break;
            }
          }
          // If we don't already have a child node for this branch, create it.
          if (!foundChild) {
            childNode = { name: nodeName, children: [] };
            children.push(childNode);
          }
          currentNode = childNode;
        } else {
          // Reached the end of the sequence; create a leaf node.
          childNode = { name: nodeName, value: size };
          children.push(childNode);
        }
      }
    }
    return root;
}