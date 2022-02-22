async function barchart(data, antibiotics){
    // Define color scheme for both legend and charts
    const color = d3.schemeSpectral[antibiotics.length];

    // Prepare clean slate for legend
    let legendDiv = document.querySelector('#barchart-legend');
    legendDiv.innerHTML = '';

    // Draw legend to show color key for each antibiotic
    const legend = d3.create('svg');
    const element = legend.node(); 

    legend
        .attr("viewBox", `0 0 ${150 * antibiotics.length} 80`)
        .attr("height", '80')
        .attr("width", `${150 * antibiotics.length}`)
        .style('font', '12px sans-serif');

    legend.selectAll("squares")
        .data(antibiotics)
        .enter()
        .append("rect")
        .attr("x", (d, i) => i * (150))
        .attr("y", 25)
        .attr("width", 150)
        .attr("height", 20)
        .style("fill", (d, i) => color[i]);
    
    legend.selectAll("labels")
        .data(antibiotics)
        .enter()
        .append("text")
        .attr("x", (d, i) => i * (150) + 75)
        .attr("y", 60)
        .text(d => d)
        .attr("text-anchor", "middle")
        .style("alignment-baseline", "middle")
        .style("text-transform", "capitalize");

    legendDiv.appendChild(element);
    
    // Prepare clean slate for chart
    let barchartsDiv = document.querySelector('#antibiotic-barcharts');
    barchartsDiv.innerHTML = '';

    // Draw bar charts of all lineages under that age group
    await drawBarChart(data, antibiotics, color, barchartsDiv);

    // addEventListener to all bar charts to react to cursor
    let charts = document.querySelectorAll('.barchart');

    charts.forEach(chart => {
        let path = document.querySelector('#country-view-readout');

        chart.addEventListener('mouseover', (e) => {
            if (e.target.classList.contains('barchart')) {
                let data = e.target.getAttribute('data');
                data = data.split(',');

                let lineageNum = e.target.getAttribute('lineage');

                let output = `Current Selection: GPSC${lineageNum} [ `;
                for (let i = 0; i < antibiotics.length; i++) {
                    output += `${antibiotics[i]} - ${data[i]}%`
                    if (i < antibiotics.length - 1) {
                        output += ' | ';
                    }
                }
                output += ']'
                path.innerHTML = output;
                path.classList.add('bold', 'cap');

                let rects = e.target.querySelectorAll('rect');
                rects.forEach(rect => rect.setAttribute('fill-opacity', '1.0'));

                document.querySelector(`#label${lineageNum}`).classList.add('bold');
            }
        });

        chart.addEventListener('mouseout', (e) => {
            if (e.target.classList.contains('barchart')) {
                path.innerHTML = '<b>Current Selection: </b>Select a Lineage';
                path.classList.remove('bold', 'cap');

                let rects = e.target.querySelectorAll('rect');
                rects.forEach(rect => rect.setAttribute('fill-opacity', '0.3'));

                let lineageNum = e.target.getAttribute('lineage');
                document.querySelector(`#label${lineageNum}`).classList.remove('bold');
            }
        });
    });
}


async function drawBarChart(data, antibiotics, color, target) {
    // Sort lineages by numerical order
    const lineages = Object.keys(data).sort((a, b) => a - b);
    for (const lineage of lineages) {
        let chartDiv = document.createElement('div');

        const curData = data[lineage];
        const width = 100;
        const height = 100;
        const margin = 10;

        const xScale = d3
            .scaleBand()
            .domain(antibiotics)
            .rangeRound([0, width])
            .padding(0.1);
        
        const yScale = d3
            .scaleLinear()
            .domain([0, 100])
            .rangeRound([0, height]);

        const chart = await (() => {
            const chartContainer = d3.create('svg');
            const element = chartContainer.node(); 

            chartContainer
                .attr("viewBox", `0 0 ${width} ${height + margin}`)
                .attr('width', width)
                .attr('height', height + margin)
                .style('font', '12px sans-serif')
                .classed('barchart', true)
                .attr('data', curData)
                .attr('lineage', lineage);

            const svg = chartContainer.append('g');
            
            svg
                .append("g")
                .call(d3.axisLeft(yScale).ticks(5))
                .call(g => g.select(".domain").remove())
                .call(g => g.selectAll(".tick line").clone()
                    .attr("x2", width)
                    .attr("stroke-opacity", 0.1)
                );
            
            svg
                .append('g')
                .call(d3.axisBottom(xScale).tickSizeOuter(0))
                .call(g => g.selectAll("text").remove())
                .call(g => g.selectAll(".tick").remove())
                .call(g => g.select(".domain").attr("stroke-opacity", 0.3))
                .attr('transform', `translate(0, ${height})`);
              
            const bar = svg
                .append("g")
                .selectAll(".bar")
                .data(curData)
                .enter()
                .append('rect')
                .classed('bar', true)
                .attr('width', 15)
                .attr('height', (data) => data)
                .attr("x", (d, i) => xScale(antibiotics[i]))
                .attr('y', (data) => height- yScale(data))
                .attr('fill', (d, i) => color[i])
                .attr('fill-opacity', 0.3);
            
            return element;
        })();

        chartDiv.appendChild(chart);

        // Add lineage number below chart
        let lineageDiv = document.createElement('div');
        lineageDiv.innerHTML = lineage;
        lineageDiv.id = `label${lineage}`;
        chartDiv.appendChild(lineageDiv);

        target.appendChild(chartDiv);
    }
}