
const colors = {
    'grey': '#3c4043',
    'dark-bg': '#222222',
    'pale-green': '#638687',
    'dark-red': '#721605',
    'red': '#ae1c0c',
    'orange': '#de7b13',
    'yellow': '#fcd55b',
};

const keyCodes = {
    'space': 32,
    'left': 37,
    'up': 38,
    'right': 39,
    'down': 40,
}

// const FHILines = ['FeXI_7892', 'SXII_7609', 'FeX_6374', 'FeVII_6087', 'FeVII_5720', 'ArX_5533', 'FeVI_5335', 'CaV_5309', 'FeXIV_5303', 'FeVII_5276', 'FeVI_5176', 'FeVII_5159', 'FeVI_5146', 'FeVII_4893', 'FeV_4181', 'FeV_3891', 'FeV_3839', 'FeVII_3759', 'NeV_3426', 'NeV_3346', 'NeIV_2424'];
const FHILines = ['FeVII_6087', 'NeV_3426'];
var focusFeature = FHILines[1];

const json_const = {'Content-Type': 'application/json'};

const featuresURL = '/api/features';
var features = {};
const metricsURL = '/api/metrics';
var metrics = [];
const specsURL = '/api/specs';
var specNames =[];
var curSpecIdx = 0;
const specURL = '/api/spec?';
var targetSpecInfo = {};
const inspectURL = '/api/inspect';
const saveURL = '/api/save';

const viewerID = 'spectra-viewer';

var statDict = {
    total: 0,
    inspected: 0,
    uninspected: 0,
    detections: 0,
}


// TODO: plot params dict
var modelOn = true;
var userWaveMin = 0;
var userWaveMax = 999999;


function print(msg) {
    console.log(msg);
}


function objectEmpty(obj) {
    return Object.keys(obj).length === 0
}


const nodata_layout = {
    annotations: [{text: 'No Data', font:{size:30}, xref: 'paper', x:0.5,
    yref: 'paper', y:0.5, showarrow:false}],
};

function initPlotViewer() {
    Plotly.newPlot(viewerID, [{x:[],y:[]}], nodata_layout);
}


function setNoDataPlot() {
    Plotly.react(viewerID, [{x:[],y:[]}], nodata_layout);
}


function generatePlot() {

    if (objectEmpty(targetSpecInfo)) {
        setNoDataPlot();
        return;
    }

    var data_trace = {
        x: targetSpecInfo.wave,
        y: targetSpecInfo.data,
        type: 'scatter',
        mode: 'lines',
        // marker: {color:'white'},
        name: 'Data',
    };

    var traces = [data_trace];

    if (modelOn) {

        var model0_trace = {
            x: targetSpecInfo.wave,
            y: targetSpecInfo.ncomp0,
            type: 'scatter',
            mode: 'lines',
            // marker: {color:'yellow'},
            name: 'ncomp=0',
        };

        var model1_trace = {
            x: targetSpecInfo.wave,
            y: targetSpecInfo.ncomp1,
            type: 'scatter',
            mode: 'lines',
            // marker: {color:'blue'},
            name: 'ncomp=1',
        };

        traces.push(model0_trace);
        traces.push(model1_trace);
    }

    const wave_min = Math.max(Math.min(...targetSpecInfo.wave), userWaveMin);
    const wave_max = Math.min(Math.max(...targetSpecInfo.wave), userWaveMax);
    console.log(wave_min+'-'+wave_max);
    const spec_min = Math.min(...targetSpecInfo.data);
    const spec_max = Math.max(...targetSpecInfo.data);
    const y0 = spec_min-(spec_max*0.1);
    const y1 = spec_max+(spec_max*0.1);

    var vlines = [];
    for (const [name, center] of Object.entries(features)) {
        if (center < wave_min || center > wave_max) { continue; }
        line_color = 'grey';
        if (name.replace('NA_','') === focusFeature) {
            line_color = 'red';
        }
        vlines.push({
            type:'line', x0:center, x1:center, y0:y0, y1:y1,
            line: {dash:'dash', color:colors[line_color]},
        });
    }

    var layout = {
        title: {text: targetSpecInfo.name},
        // paper_bgcolor: colors['dark-bg'],
        // plot_bgcolor: colors['dark-bg'],
        // font: {color: colors['pale-green'], size:16},
        xaxis: {range: [wave_min,wave_max], title: {text:'λ rest (Å)'}}, // color:colors['pale-green']}},
        yaxis: {title: {text:'f_λ (10^-17 erg s^-1 cm^-2 Å^-1)'}}, // color:colors['pale-green']}},
        shapes: vlines,
        legend: {orientation:'h'}
    };

    var config = {
        responsive: true,
    };

    Plotly.react(viewerID, traces, layout, config);
}


async function setTargetInfo(specName) {
    get_data = {
        spec: specName,
        feature: focusFeature,
    };

    try {
        let response = await fetch(specURL + new URLSearchParams(get_data).toString());
        if (response.ok) {
            targetSpecInfo = await response.json();
            targetSpecInfo['name'] = specName;
            genMetricDisplay();
        } else {
            targetSpecInfo = {}
            genMetricDisplay();
        }
    } catch(error) {
        console.log('Fetch error: ' + error);
    }
}


async function getMetricData() {
    try {
        let response = await fetch(metricsURL);
        metrics = await response.json();
    } catch(error) {
        console.log('Fetch error: ' + error)
    }
}


async function getFeatureData() {
    try {
        let response = await fetch(featuresURL);
        features = await response.json();
    } catch(error) {
        console.log('Fetch error: ' + error);
    }
}


async function getSpecNames() {
    try {
        const response = await fetch(specsURL);
        specNames = await response.json()['specs'];
    } catch(error) {
        console.log('Fetch error: ' + error);
    }
}


function genMetricDisplay() {
    const display = document.getElementById('metric-display');
    display.replaceChildren(); // remove children

    for (const m of metrics) {
        let div = document.createElement('div');
        div.classList.add('metric-div');
        let l = document.createElement('label');
        l.textContent = m+':';
        div.appendChild(l);

        let v = document.createElement('span');
        v.classList.add('metric-value');
        if (m in targetSpecInfo) { v.textContent = targetSpecInfo[m]; }
        else { v.textContent = '--'; }
        div.appendChild(v);
        display.appendChild(div);
    }

    let div = document.createElement('div');
        div.classList.add('metric-div');
        let l = document.createElement('label');
        l.textContent = 'Detect:';
        div.appendChild(l);

        let v = document.createElement('span');
        v.classList.add('metric-value');

    if ('detect' in targetSpecInfo) {
        switch (parseFloat(targetSpecInfo['detect'])) {
            case -1.0:
                v.textContent = 'No';
                break;
            case 0.0:
                v.textContent = 'Unclear';
                break;
            case 1.0:
                v.textContent = 'Yes';
                break;
            default:
                v.textContent = '--';
        }
    } else { v.textContent = '--'; }

    div.appendChild(v);
    display.appendChild(div);
}


function markInspect(val) {
    let post_data = {
        'spec': specNames[curSpecIdx],
        'feature': focusFeature,
        'dval': val,
    };

    try {
        fetch(inspectURL, {
            'method': 'POST',
            'headers': json_const,
            'body': JSON.stringify(post_data)
        }).then((response) => response.json())
          .then((data) => console.log('post success: ' + data.success))
    } catch(error) {
        console.log('Fetch error: ' + error);
    }
}

function prevSpec() {
    if (curSpecIdx == 0) {
        return;
    }

    curSpecIdx--;
    plotSpec();
}


function nextSpec() {
    if (curSpecIdx >= specNames.length-1) {
        return;
    }

    curSpecIdx++;
    plotSpec();
}


function saveInspect() {
    try {
        fetch(saveURL).then((response) => response.json()).then((data) => {});
    } catch(error) {
        console.log('Fetch error: ' + error);
    }
}


function initInspectButtons() {
    no_click = function () {
        statDict.inspected++;
        genStatTable();
        markInspect(-1);
        nextSpec();
    };
    const no = document.getElementById('insp-no-button');
    no.onclick = no_click;

    unclear_click = function () {
        statDict.inspected++;
        genStatTable();
        markInspect(0);
        nextSpec();
    };
    const unclear = document.getElementById('insp-unclear-button');
    unclear.onclick = unclear_click

    yes_click = function () {
        statDict.inspected++;
        statDict.detections++;
        genStatTable();
        markInspect(1);
        nextSpec();
    };
    const yes = document.getElementById('insp-yes-button');
    yes.onclick = yes_click

    save_click = function () {
        saveInspect();
    };
    const save = document.getElementById('save-button');
    save.onclick = save_click

    model_click = function () {
        modelOn = !modelOn;
        generatePlot();
    };
    const model = document.getElementById('model-button');
    model.onclick = model_click

    document.body.onkeydown = function(e) {
        if (e.key === 'y' || e.key === ' ' || e.keyCode == 32) {
            yes_click();
        } else if (e.key === 'n' || e.key === 'q') {
            no_click();
        } else if (e.key === 'u') {
            unclear_click();
        } else if (e.key === 's') {
            save_click();
        } else if (e.key === 'm') {
            model_click();
        } else if (e.key === 'ArrowLeft') {
            if (curSpecIdx === 0) { return; }
            prevSpec();
        } else if (e.key === 'ArrowRight') {
            nextSpec();
        }
    };
}


function initMetricFilters() {
    const labelContainer = document.getElementById('metric-label-container');
    const minContainer = document.getElementById('metric-min-container');
    const maxContainer = document.getElementById('metric-max-container');

    for (const m of metrics) {
        let l = document.createElement('label');
        l.textContent = m;
        labelContainer.appendChild(l);

        let mmin = document.createElement('input');
        mmin.id = m+'_min';
        mmin.classList.add('text-input');
        minContainer.appendChild(mmin);

        let mmax = document.createElement('input');
        mmax.id = m+'_max';
        mmax.classList.add('text-input');
        maxContainer.appendChild(mmax);
    }
}


function initWaveRanges() {
    adjustWaveRange = function() {
        min = document.getElementById('wave-min').value;
        userWaveMin = parseFloat(min || userWaveMin);
        max = document.getElementById('wave-max').value;
        userWaveMax = parseFloat(max || userWaveMax);
        console.log(userWaveMin+'-'+userWaveMax);
        generatePlot();
    }

    const waveMin = document.getElementById('wave-min');
    waveMin.addEventListener('focusout', adjustWaveRange);
    waveMin.onkeydown = function(e) {
        if (e.key === 'Enter') { adjustWaveRange(); }
    }

    const waveMax = document.getElementById('wave-max');
    waveMax.addEventListener('focusout', adjustWaveRange);
    waveMax.onkeydown = function(e) {
        if (e.key === 'Enter') { adjustWaveRange(); }
    }
}


function initFilter() {

    async function filterClick() {
        try {

            get_data = {
                'feature': focusFeature,
            };

            // Gather filter data
            for (const m of metrics) {
                let mmin = document.getElementById(m+'_min').value;
                console.log('['+mmin.value+']');
                if (mmin) { get_data[m+'_min'] = mmin; }
                let mmax = document.getElementById(m+'_max').value;
                if (mmax) { get_data[m+'_min'] = mmax; }
            }

            get_data['inspected'] = document.getElementById('insp-check').checked;
            get_data['not_inspected'] = document.getElementById('not-insp-check').checked;
            get_data['detections'] = document.getElementById('detect-check').checked;
            get_data['non_detections'] = document.getElementById('non-detect-check').checked;
            get_data['unclear'] = document.getElementById('unclear-check').checked;

            // Get specs that pass filters
            let response = await fetch(specsURL+'?' + new URLSearchParams(get_data).toString());
            data = await response.json();
            specNames = data['specs'];
            stats = data['stats'];
            console.log(stats);

            // Regen as needed
            for (const [key, val] of Object.entries(stats)) {
                statDict[key] = val;
            }

            console.log(statDict);
            genStatTable();
            curSpecIdx = 0;
            await plotSpec();

        } catch(error) {
            console.log('Fetch error: ' + error);
        }
    }

    filterButton = document.getElementById('filter-button');
    filterButton.onclick = filterClick;
}


function genStatTable() {
    console.log(statDict);
    statDict.uninspected = statDict.total - statDict.inspected;
    document.getElementById('stat-total').textContent = statDict.total;
    document.getElementById('stat-inspected').textContent = statDict.inspected;
    document.getElementById('stat-uninspected').textContent = statDict.uninspected;
    document.getElementById('stat-detects').textContent = statDict.detections;
}


function initConfigPanel() {
    initMetricFilters();
    initFilter();
    genStatTable();
    initWaveRanges();
}


async function plotSpec() {
    if (curSpecIdx > specNames.length) {
        setNoDataPlot();
        return;
    }

    specName = specNames[curSpecIdx];
    await setTargetInfo(specName);
    generatePlot();
}


async function start() {
    console.log('start');
    initPlotViewer();
    await getMetricData();
    genMetricDisplay();
    initConfigPanel();
    initInspectButtons();
    await getFeatureData();
    // await getSpecNames();
    // await plotSpec();
}


start();
