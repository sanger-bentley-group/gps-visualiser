go();

async function go(){
    const data = await (await fetch('data.json')).json();
    await drawBarChart(data['country']['AR']['resistance']['age0'], '#chart5');
    await drawBarChart(data['country']['AR']['resistance']['age1'], '#chart6');
}

async function drawBarChart(data, target) {
    const lineages = Object.keys(data).sort(function (a, b) {return a - b;});
    for (const lineage of lineages) {
        console.log(`${lineage}: ${data[lineage]}`)
    }
}