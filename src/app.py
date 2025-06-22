from flask import Flask, jsonify, render_template, request
import json
import numpy as np
import pandas as pd
import pathlib

data_dir = pathlib.Path(__file__).resolve().parent.joinpath('static', 'data')
metrics_file = data_dir.joinpath('metrics.json')
features_file = data_dir.joinpath('features.json')
target_file = data_dir.joinpath('target_metrics.csv')
save_test_file = target_file.parent.joinpath(target_file.stem+'_test.csv')

spec_dir = data_dir.joinpath('spec_data')
json_cont = {'ContentType':'application/json'}

default_target_cols = ['SDSS_NAME','P-M-F','SpecObjID','RA','DEC','Z','lam_min','lam_max']

app = Flask(__name__)

# TODO: better way to do this?
CACHE = {}

def init_cache():
	CACHE['metrics'] = json.load(open(metrics_file,'r'))
	CACHE['features'] = json.load(open(features_file,'r'))
	CACHE['tdf'] = pd.read_csv(target_file)

init_cache()


# ROUTES

@app.route('/')
def index():
	return render_template('index.html')


# API

@app.route('/api/features')
def get_features():
	return jsonify(CACHE['features']), 200, json_cont


@app.route('/api/metrics')
def get_metrics():
	return jsonify(CACHE['metrics']), 200, json_cont


@app.route('/api/specs')
def get_specs():
	if (len(request.args) == 0) or not (request.args.get('feature', None)):
		return jsonify({'specs':list(CACHE['tdf']['P-M-F'].values)}), 200, json_cont

	tdf = CACHE['tdf']
	feature = request.args.get('feature')
	feat_cols = [c for c in tdf.columns.to_list() if feature in c]
	rdf = tdf[default_target_cols+feat_cols]
	insp_attr = feature+'_INSPECT'

	def filter_insp_status(df, filt, val):
		if val: return df
		if insp_attr not in df: return df
		print('Filtering %s'%filt)

		if filt == 'inspected':
			return df[np.isnan(rdf[insp_attr])]
		if filt == 'not_inspected':
			return df[~np.isnan(rdf[insp_attr])]
		if filt == 'detections':
			return df[rdf[insp_attr] != 1.0]
		if filt == 'non_detections':
			return df[rdf[insp_attr] != -1.0]
		elif filt == 'unclear':
			return df[rdf[insp_attr] != 0.0]

	for filt, val in request.args.items():
		cprev = len(rdf)
		if filt == 'feature': continue

		print(filt)
		if filt in ['inspected', 'not_inspected', 'detections', 'non_detections', 'unclear']:
			rdf = filter_insp_status(rdf, filt, val == 'true')
			print('rdf: %d -> %d'%(cprev,len(rdf)))
			continue

		if '_' not in filt:
			print('invalid filter name: %s'%filt)
			continue

		metric, ident = filt.rsplit('_',1)
		if not metric in CACHE['metrics']:
			print('invalid metric name: %s'%metric)
			continue

		try:
			fval = float(val)
		except:
			print('invalid value: %s'%val)
			continue

		attr = feature+'_'+metric
		if ident == 'min':
			print('Filtering: %s >= %f'%(attr,fval))
			rdf = rdf[rdf[attr] >= fval]
		elif ident == 'max':
			print('Filtering: %s <= %f'%(attr,fval))
			rdf = rdf[rdf[attr] <= fval]

		print('rdf: %d -> %d'%(cprev,len(rdf)))

	specs = list(rdf['P-M-F'].values)
	print('returning %d specs'%len(specs))

	if insp_attr in rdf:
		insp = len(rdf[~np.isnan(rdf[insp_attr])])
		detects = len(rdf[rdf[insp_attr] == 1.0])
	else:
		insp = 0
		detects = 0

	stats = {
		'total': len(specs),
		'inspected': insp,
		'detections': detects
	}

	print(stats)
	return jsonify({'specs':specs,'stats':stats}), 200, json_cont


@app.route('/api/spec')
def get_spec():
	feature = request.args.get('feature')
	spec_name = request.args.get('spec')

	spec_file = spec_dir.joinpath(feature, spec_name+'.npz')
	if not spec_file.exists():
		return jsonify({'data':False}), 404, json_cont

	# ['wave', 'data', 'ncomp0', 'ncomp1', 'ANOVA', 'AON', 'BADASS', 'CHI2_RATIO', 'F_RATIO', 'SSR_RATIO']
	npz = np.load(spec_file)

	spec_dict = {}
	for key in ['wave', 'data', 'ncomp0', 'ncomp1',]:
		if not key in npz:
			continue

		spec_dict[key] = [round(float(v),5) for v in npz[key]]

	for key in CACHE['metrics']:
		if not key in npz:
			continue

		spec_dict[key] = round(float(npz[key]),5)

	insp_attr = feature+'_INSPECT'
	tdf = CACHE['tdf']
	if insp_attr in tdf:
		ival = tdf[tdf['P-M-F'] == spec_name][insp_attr].values[0]
		if not np.isnan(ival):
			spec_dict['detect'] = ival;

	return jsonify(spec_dict), 200, json_cont


@app.route('/api/inspect', methods=['POST'])
def mark_inspect():
	spec_name = request.json['spec']
	feature = request.json['feature']
	dval = request.json['dval']

	tdf = CACHE['tdf']
	attr_name = feature+'_INSPECT'

	if len(tdf['P-M-F'] == spec_name) == 0:
		return json.dumps({'success':False}), 200, json_cont

	tdf.loc[tdf['P-M-F'] == spec_name, attr_name] = dval

	return jsonify({'success':True}), 200, json_cont


@app.route('/api/save')
def save():
	CACHE['tdf'].to_csv(target_file, index=False)
	return jsonify({'success':True}), 200, json_cont



if __name__ == '__main__':
	app.run(port=5001)
