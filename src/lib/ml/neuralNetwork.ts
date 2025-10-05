/**
 * Neural Network Training Service using TensorFlow.js
 * Handles data preprocessing, model creation, training, and export
 */

import * as tf from '@tensorflow/tfjs';

export interface TrainingConfig {
	fileName: string;
	targetColumn: string;
	featureColumns: string[];
	hiddenLayers?: number[];
	learningRate?: number;
	epochs?: number;
	batchSize?: number;
	validationSplit?: number;
}

export interface TrainingProgress {
	epoch: number;
	loss: number;
	accuracy?: number;
	valLoss?: number;
	valAccuracy?: number;
}

export interface ModelExportData {
	modelUrl: string;
	modelWeightsUrl: string;
	modelTopology: any;
	metadata: {
		featureColumns: string[];
		targetColumn: string;
		labelEncoder?: { [key: string]: number };
		featureStats?: { [key: string]: { mean: number; std: number } };
		trainedAt: string;
		accuracy?: number;
	};
}

export class NeuralNetworkService {
	private model: tf.Sequential | null = null;
	private labelEncoder: { [key: string]: number } = {};
	private reverseLabelEncoder: { [key: number]: string } = {};
	private featureStats: { [key: string]: { mean: number; std: number } } = {};

	/**
	 * Parse CSV data and preprocess for training
	 */
	async preprocessData(
		csvContent: string,
		targetColumn: string,
		featureColumns: string[],
	): Promise<{
		xTrain: tf.Tensor2D;
		yTrain: tf.Tensor2D;
		xVal: tf.Tensor2D;
		yVal: tf.Tensor2D;
		numClasses: number;
	}> {
		// Parse CSV
		const lines = csvContent.trim().split('\n');
		const headers = lines[0].split(',').map((h) => h.trim());

		// Find column indices
		const targetIndex = headers.indexOf(targetColumn);
		const featureIndices = featureColumns.map((col) => headers.indexOf(col));

		if (targetIndex === -1) {
			throw new Error(`Target column '${targetColumn}' not found in CSV`);
		}

		if (featureIndices.some((idx) => idx === -1)) {
			const missingCols = featureColumns.filter(
				(_, i) => featureIndices[i] === -1,
			);
			throw new Error(`Feature columns not found: ${missingCols.join(', ')}`);
		}

		// Extract and clean data
		const data: { features: number[]; target: string }[] = [];

		for (let i = 1; i < lines.length; i++) {
			const row = lines[i].split(',').map((cell) => cell.trim());
			if (row.length !== headers.length) continue;

			// Extract features (convert to numbers)
			const features: number[] = [];
			let validRow = true;

			for (const idx of featureIndices) {
				const value = parseFloat(row[idx]);
				if (isNaN(value)) {
					validRow = false;
					break;
				}
				features.push(value);
			}

			if (validRow && row[targetIndex]) {
				data.push({
					features,
					target: row[targetIndex].toLowerCase().trim(),
				});
			}
		}

		if (data.length === 0) {
			throw new Error('No valid data rows found');
		}

		console.log(`Preprocessed ${data.length} valid samples`);

		// Create label encoder for target values
		const uniqueTargets = [...new Set(data.map((d) => d.target))];
		this.labelEncoder = {};
		this.reverseLabelEncoder = {};

		uniqueTargets.forEach((target, index) => {
			this.labelEncoder[target] = index;
			this.reverseLabelEncoder[index] = target;
		});

		const numClasses = uniqueTargets.length;
		console.log(`Found ${numClasses} classes:`, uniqueTargets);

		// Calculate feature statistics for normalization
		this.featureStats = {};
		for (let i = 0; i < featureColumns.length; i++) {
			const values = data.map((d) => d.features[i]);
			const mean = values.reduce((a, b) => a + b, 0) / values.length;
			const variance =
				values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
			const std = Math.sqrt(variance) || 1; // Prevent division by zero

			this.featureStats[featureColumns[i]] = { mean, std };
		}

		// Normalize features and encode targets
		const normalizedFeatures: number[][] = [];
		const encodedTargets: number[] = [];

		for (const sample of data) {
			// Normalize features
			const normalizedFeature = sample.features.map((value, i) => {
				const { mean, std } = this.featureStats[featureColumns[i]];
				return (value - mean) / std;
			});

			normalizedFeatures.push(normalizedFeature);
			encodedTargets.push(this.labelEncoder[sample.target]);
		}

		// Convert to tensors
		const features = tf.tensor2d(normalizedFeatures);
		// Create int32 tensor for class indices (required by oneHot)
		const targetIndices = tf.tensor1d(encodedTargets, 'int32');

		// One-hot encode targets for multi-class classification
		const oneHotTargets = tf.oneHot(targetIndices, numClasses);

		// Split into training and validation sets (80-20 split)
		const totalSamples = features.shape[0];
		const trainSize = Math.floor(totalSamples * 0.8);

		const xTrain = features.slice([0, 0], [trainSize, -1]) as tf.Tensor2D;
		const yTrain = oneHotTargets.slice([0, 0], [trainSize, -1]) as tf.Tensor2D;
		const xVal = features.slice([trainSize, 0], [-1, -1]) as tf.Tensor2D;
		const yVal = oneHotTargets.slice([trainSize, 0], [-1, -1]) as tf.Tensor2D;

		// Clean up intermediate tensors
		features.dispose();
		targetIndices.dispose();
		oneHotTargets.dispose();

		return { xTrain, yTrain, xVal, yVal, numClasses };
	}

	/**
	 * Create neural network model
	 */
	createModel(
		inputDim: number,
		numClasses: number,
		hiddenLayers: number[] = [64, 32],
		learningRate: number = 0.001,
	): tf.Sequential {
		const model = tf.sequential();

		// Input layer
		model.add(
			tf.layers.dense({
				inputDim,
				units: hiddenLayers[0],
				activation: 'relu',
				kernelInitializer: 'heNormal',
			}),
		);

		// Add dropout for regularization
		model.add(tf.layers.dropout({ rate: 0.3 }));

		// Hidden layers
		for (let i = 1; i < hiddenLayers.length; i++) {
			model.add(
				tf.layers.dense({
					units: hiddenLayers[i],
					activation: 'relu',
					kernelInitializer: 'heNormal',
				}),
			);
			model.add(tf.layers.dropout({ rate: 0.3 }));
		}

		// Output layer
		model.add(
			tf.layers.dense({
				units: numClasses,
				activation: numClasses === 2 ? 'sigmoid' : 'softmax',
			}),
		);

		// Compile model
		model.compile({
			optimizer: tf.train.adam(learningRate),
			loss: numClasses === 2 ? 'binaryCrossentropy' : 'categoricalCrossentropy',
			metrics: ['accuracy'],
		});

		this.model = model;
		return model;
	}

	/**
	 * Train the neural network
	 */
	async trainModel(
		xTrain: tf.Tensor2D,
		yTrain: tf.Tensor2D,
		xVal: tf.Tensor2D,
		yVal: tf.Tensor2D,
		config: {
			epochs: number;
			batchSize: number;
			onEpochEnd?: (epoch: number, logs: any) => void;
		},
	): Promise<tf.History> {
		if (!this.model) {
			throw new Error('Model not created. Call createModel first.');
		}

		const history = await this.model.fit(xTrain, yTrain, {
			epochs: config.epochs,
			batchSize: config.batchSize,
			validationData: [xVal, yVal],
			shuffle: true,
			callbacks: config.onEpochEnd
				? {
						onEpochEnd: async (epoch, logs) => {
							config.onEpochEnd!(epoch, logs);
						},
				  }
				: undefined,
		});

		return history;
	}

	/**
	 * Export model for download
	 */
	async exportModel(modelName: string): Promise<ModelExportData> {
		if (!this.model) {
			throw new Error('No model to export. Train a model first.');
		}

		// Create export directory structure in browser
		const modelUrl = `exported_models/${modelName}`;

		// Save model (this will create downloadable files)
		await this.model.save(`downloads://${modelName}`);

		// Create metadata
		const metadata = {
			featureColumns: Object.keys(this.featureStats),
			targetColumn: '', // Will be set by calling code
			labelEncoder: this.labelEncoder,
			featureStats: this.featureStats,
			trainedAt: new Date().toISOString(),
		};

		// Get model topology for metadata
		const modelTopology = this.model.toJSON();

		return {
			modelUrl: `${modelUrl}.json`,
			modelWeightsUrl: `${modelUrl}.weights.bin`,
			modelTopology,
			metadata,
		};
	}

	/**
	 * Make predictions on new data
	 */
	predict(features: number[][]): {
		predictions: string[];
		probabilities: number[][];
	} {
		if (!this.model) {
			throw new Error('Model not trained. Train a model first.');
		}

		// Normalize features using stored statistics
		const normalizedFeatures = features.map((row) =>
			row.map((value, i) => {
				const featureName = Object.keys(this.featureStats)[i];
				const { mean, std } = this.featureStats[featureName];
				return (value - mean) / std;
			}),
		);

		const input = tf.tensor2d(normalizedFeatures);
		const prediction = this.model.predict(input) as tf.Tensor;
		const probabilities = prediction.arraySync() as number[][];

		const predictions = probabilities.map((prob) => {
			const classIndex = prob.indexOf(Math.max(...prob));
			return this.reverseLabelEncoder[classIndex];
		});

		input.dispose();
		prediction.dispose();

		return { predictions, probabilities };
	}

	/**
	 * Evaluate model performance
	 */
	async evaluateModel(
		xTest: tf.Tensor2D,
		yTest: tf.Tensor2D,
	): Promise<{ loss: number; accuracy: number }> {
		if (!this.model) {
			throw new Error('Model not trained. Train a model first.');
		}

		const evaluation = this.model.evaluate(xTest, yTest) as tf.Scalar[];
		const loss = await evaluation[0].data();
		const accuracy = await evaluation[1].data();

		evaluation.forEach((tensor) => tensor.dispose());

		return {
			loss: loss[0],
			accuracy: accuracy[0],
		};
	}

	/**
	 * Get model summary
	 */
	getModelSummary(): any {
		if (!this.model) {
			return null;
		}

		return {
			layers: this.model.layers.length,
			trainableParams: this.model.countParams(),
			optimizer: this.model.optimizer?.getClassName(),
			loss: this.model.loss,
		};
	}

	/**
	 * Clean up resources
	 */
	dispose(): void {
		if (this.model) {
			this.model.dispose();
			this.model = null;
		}
		tf.disposeVariables();
	}
}
