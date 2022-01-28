// Convert from https://observablehq.com/@kerryrodden/sequences-icicle

async function icicle(summary, data, domainRange){
    const countries = Object.keys(summary).sort();

    // Build icicle charts for both disease and carriage types
    for (const type of ['disease', 'carriage']) {
        let typeDiv = document.querySelector(`#global-icicle-${type}`);

        // Build icicle charts for all countries with available data
        for (const country of countries) {
            // Create the content of icicle chart if each individual country
            let countryContainer = document.createElement('div');
            countryContainer.classList.add('aside-country-container');
            countryContainer.classList.add(`aside-${country}-container`);

            let flagDiv = document.createElement('div');
            flagDiv.classList.add('icicle-flag-div')

            let flagElement = document.createElement('object');
            flagElement.id = `${country}-flag`;
            flagElement.classList.add('flag');
            flagElement.type = 'image/svg+xml';
            flagElement.data = `images/flags/${country}.svg`;

            let latestVac = summary[country]['periods'].at(-1);
            let latestVacDiv = document.createElement('div');
            latestVacDiv.innerHTML = `${latestVac[0]} ${latestVac[1]}`

            flagDiv.appendChild(flagElement);
            flagDiv.appendChild(latestVacDiv);

            let icicleId = `global-${country}-${type}`;

            let icicleDiv = document.createElement('div');
            icicleDiv.classList.add('icicle');
            icicleDiv.id = icicleId;

            let valuesContainer = document.createElement('div');
            valuesContainer.classList.add('values-container');
            
            let percentageDiv = document.createElement('div');
            percentageDiv.id = `${icicleId}-percentage`;
            percentageDiv.innerHTML = '--%'

            let absoluteDiv = document.createElement('div');
            absoluteDiv.id = `${icicleId}-absolute`;

            valuesContainer.appendChild(percentageDiv);
            valuesContainer.appendChild(absoluteDiv);
            
            countryContainer.appendChild(flagDiv);
            countryContainer.appendChild(icicleDiv);
            countryContainer.appendChild(valuesContainer);

            typeDiv.appendChild(countryContainer);

            // Draw the icicle chart
            await drawIcicle(data[country][type], `#${icicleId}`, domainRange);
        }
    }

    let charts = document.querySelectorAll('.icicle');

    charts.forEach(chart => {
        let chartId = chart.id;
        let absolute = document.querySelector(`#${chartId}-absolute`);
        let path = document.querySelector('#icicle-output');

        let rValue = chart.childNodes[0].getAttribute('data-rValue');
        absolute.innerHTML = `-- / ${rValue}`;

        // Update chart visual, absolute, percentage and path output
        chart.addEventListener('mouseover', (e) => {
            if (e.target instanceof SVGRectElement) {
                let dataPath = e.target.getAttribute('data-path');
                path.innerHTML = `Current Selection: ${dataPath.replaceAll('-', ' - ')}`;
                path.classList.add('bold')

                // Highlight same path in all charts, update absolute and percentage
                charts.forEach(chart => {
                    let chartId = chart.id;

                    let percentage = document.querySelector(`#${chartId}-percentage`);
                    let absolute = document.querySelector(`#${chartId}-absolute`);

                    let rValue = chart.childNodes[0].getAttribute('data-rValue');
                    
                    let selectedPath = chart.querySelector(`[data-path='${dataPath}']`);
                    if (selectedPath) {
                        selectedPath.setAttribute('fill-opacity', '1.0');

                        let dValue = selectedPath.getAttribute('data-dValue');
                        percentage.innerHTML = `${((100 * dValue) / rValue).toPrecision(3)}%`;
                        absolute.innerHTML = `${dValue} / ${rValue}`;

                        // If path is child, highlight parent as well
                        let pathArray = dataPath.split(' - ');
                        if (pathArray.length === 2) {
                            let selectedParent = chart.querySelector(`[data-path='${pathArray[0]}']`);
                            selectedParent.setAttribute('fill-opacity', '1.0');
                        }
                    } else {
                        percentage.innerHTML = '0%';
                        absolute.innerHTML = `0 / ${rValue}`;
                    }
                    
                });
            }
        });

        // Reset chart absolute, percentage and path output
        chart.addEventListener('mouseout', (e) => {
            let dataPath = e.target.getAttribute('data-path');
            path.innerHTML = '<b>Current Selection: </b>Select a Serotype or Lineage';
            path.classList.remove('bold')

            // Reset same path in all charts, reset absolute and percentage
            charts.forEach(chart => {
                let chartId = chart.id;

                let percentage = document.querySelector(`#${chartId}-percentage`);
                let absolute = document.querySelector(`#${chartId}-absolute`);

                let rValue = chart.childNodes[0].getAttribute('data-rValue');
                
                percentage.innerHTML = '--%';
                absolute.innerHTML = `-- / ${rValue}`;
                
                let selectedPath = chart.querySelector(`[data-path='${dataPath}']`);
                if (selectedPath) {
                    selectedPath.setAttribute('fill-opacity', '0.3');

                    // If path is child, reset parent as well
                    let pathArray = dataPath.split(' - ');
                    if (pathArray.length === 2) {
                        let selectedParent = chart.querySelector(`[data-path='${pathArray[0]}']`);
                        selectedParent.setAttribute('fill-opacity', '0.3');
                    }
                }
            });
        });
    });
}


async function drawIcicle(data, target, domainRange) {
    // If no data available: display 'No Data', remove .icicle and empty .values-container, escape function
    if (data.length === 0){
        let targetDiv = document.querySelector(target)

        let noData = document.createElement('div');
        noData.innerHTML = 'No Data';
        noData.classList.add('no-data-icicle');
        targetDiv.appendChild(noData);

        targetDiv.classList.remove('icicle');
        targetDiv.parentNode.querySelector('.values-container').innerHTML = '';
        return;
    }

    const hierarchyData = buildHierarchy(data);

    let width = 640;
    let height = 100;

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
    // Arrays to be dynamically generated by back-end
    // Will use different color domain-range for serotype and lineage
    let colorSerotype = d3
        .scaleOrdinal()
        .domain(domainRange["serotype"]["domain"])
        .range(domainRange["serotype"]["range"]);
    
    let colorLineage = d3
        .scaleOrdinal()
        .domain(domainRange["lineage"]["domain"])
        .range(domainRange["lineage"]["range"]);

    let segmentX = d => (d.x0);
    let segmentY = d => (d.y0);
    let segmentWidth = d => (d.x1 - d.x0);
    let segmentHeight = d => (d.y1 - d.y0);

    const chart = await (() => {
        const root = partition(hierarchyData);
        const svg = d3.create('svg');
        const element = svg.node(); 

        svg
            .attr('viewBox', `0 0 ${width} ${height}`)
            .style('width', '400px')
            .attr('data-rValue', `${root.value}`);

        const segment = svg
            .append('g')
            .attr('transform', `translate(0, ${-root.y1 / 2})`)
            .selectAll('rect')
            .data(
                root.descendants().filter(d => {
                    // Don't draw the root node, and for efficiency, filter out nodes that would be too small to see
                    return d.depth && segmentWidth(d) >= 0.1;
                })
            )
            .join('rect')
            .attr('fill', d => {
                // Select different color domain-range for serotype and lineage based on data depth
                if (d.depth === 1) {
                    return colorSerotype(d.data.name);
                } else {
                    return colorLineage(d.data.name);
                }
            })
            .attr('fill-opacity', 0.3)
            .attr('x', segmentX)
            .attr('y', segmentY)
            .attr('width', segmentWidth)
            .attr('height', segmentHeight)
            .attr('data-path', d => {
                const sequence = d
                    .ancestors()
                    .reverse()
                    .slice(1);

                const output = [];
                sequence.forEach(node => {
                    output.push(node.data.name);
                });
                let path = `Serotype ${output[0]}`
                if (output.length === 2) {
                    path += ` - GPSC ${output[1]}`
                }
                return path;
            })
            .attr('data-dValue', d => `${d.value}`);
        return element;
    })();
    document.querySelector(target).appendChild(chart);
}


// Helper function that transforms the given data into a hierarchical format.
function buildHierarchy(data) {
    const root = { name: 'root', children: [] };
    for (let i = 0; i < data.length; i++) {
        const sequence = data[i][0];
        const size = +data[i][1];
        if (isNaN(size)) {
            // e.g. if this is a header row
            continue;
        }
        const parts = sequence.split('-');
        let currentNode = root;
        for (let j = 0; j < parts.length; j++) {
            const children = currentNode['children'];
            const nodeName = parts[j];
            let childNode = null;
            if (j + 1 < parts.length) {
            // Not yet at the end of the sequence; move down the tree.
            let foundChild = false;
            for (let k = 0; k < children.length; k++) {
                if (children[k]['name'] == nodeName) {
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