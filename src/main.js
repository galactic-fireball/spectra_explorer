
const colors = {
	'grey': '#8b9099',
	'orange': '#ca6702'
};

// const FHILines = ['FeXI_7892', 'SXII_7609', 'FeX_6374', 'FeVII_6087', 'FeVII_5720', 'ArX_5533', 'FeVI_5335', 'CaV_5309', 'FeXIV_5303', 'FeVII_5276', 'FeVI_5176', 'FeVII_5159', 'FeVI_5146', 'FeVII_4893', 'FeV_4181', 'FeV_3891', 'FeV_3839', 'FeVII_3759', 'NeV_3426', 'NeV_3346', 'NeIV_2424'];
const FHILines = ['FeVII_6087', 'NeV_3426'];
var focusFeature = FHILines[0];

let tableData = {};
var table = null;
const tableJSONURL = './data/target_metrics.json';
const featureJSONURL = './data/features.json';
const spec_dir = './data/spectra/';
const viewerID = 'spectra-viewer';
const spectraViewer = document.getElementById(viewerID);
let targetSpecInfo = {};
let features = {};


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
		y: targetSpecInfo.ncomp0_model,
		type: 'scatter',
		mode: 'lines',
		name: 'ncomp=0',
	};

	var model1_trace = {
		x: targetSpecInfo.wave,
		y: targetSpecInfo.ncomp1_model,
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


async function setTargetInfo(spec_name) {
	const spec_file = spec_dir + focusFeature + '/' + spec_name + '.json';
	try {
		const response = await fetch(spec_file);
		targetSpecInfo = await response.json();
		targetSpecInfo['name'] = spec_name;
	} catch(error) {
		console.log('Fetch error: ' + error);
	}
}


async function onRowClick() {
	await setTargetInfo(this.children[1].firstChild.data);
	generatePlot();
}


function setTableData() {
	console.log('setTableData');

	let cols = []
	tableData.headers.forEach((header) => {cols.push({'title':header})});

	table = new DataTable('#metric-table', {
		columns: cols,
		data: tableData.targets,
	});

	const table_elem = document.getElementById('metric-table');
	const tbody = table_elem.tBodies[0];

	for (const row of tbody.children) {
		row.addEventListener('click', onRowClick);
	}
}


async function getTableData() {
	try {
		const response = await fetch(tableJSONURL);
		tableData = await response.json();
		setTableData();
	} catch (error) {
		console.log('Fetch error: ' + error);
	}
}


async function getFeatureData() {
	try {
		const response = await fetch(featureJSONURL);
		features = await response.json();
	} catch(error) {
		console.log('Fetch error: ' + error);
	}
}


function initPlotViewer() {
	Plotly.newPlot(viewerID, [{x:[],y:[]}]);
}


function onFeatureButtonClick() {
	console.log(this);
	focusFeature = this.innerHTML;
	console.log('updating focus to: ' + focusFeature);
}


function initFHIButtons() {
	const container = document.getElementById('fhi-button-container');
	console.log(container);
	for(const feature of FHILines) {
		var button = document.createElement('button');
		button.id = feature + '-button';
		button.innerText = feature;
		button.className += 'feature-button';
		button.onclick = onFeatureButtonClick;
		container.appendChild(button);
	}
}


function start() {
	console.log('start');
	getTableData();
	initPlotViewer();
	initFHIButtons();
	getFeatureData();
}


start();


