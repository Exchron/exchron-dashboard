#!/usr/bin/env node
// Train a neural network on Kepler (KOI) classroom CSV and export artifacts.
// Node script approximation of in-app training pipeline.

import fs from 'fs';
import path from 'path';
import * as tf from '@tensorflow/tfjs';

// Attempt to use tfjs-node for speed if available
try {
	// dynamic import so script still works if dependency not installed yet
	const tfnode = await import('@tensorflow/tfjs-node');
	console.log('Using TensorFlow backend:', tf.getBackend());
} catch (e) {
	console.warn('tfjs-node not installed; using JS backend (slower).');
}

const DATA_FILE = path.join(
	process.cwd(),
	'public',
	'kepler_cleaned_28_features.csv',
);
const OUT_DIR = path.join(process.cwd(), 'exported_models', 'kepler_nn');

// Basic configuration (can be adjusted)
const CONFIG = {
	hiddenLayers: [128, 64, 32],
	learningRate: 0.001,
	epochs: 25,
	batchSize: 32,
	validationSplit: 0.2,
};

function parseCSV(csv) {
	const lines = csv.trim().split(/\r?\n/);
	const headers = lines[0].split(',').map((h) => h.trim());
	const rows = [];
	for (let i = 1; i < lines.length; i++) {
		const parts = lines[i].split(',');
		if (parts.length !== headers.length) continue;
		const obj = {};
		headers.forEach((h, idx) => (obj[h] = parts[idx]));
		rows.push(obj);
	}
	return { headers, rows };
}

// Heuristic: use last column as target if classification-like; otherwise attempt to find a label column
function inferTarget(headers) {
	const preferred = ['koi_disposition', 'label', 'class'];
	for (const name of preferred) if (headers.includes(name)) return name;
	return headers[headers.length - 1];
}

(async () => {
	if (!fs.existsSync(DATA_FILE)) {
		console.error('Data file not found at', DATA_FILE);
		process.exit(1);
	}
	const csv = fs.readFileSync(DATA_FILE, 'utf-8');
	const { headers, rows } = parseCSV(csv);
	console.log('Loaded rows:', rows.length);

	const targetColumn = inferTarget(headers);
	console.log('Target column:', targetColumn);

	// Feature columns: numeric only (exclude target)
	const numericSamples = [];
	const featureColumns = headers.filter((h) => h !== targetColumn);

	// Determine numeric columns by attempting parseFloat on first few rows
	const numericFeatures = featureColumns.filter((col) => {
		const sampleVals = rows.slice(0, 20).map((r) => parseFloat(r[col]));
		return sampleVals.every((v) => !isNaN(v));
	});

	const data = [];
	for (const r of rows) {
		const target = (r[targetColumn] || '').toString().trim().toLowerCase();
		if (!target) continue;
		const feats = [];
		let valid = true;
		for (const col of numericFeatures) {
			const v = parseFloat(r[col]);
			if (isNaN(v)) {
				valid = false;
				break;
			}
			feats.push(v);
		}
		if (valid) data.push({ features: feats, target });
	}

	if (!data.length) {
		console.error('No valid samples after parsing.');
		process.exit(1);
	}
	console.log(
		'Usable samples:',
		data.length,
		'Numeric feature count:',
		numericFeatures.length,
	);

	// Label encoding
	const labels = [...new Set(data.map((d) => d.target))];
	const labelToIndex = Object.fromEntries(labels.map((l, i) => [l, i]));
	console.log('Classes:', labels);

	// Compute feature stats
	const stats = numericFeatures.map((_, fi) => {
		const vals = data.map((d) => d.features[fi]);
		const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
		const variance =
			vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length;
		const std = Math.sqrt(variance) || 1;
		return { mean, std };
	});

	const normFeatures = data.map((d) =>
		d.features.map((v, i) => (v - stats[i].mean) / stats[i].std),
	);
	const encoded = data.map((d) => labelToIndex[d.target]);

	const featureTensor = tf.tensor2d(normFeatures);
	const labelIndices = tf.tensor1d(encoded, 'int32');
	const numClasses = labels.length;
	const oneHot = tf.oneHot(labelIndices, numClasses);

	// Train/val split
	const total = featureTensor.shape[0];
	const trainSize = Math.floor(total * (1 - CONFIG.validationSplit));
	const xTrain = featureTensor.slice([0, 0], [trainSize, -1]);
	const yTrain = oneHot.slice([0, 0], [trainSize, -1]);
	const xVal = featureTensor.slice([trainSize, 0], [-1, -1]);
	const yVal = oneHot.slice([trainSize, 0], [-1, -1]);

	// Build model
	const model = tf.sequential();
	model.add(
		tf.layers.dense({
			inputDim: numericFeatures.length,
			units: CONFIG.hiddenLayers[0],
			activation: 'relu',
			kernelInitializer: 'heNormal',
		}),
	);
	model.add(tf.layers.dropout({ rate: 0.3 }));
	for (let i = 1; i < CONFIG.hiddenLayers.length; i++) {
		model.add(
			tf.layers.dense({
				units: CONFIG.hiddenLayers[i],
				activation: 'relu',
				kernelInitializer: 'heNormal',
			}),
		);
		model.add(tf.layers.dropout({ rate: 0.3 }));
	}
	model.add(
		tf.layers.dense({
			units: numClasses,
			activation: numClasses === 2 ? 'sigmoid' : 'softmax',
		}),
	);
	model.compile({
		optimizer: tf.train.adam(CONFIG.learningRate),
		loss: numClasses === 2 ? 'binaryCrossentropy' : 'categoricalCrossentropy',
		metrics: ['accuracy'],
	});

	console.log('Beginning training...');
	const history = await model.fit(xTrain, yTrain, {
		epochs: CONFIG.epochs,
		batchSize: CONFIG.batchSize,
		validationData: [xVal, yVal],
		verbose: 0,
		callbacks: {
			onEpochEnd: (epoch, logs) => {
				if ((epoch + 1) % 5 === 0)
					console.log(
						`Epoch ${epoch + 1}/${CONFIG.epochs} loss=${logs.loss.toFixed(
							4,
						)} acc=${(logs.acc || logs.accuracy).toFixed(4)}`,
					);
			},
		},
	});

	const evalRes = model.evaluate(xVal, yVal);
	const loss = (await evalRes[0].data())[0];
	const acc = (await evalRes[1].data())[0];
	console.log(
		`Final Validation -> loss: ${loss.toFixed(4)} acc: ${(acc * 100).toFixed(
			2,
		)}%`,
	);

	// Ensure output directory
	fs.mkdirSync(OUT_DIR, { recursive: true });
	const saveURL = `file://${OUT_DIR.replace(/\\/g, '/')}`;
	await model.save(saveURL);

	const metadata = {
		featureColumns: numericFeatures,
		targetColumn,
		labelEncoder: labelToIndex,
		trainedAt: new Date().toISOString(),
		hiddenLayers: CONFIG.hiddenLayers,
		learningRate: CONFIG.learningRate,
		epochs: CONFIG.epochs,
		batchSize: CONFIG.batchSize,
		validationSplit: CONFIG.validationSplit,
		valLoss: loss,
		valAccuracy: acc,
	};
	fs.writeFileSync(
		path.join(OUT_DIR, 'metadata.json'),
		JSON.stringify(metadata, null, 2),
	);

	console.log('Model exported to', OUT_DIR);
})();
