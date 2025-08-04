const width = 800;
const height = 550;
const margin = { top: 40, right: 30, bottom: 150, left: 80 };

const svg = d3.select("#chart").append("svg")
    .attr("width", width)
    .attr("height", height);

let currentScene = 0;

let top10MSA = new Map();
let globalMSA = new Map();
let rawData = [];
let selectedMetro = null;

// Keep track of base annotation text so we can restore it on mouseout
let baseAnnotationText = "";

const scenes = [
    showScene1,
    showScene2,
    showScene3
];

d3.csv("/data/clean_uhii_by_zip.csv").then(data => {
    rawData = data;
    rawData.forEach(d => { d.UHII = +d.UHII; });

    const grouped = d3.rollup(
        rawData,
        v => d3.mean(v, d => d.UHII),
        d => d.MSA_Name
    );

    const cleanedEntries = Array.from(grouped.entries())
        .filter(([msa, _]) => msa && msa.trim() !== "");

    globalMSA = new Map(cleanedEntries);

    const top10 = cleanedEntries
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    top10MSA = new Map(top10);

    selectedMetro = top10[0][0];

    const metroSelect = d3.select("#metroSelect");
    metroSelect.selectAll("option")
        .data(Array.from(globalMSA.keys()))
        .join("option")
        .attr("value", d => d)
        .text(d => d);

    metroSelect.property("value", selectedMetro);

    metroSelect.on("change", function () {
        selectedMetro = this.value;
        scenes[currentScene](top10MSA, globalMSA, rawData);
    });

    scenes[currentScene](top10MSA, globalMSA, rawData);
});

function showSceneLabel(text) {
    d3.select("#sceneLabel").html(text);
}

function showAnnotation(html) {
    d3.select("#annotation").html(html);
}

function clearAnnotation() {
    // Restore base annotation text when hover ends
    showAnnotation(baseAnnotationText);
}

function showScene1(top10MSA, globalMSA) {
    d3.select("#metroSelect").style("display", "none");
    d3.select("#metroLabel").style("display", "none");
    svg.selectAll("*").remove();

    const msaEntries = Array.from(top10MSA.entries());
    const msaNames = msaEntries.map(d => d[0]);
    const values = msaEntries.map(d => d[1]);

    const x = d3.scaleBand()
        .domain(msaNames)
        .range([margin.left, width - margin.right])
        .padding(0.2);

    const y = d3.scaleLinear()
        .domain([0, d3.max(values)])
        .nice()
        .range([height - margin.bottom, margin.top]);

    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).tickFormat(d => d.split(/[,|-]/)[0].trim()))
        .selectAll("text")
        .attr("transform", "rotate(-40)")
        .style("text-anchor", "end")
        .style("font-size", "11px");

    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));

    const hoverLine = svg.append("line")
        .attr("stroke", "#999")
        .attr("stroke-dasharray", "4 2")
        .attr("y1", margin.top)
        .attr("y2", height - margin.bottom)
        .style("opacity", 0);

    svg.selectAll(".bar")
        .data(msaEntries)
        .join("rect")
        .attr("class", "bar")
        .attr("x", d => x(d[0]))
        .attr("y", d => y(d[1]))
        .attr("height", d => y(0) - y(d[1]))
        .attr("width", x.bandwidth())
        .attr("fill", "#e34a33")
        .on("mouseover", (event, d) => {
            const [name, value] = d;
            const nationalAvg = d3.mean(Array.from(globalMSA.values())).toFixed(2);

            const rank = msaEntries
                .sort((a, b) => b[1] - a[1])
                .findIndex(e => e[0] === name) + 1;

            d3.select(event.currentTarget)
                .attr("fill", "#a63603")
                .attr("stroke", "#000")
                .attr("stroke-width", 1.5);

            hoverLine
                .attr("x1", x(name) + x.bandwidth() / 2)
                .attr("x2", x(name) + x.bandwidth() / 2)
                .style("opacity", 1);

            const msaZips = rawData.filter(d => d.MSA_Name === name);
            const stateSet = new Set(msaZips.map(d => d.state_name));
            let stateText = Array.from(stateSet).join(", ");
            if (stateSet.size > 1) {
                stateText += " (metro spans multiple states)";
            }

            showAnnotation(
                `<strong>${name}</strong><br>` +
                `UHII: <strong>${value.toFixed(2)}</strong><br>` +
                `State: ${stateText}<br>` +
                `Rank: ${rank} of ${msaEntries.length}<br>` +
                `vs. National Avg: ${nationalAvg}`
            );

            svg.append("text")
                .attr("id", "zoomLabel")
                .attr("x", width / 2)
                .attr("y", margin.top + 10)
                .attr("text-anchor", "middle")
                .style("font-size", "16px")
                .style("font-weight", "bold")
                .style("fill", "#a63603")
                .text(`${name.split("-")[0]}: ${value.toFixed(2)}`);
        })
        .on("mouseout", (event, d) => {
            d3.select(event.currentTarget)
                .attr("fill", "#e34a33")
                .attr("stroke", "none");

            hoverLine.style("opacity", 0);
            d3.select("#zoomLabel").remove();
            clearAnnotation();
        })
        .on("click", (event, d) => {
            selectedMetro = d[0];
            currentScene = 1;
            d3.select("#metroSelect").property("value", selectedMetro);
            scenes[currentScene](top10MSA, globalMSA, rawData);
        });

    showSceneLabel("Scene 1: Average Urban Heat Island Index for top 10 metro areas");

    baseAnnotationText =
      "<strong>Key insight:</strong> The top 10 metro areas show varying Urban Heat Island Intensity. " +
    "Notice which metros have the highest UHII, indicating hotter urban environments. Hover bars for details, click to explore a metro.";
    showAnnotation(baseAnnotationText);
}

function showScene2(top10MSA, globalMSA, rawData) {
    d3.select("#metroSelect").style("display", "inline-block");
    d3.select("#metroLabel").style("display", "inline-block");
    d3.select("#metroSelect").property("value", selectedMetro);
    svg.selectAll("*").remove();
    if (!selectedMetro) return;

    const nationalAvg = d3.mean(Array.from(globalMSA.values()));

    let top5 = Array.from(top10MSA.entries())
        .sort((a,b) => b[1] - a[1])
        .slice(0,5);

    let selectedValue = top10MSA.get(selectedMetro);
    if (selectedValue === undefined || selectedValue === null || isNaN(selectedValue)) {
        selectedValue = globalMSA.get(selectedMetro) ?? 0;
    }
    selectedValue = +selectedValue;

    if (!top5.some(d => d[0] === selectedMetro)) {
        top5.push([selectedMetro, selectedValue]);
    }

    top5.push(["National Average", nationalAvg]);
    top5 = top5.filter(d => !isNaN(d[1]));
    top5.sort((a,b) => b[1] - a[1]);

    const x = d3.scaleBand()
        .domain(top5.map(d => d[0]))
        .range([margin.left, width - margin.right])
        .padding(0.3);

    const y = d3.scaleLinear()
        .domain([0, d3.max(top5, d => d[1]) * 1.1])
        .nice()
        .range([height - margin.bottom, margin.top]);

    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-40)")
        .style("text-anchor", "end");

    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));

    svg.selectAll(".bar")
        .data(top5)
        .join("rect")
        .attr("class", "bar")
        .attr("x", d => x(d[0]))
        .attr("y", d => y(d[1]))
        .attr("width", x.bandwidth())
        .attr("height", d => y(0) - y(d[1]))
        .attr("fill", d => 
            d[0] === selectedMetro ? "#e34a33" : 
            d[0] === "National Average" ? "#3182bd" : "#ccc")
        .on("mouseover", (event, d) => {
            showAnnotation(`<b>${d[0]}</b><br>UHII: ${d[1].toFixed(2)}`);
        })
        .on("mouseout", clearAnnotation);

    showSceneLabel("Scene 2: UHII comparison of top 5 metros, selected metro, and national average");

    baseAnnotationText =
      `<strong>Comparison:</strong> Here we compare the top 5 metros, the selected metro (${selectedMetro}), and the national average UHII. ` +
    "This highlights how the selected metro fits into the broader context."
;
    showAnnotation(baseAnnotationText);
}

function showScene3(top10MSA, globalMSA, rawData) {
    d3.select("#metroSelect").style("display", "inline-block");
    d3.select("#metroLabel").style("display", "inline-block");
    d3.select("#metroSelect").property("value", selectedMetro);
    svg.selectAll("*").remove();
    if (!selectedMetro) return;

    const filteredZips = rawData.filter(d => d.MSA_Name === selectedMetro);

    if (filteredZips.length === 0) {
        showAnnotation(`No ZIP code data available for <b>${selectedMetro}</b>.`);
        return;
    }

    filteredZips.forEach(d => {
        d.UHII = +d.UHII;
        d.density = +d.density;
        d.population = +d.population;
    });

    const x = d3.scaleLog()
        .domain([Math.max(1, d3.min(filteredZips, d => d.density)), d3.max(filteredZips, d => d.density)])
        .range([margin.left, width - margin.right])
        .nice();

    const y = d3.scaleLinear()
        .domain(d3.extent(filteredZips, d => d.UHII))
        .nice()
        .range([height - margin.bottom, margin.top]);

    const color = d3.scaleSequential()
        .domain(d3.extent(filteredZips, d => d.UHII))
        .interpolator(d3.interpolateReds);

    const [min, max] = x.domain();
    const minLog = Math.log10(min);
    const maxLog = Math.log10(max);

    const logTicks = d3.range(0, 8).map(i =>
        Math.pow(10, minLog + i * (maxLog - minLog) / 7)
    );

    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x)
            .tickValues(logTicks)
            .tickFormat(d3.format(".0s"))
        )
        .append("text")
        .attr("x", width / 2)
        .attr("y", 40)
        .attr("fill", "black")
        .attr("text-anchor", "middle")
        .text("Population Density (people per sq mile)");

    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -50)
        .attr("fill", "black")
        .attr("text-anchor", "middle")
        .text("Urban Heat Island Intensity (UHII)");

    svg.selectAll("circle")
        .data(filteredZips)
        .join("circle")
        .attr("cx", d => x(d.density))
        .attr("cy", d => y(d.UHII))
        .attr("r", 6)
        .attr("fill", d => color(d.UHII))
        .attr("opacity", 0.8)
        .on("mouseover", (event, d) => {
            d3.select(event.currentTarget).attr("stroke", "#333").attr("stroke-width", 2);
            showAnnotation(
                `City: ${d.city}, ${d.state_name}<br>` +
                `ZIP: ${d.ZIP}<br>` +
                `UHII: ${d.UHII.toFixed(2)}<br>` +
                `Density: ${d.density.toLocaleString()} people/sq mile<br>` +
                `Population: ${d.population.toLocaleString()}`
            );
        })
        .on("mouseout", (event, d) => {
            d3.select(event.currentTarget).attr("stroke", null).attr("stroke-width", null);
            clearAnnotation();
        });

    showSceneLabel(`Scene 3: Scatter plot of UHII vs Population Density for ZIP codes in ${selectedMetro}`);

    baseAnnotationText =
      `<strong>Detailed View:</strong> This scatter plot shows ZIP-code level UHII versus population density in <b>${selectedMetro}</b>. ` +
      "Higher density areas often correlate with higher UHII. Hover dots for ZIP-specific details.";
    showAnnotation(baseAnnotationText);
}

d3.select("#prevBtn").on("click", () => {
    if (currentScene > 0) {
        currentScene--;
        scenes[currentScene](top10MSA, globalMSA, rawData);
    }
});
d3.select("#nextBtn").on("click", () => {
    if (currentScene < scenes.length - 1) {
        currentScene++;
        scenes[currentScene](top10MSA, globalMSA, rawData);
    }
});
