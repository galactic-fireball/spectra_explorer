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


@app.route('/api/features')
def get_metrics():
	return jsonify(CACHE['metrics']), 200, json_cont


# TODO: add filters
@app.route('/api/specs')
def get_specs():
	return jsonify(list(CACHE['tdf']['P-M-F'].values)), 200, json_cont


@app.route('/api/spec')
def get_spec():
	feature = request.args.get('feature')
	spec_name = request.args.get('spec')

	spec_file = spec_dir.joinpath(feature, spec_name+'.npz')
	if not spec_file.exists():
		return {} # TODO: 404

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
	CACHE['tdf'].to_csv(save_test_file, index=False)
	return jsonify({'success':True}), 200, json_cont



if __name__ == '__main__':
	app.run(port=5001)
