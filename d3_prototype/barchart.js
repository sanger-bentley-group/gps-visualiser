go();


async function go(){
    const data = await (await fetch('data.json')).json();
    const antibiotics = data['country']['AR']['resistance']['antibiotics']
    await drawBarChart(data['country']['AR']['resistance']['age0'], antibiotics, '#chart5');

    let charts = document.querySelectorAll('.barchart');

    charts.forEach(chart => {
        let path = document.querySelector('#barchart-output');

        chart.addEventListener('mouseover', (e) => {
            if (e.target.classList.contains('barchart')) {
                let data = e.target.getAttribute('data');
                data = data.split(',')

                let output = '';
                for (let i = 0; i < antibiotics.length; i++) {
                    output += `${antibiotics[i]} - ${data[i]}%`
                    if (i < antibiotics.length - 1) {
                        output += ' | '
                    }
                }
                path.innerHTML = output

                let rects = e.target.querySelectorAll('rect')
                rects.forEach(rect => rect.setAttribute('fill-opacity', '1.0'));
            }
        });

        chart.addEventListener('mouseout', (e) => {
            if (e.target.classList.contains('barchart')) {
                path.innerHTML = 'None'

                let rects = e.target.querySelectorAll('rect')
                rects.forEach(rect => rect.setAttribute('fill-opacity', '0.3'));
            }
        });
    });
}


async function drawBarChart(data, antibiotics, target) {
    const lineages = Object.keys(data).sort(function (a, b) {return a - b;});
    for (const lineage of lineages) {
        const curData = data[lineage]
        const width = 100;
        const height = 100;
        const margin = 10;

        const color = d3.schemeSpectral[curData.length];

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
                .attr('width', width)
                .attr('height', height + margin)
                .style('font', '12px sans-serif')
                .classed('barchart', true)
                .attr('data', curData);

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
                .call(g => g.select(".domain").attr("stroke-opacity", 0.3) )
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
                .attr("x", function (d, i) {
                    for (i > 0; i < curData.length; i++) {
                        return xScale(antibiotics[i]);
                    }
                })
                .attr('y', (data) => height- yScale(data))
                .attr('fill', function (d, i) {
                    for (i > 0; i < curData.length; i++) {
                        return color[i];
                    }
                })
                .attr('fill-opacity', 0.3);
            
            return element;
        })();
        document.querySelector(target).appendChild(chart);
    }
}