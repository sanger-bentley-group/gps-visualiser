// Convert from https://observablehq.com/@kerryrodden/sequences-icicle

// https://stackoverflow.com/questions/52861971/how-to-link-multiple-graph-networks-in-d3js-so-that-an-event-in-one-calls-the-sa
// https://stackoverflow.com/questions/35090256/mouseover-event-on-two-charts-at-the-same-time-d3-js

drawIcicle('sequence.csv', '#chart2');
drawIcicle('sequence.csv', '#chart3');

let outputPath = document.querySelector('#output')
let outputPre = document.querySelector('#AU-precentage')
let outputAbs = document.querySelector('#AU-absolute')

async function drawIcicle(src, target) {
    const csv = await d3.text(src);
    const csvParsed = d3.csvParseRows(csv);
    const hierarchyData = buildHierarchy(csvParsed);

    let width = 640;
    let height = 150;

    let partition = data =>
    d3
        .partition()
        .padding(1)
        .size([width, height])(
            d3
                .hierarchy(data)
                .sum(d => d.value)
                .sort((a, b) => b.value - a.value)
    );

    // Set color here, can be set to name specific color
    // color = d3
    //   .scaleOrdinal()
    //   .domain(["home", "product", "search", "account", "other", "end"])
    //   .range(["#5d85cf", "#7c6561", "#da7847", "#6fb971", "#9e70cf", "#bbbbbb"])
    let color = d3.scaleOrdinal(d3.schemeTableau10);

    let segmentX = d => (d.x0);
    let segmentY = d => (d.y0);
    let segmentWidth = d => (d.x1 - d.x0);
    let segmentHeight = d => (d.y1 - d.y0);

    const chart = await (() => {
        const root = partition(hierarchyData);
        const svg = d3.create("svg");

        outputAbs.innerHTML = `0 of ${root.value}`;

        const element = svg.node(); 

        svg
            .attr("viewBox", `0 0 ${width} ${height}`)
            .style("max-width", `${width}px`)
            .style("font", "12px sans-serif");

        const segment = svg
            .append("g")
            .attr("transform", `translate(0, ${-root.y1 / 2})`)
            .selectAll("rect")
            .data(
              root.descendants().filter(d => {
                // Don't draw the root node, and for efficiency, filter out nodes that would be too small to see
                return d.depth && segmentWidth(d) >= 0.1;
              })
            )
            .join("rect")
            .attr("fill", d => color(d.data.name))
            .attr("fill-opacity", 0.3)
            .attr("x", segmentX)
            .attr("y", segmentY)
            .attr("width", segmentWidth)
            .attr("height", segmentHeight)
            .attr("data-path", d => {
                const sequence = d
                    .ancestors()
                    .reverse()
                    .slice(1);

                const output = [];
                    sequence.forEach(node => {
                        output.push(node.data.name)
                    });
                return `${output.join(' - ').replaceAll(' ','_')}`;
            })
            .attr("data-dValue", d => `${d.value}`)
            .attr("data-rValue", `${root.value}`)
            .on("mouseleave", () => {
                segment.attr("fill-opacity", 0.3);

                outputPath.innerHTML = 'None';
                outputPre.innerHTML = `0%`;
                outputAbs.innerHTML = `0 of ${root.value}`;
            })
            .on("mouseenter", (event, d) => {
                // Get the ancestors of the current segment, minus the root
                const sequence = d
                    .ancestors()
                    .reverse()
                    .slice(1);
                // Highlight the ancestors
                segment.attr("fill-opacity", node =>
                    sequence.indexOf(node) >= 0 ? 1.0 : 0.3
                );
                const percentage = ((100 * d.value) / root.value).toPrecision(3);

                output = [];
                sequence.forEach(node => {
                    output.push(node.data.name)
                });
                outputPath.innerHTML = `${output.join(' - ')}`;

                outputPre.innerHTML = `${percentage}%`;
                outputAbs.innerHTML = `${d.value} of ${root.value}`;
            })
        return element;
    })();
    document.querySelector(target).appendChild(chart);
}

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