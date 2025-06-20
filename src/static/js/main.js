
const colors = {
    'grey': '#8b9099',
    'orange': '#ca6702'
};

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


function initPlotViewer() {
    Plotly.newPlot(viewerID, [{x:[],y:[]}]);
}


function generatePlot() {


    var data_trace = {
        x: targetSpecInfo.wave,
        y: targetSpecInfo.data,
        type: 'scatter',
        mode: 'lines',
        name: 'Data',
    };

    var model0_trace = {
        x: targetSpecInfo.wave,
        y: targetSpecInfo.ncomp0,
        type: 'scatter',
        mode: 'lines',
        name: 'ncomp=0',
    };

    var model1_trace = {
        x: targetSpecInfo.wave,
        y: targetSpecInfo.ncomp1,
        type: 'scatter',
        mode: 'lines',
        name: 'ncomp=1',
    };

    var traces = [data_trace,model0_trace,model1_trace];

    const wave_min = Math.min(...targetSpecInfo.wave);
    const wave_max = Math.max(...targetSpecInfo.wave);
    const spec_min = Math.min(...targetSpecInfo.data);
    const spec_max = Math.max(...targetSpecInfo.data);
    const y0 = spec_min-(spec_max*0.1);
    const y1 = spec_max+(spec_max*0.1);

    var vlines = [];
    for (const [name, center] of Object.entries(features)) {
        if (center < wave_min || center > wave_max) { continue; }
        line_color = 'grey';
        if (name.replace('NA_','') === focusFeature) {
            line_color = 'orange';
        }
        vlines.push({
            type:'line', x0:center, x1:center, y0:y0, y1:y1,
            line: {dash:'dash', color:colors[line_color]},
        });
    }

    var layout = {
        title: {text: targetSpecInfo.name},
        xaxis: {title: {text:'λ rest (Å)'}},
        yaxis: {title: {text:'f_λ (10^-17 erg s^-1 cm^-2 Å^-1)'}},
        shapes: vlines,
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
        const response = await fetch(specURL + new URLSearchParams(get_data).toString());
        targetSpecInfo = await response.json();
        targetSpecInfo['name'] = specName;
    } catch(error) {
        console.log('Fetch error: ' + error);
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
        specNames = await response.json();
    } catch(error) {
        console.log('Fetch error: ' + error);
    }
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


function nextSpec() {
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
    const no = document.getElementById('insp-no-button');
    no.onclick = function () {
        markInspect(-1);
        nextSpec();
    };

    const unclear = document.getElementById('insp-unclear-button');
    unclear.onclick = function () {
        markInspect(0);
        nextSpec();
    };

    const yes = document.getElementById('insp-yes-button');
    yes.onclick = function () {
        markInspect(1);
        nextSpec();
    };

    const save = document.getElementById('save-button');
    save.onclick = function () {
        saveInspect();
    };
}


async function plotSpec() {
    specName = specNames[curSpecIdx];
    await setTargetInfo(specName);
    generatePlot();
}


async function start() {
    console.log('start');
    initPlotViewer();
    initInspectButtons();
    await getFeatureData();
    await getSpecNames();
    await plotSpec();
}


start();
