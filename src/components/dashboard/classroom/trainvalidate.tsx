'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardTitle, CardContent } from '../../ui/Card';
import { useClassroomStore } from '../../../lib/ml/state/classroomStore';
import {
	NeuralNetworkService,
	TrainingProgress,
} from '../../../lib/ml/neuralNetwork';
import * as tf from '@tensorflow/tfjs';

interface ModelConfig {
	hiddenLayers: number[];
	learningRate: number;
	epochs: number;
	batchSize: number;
	optimizer: string;
	activationFunction: string;
	dropoutRate: number;
	validationSplit: number;
}

interface RandomForestConfig {
	nEstimators: number;
	maxDepth: number;
	minSamplesSplit: number;
	minSamplesLeaf: number;
	maxFeatures: string | number;
	bootstrap: boolean;
	randomState?: number;
}

// Simple Random Forest implementation
class SimpleRandomForest {
	private trees: any[] = [];
	private config: RandomForestConfig;
	private featureNames: string[] = [];
	private classLabels: string[] = [];

	constructor(config: RandomForestConfig) {
		this.config = config;
	}

	async fit(
		X: number[][],
		y: number[],
		featureNames: string[],
		onTreeComplete?: (treeIndex: number, oobScore?: number) => void,
	) {
		this.featureNames = featureNames;
		this.classLabels = [...new Set(y)].map(String);
		this.trees = [];

		const nSamples = X.length;
		const nFeatures = X[0].length;

		// Calculate max features
		let maxFeatures: number;
		if (this.config.maxFeatures === 'sqrt') {
			maxFeatures = Math.floor(Math.sqrt(nFeatures));
		} else if (this.config.maxFeatures === 'log2') {
			maxFeatures = Math.floor(Math.log2(nFeatures));
		} else if (typeof this.config.maxFeatures === 'number') {
			maxFeatures = Math.min(this.config.maxFeatures, nFeatures);
		} else {
			maxFeatures = nFeatures;
		}

		for (let i = 0; i < this.config.nEstimators; i++) {
			// Bootstrap sampling
			const bootstrapIndices: number[] = [];
			const oobIndices: number[] = [];

			if (this.config.bootstrap) {
				for (let j = 0; j < nSamples; j++) {
					bootstrapIndices.push(Math.floor(Math.random() * nSamples));
				}
				// Track out-of-bag samples
				for (let j = 0; j < nSamples; j++) {
					if (!bootstrapIndices.includes(j)) {
						oobIndices.push(j);
					}
				}
			} else {
				for (let j = 0; j < nSamples; j++) {
					bootstrapIndices.push(j);
				}
			}

			const bootstrapX = bootstrapIndices.map((idx) => X[idx]);
			const bootstrapY = bootstrapIndices.map((idx) => y[idx]);

			// Feature sampling for this tree
			const featureIndices = this.sampleFeatures(nFeatures, maxFeatures);

			// Build decision tree
			const tree = this.buildTree(
				bootstrapX.map((row) => featureIndices.map((idx) => row[idx])),
				bootstrapY,
				0,
				featureIndices,
			);

			this.trees.push({
				tree,
				featureIndices,
				oobIndices,
			});

			// Calculate OOB score for this tree
			let oobScore: number | undefined;
			if (oobIndices.length > 0) {
				const oobPredictions = oobIndices.map((idx) => {
					const sample = featureIndices.map((fIdx) => X[idx][fIdx]);
					return this.predictTree(tree, sample);
				});
				const oobActual = oobIndices.map((idx) => y[idx]);
				const correct = oobPredictions.filter(
					(pred, i) => pred === oobActual[i],
				).length;
				oobScore = correct / oobIndices.length;
			}

			if (onTreeComplete) {
				onTreeComplete(i, oobScore);
			}

			// Add small delay to allow UI updates
			await new Promise((resolve) => setTimeout(resolve, 10));
		}
	}

	private sampleFeatures(totalFeatures: number, maxFeatures: number): number[] {
		const indices = Array.from({ length: totalFeatures }, (_, i) => i);
		const sampled: number[] = [];

		for (let i = 0; i < maxFeatures; i++) {
			const randomIndex = Math.floor(Math.random() * indices.length);
			sampled.push(indices.splice(randomIndex, 1)[0]);
		}

		return sampled.sort((a, b) => a - b);
	}

	private buildTree(
		X: number[][],
		y: number[],
		depth: number,
		featureIndices: number[],
	): any {
		// Stopping criteria
		if (
			depth >= this.config.maxDepth ||
			X.length < this.config.minSamplesSplit ||
			new Set(y).size === 1
		) {
			return this.createLeaf(y);
		}

		// Find best split
		const bestSplit = this.findBestSplit(X, y, featureIndices);

		if (!bestSplit || X.length < this.config.minSamplesLeaf * 2) {
			return this.createLeaf(y);
		}

		// Split data
		const leftIndices = X.map((row, i) =>
			row[bestSplit.featureIdx] <= bestSplit.threshold ? i : -1,
		).filter((i) => i !== -1);
		const rightIndices = X.map((row, i) =>
			row[bestSplit.featureIdx] > bestSplit.threshold ? i : -1,
		).filter((i) => i !== -1);

		if (
			leftIndices.length < this.config.minSamplesLeaf ||
			rightIndices.length < this.config.minSamplesLeaf
		) {
			return this.createLeaf(y);
		}

		const leftX = leftIndices.map((i) => X[i]);
		const leftY = leftIndices.map((i) => y[i]);
		const rightX = rightIndices.map((i) => X[i]);
		const rightY = rightIndices.map((i) => y[i]);

		return {
			type: 'split',
			featureIdx: bestSplit.featureIdx,
			threshold: bestSplit.threshold,
			left: this.buildTree(leftX, leftY, depth + 1, featureIndices),
			right: this.buildTree(rightX, rightY, depth + 1, featureIndices),
		};
	}

	private findBestSplit(
		X: number[][],
		y: number[],
		featureIndices: number[],
	): any {
		let bestGini = Infinity;
		let bestSplit: any = null;

		for (let featureIdx = 0; featureIdx < X[0].length; featureIdx++) {
			const values = [...new Set(X.map((row) => row[featureIdx]))].sort(
				(a, b) => a - b,
			);

			for (let i = 0; i < values.length - 1; i++) {
				const threshold = (values[i] + values[i + 1]) / 2;
				const gini = this.calculateSplitGini(X, y, featureIdx, threshold);

				if (gini < bestGini) {
					bestGini = gini;
					bestSplit = { featureIdx, threshold, gini };
				}
			}
		}

		return bestSplit;
	}

	private calculateSplitGini(
		X: number[][],
		y: number[],
		featureIdx: number,
		threshold: number,
	): number {
		const leftY: number[] = [];
		const rightY: number[] = [];

		for (let i = 0; i < X.length; i++) {
			if (X[i][featureIdx] <= threshold) {
				leftY.push(y[i]);
			} else {
				rightY.push(y[i]);
			}
		}

		const totalSamples = y.length;
		const leftWeight = leftY.length / totalSamples;
		const rightWeight = rightY.length / totalSamples;

		return (
			leftWeight * this.calculateGini(leftY) +
			rightWeight * this.calculateGini(rightY)
		);
	}

	private calculateGini(y: number[]): number {
		if (y.length === 0) return 0;

		const counts = new Map<number, number>();
		for (const label of y) {
			counts.set(label, (counts.get(label) || 0) + 1);
		}

		let gini = 1;
		for (const count of counts.values()) {
			const probability = count / y.length;
			gini -= probability * probability;
		}

		return gini;
	}

	private createLeaf(y: number[]): any {
		const counts = new Map<number, number>();
		for (const label of y) {
			counts.set(label, (counts.get(label) || 0) + 1);
		}

		let maxCount = 0;
		let prediction = 0;
		for (const [label, count] of counts.entries()) {
			if (count > maxCount) {
				maxCount = count;
				prediction = label;
			}
		}

		return {
			type: 'leaf',
			prediction,
			samples: y.length,
			distribution: counts,
		};
	}

	predict(X: number[][]): number[] {
		return X.map((sample) => this.predictSample(sample));
	}

	predictSample(sample: number[]): number {
		const predictions = this.trees.map((treeInfo) => {
			const treeSample = treeInfo.featureIndices.map(
				(fIdx: number) => sample[fIdx],
			);
			return this.predictTree(treeInfo.tree, treeSample);
		});

		// Majority vote
		const counts = new Map<number, number>();
		for (const pred of predictions) {
			counts.set(pred, (counts.get(pred) || 0) + 1);
		}

		let maxCount = 0;
		let finalPrediction = 0;
		for (const [label, count] of counts.entries()) {
			if (count > maxCount) {
				maxCount = count;
				finalPrediction = label;
			}
		}

		return finalPrediction;
	}

	// New: return per-class probability distributions by aggregating
	// leaf distributions across all trees (summing counts then normalizing)
	predictProba(X: number[][]): number[][] {
		if (!this.trees.length) return X.map(() => [1]);
		const nTrees = this.trees.length;
		// Derive numeric class ids from stored labels (they were numbers originally)
		const classes = this.classLabels.map((c) => Number(c));
		return X.map((sample) => {
			// aggregate counts
			const aggCounts = new Map<number, number>();
			for (const treeInfo of this.trees) {
				// map sample to tree's feature subset order
				const treeSample = treeInfo.featureIndices.map(
					(fIdx: number) => sample[fIdx],
				);
				let node = treeInfo.tree;
				while (node.type !== 'leaf') {
					if (treeSample[node.featureIdx] <= node.threshold) node = node.left;
					else node = node.right;
				}
				// node.distribution is Map<label,count]
				for (const [label, count] of node.distribution.entries()) {
					aggCounts.set(label, (aggCounts.get(label) || 0) + count);
				}
			}
			const total =
				Array.from(aggCounts.values()).reduce((a, b) => a + b, 0) || 1;
			return classes.map((cls) => (aggCounts.get(cls) || 0) / total);
		});
	}

	private predictTree(tree: any, sample: number[]): number {
		if (tree.type === 'leaf') {
			return tree.prediction;
		}

		if (sample[tree.featureIdx] <= tree.threshold) {
			return this.predictTree(tree.left, sample);
		} else {
			return this.predictTree(tree.right, sample);
		}
	}

	getFeatureImportance(): Record<string, number> {
		const importance = new Map<number, number>();

		// Initialize importance for all features
		for (let i = 0; i < this.featureNames.length; i++) {
			importance.set(i, 0);
		}

		// Calculate feature importance based on splits
		for (const treeInfo of this.trees) {
			this.calculateTreeImportance(
				treeInfo.tree,
				treeInfo.featureIndices,
				importance,
			);
		}

		// Normalize and convert to feature names
		const totalImportance = Array.from(importance.values()).reduce(
			(sum, val) => sum + val,
			0,
		);
		const result: Record<string, number> = {};

		for (let i = 0; i < this.featureNames.length; i++) {
			const imp = importance.get(i) || 0;
			result[this.featureNames[i]] =
				totalImportance > 0 ? imp / totalImportance : 0;
		}

		return result;
	}

	private calculateTreeImportance(
		tree: any,
		featureIndices: number[],
		importance: Map<number, number>,
	) {
		if (tree.type === 'leaf') return;

		const globalFeatureIdx = featureIndices[tree.featureIdx];
		const currentImportance = importance.get(globalFeatureIdx) || 0;
		importance.set(globalFeatureIdx, currentImportance + 1);

		this.calculateTreeImportance(tree.left, featureIndices, importance);
		this.calculateTreeImportance(tree.right, featureIndices, importance);
	}
}

export default function ClassroomTrainValidateTab() {
	// Use classroom store for persistence
	const [classroomState, classroomStore] = useClassroomStore();
	const router = useRouter();

	// Get training state from store for persistence
	const modelMetrics = classroomState.training.modelMetrics;
	const trainingProgress = classroomState.training.trainingProgress || [];
	const isTraining = classroomState.training.isTraining;
	const selectedModelType =
		classroomState.modelSelection.hyperparams?.modelType || 'neural-network';

	// On mount: if training flag is true but no active progress, clear it
	useEffect(() => {
		if (
			classroomState.training.isTraining &&
			(!trainingProgress || trainingProgress.length === 0)
		) {
			console.log('[TrainValidate] Normalizing stale isTraining flag.');
			classroomStore.setTrainingStatus(false);
		}
	}, []);

	const [currentEpoch, setCurrentEpoch] = useState(0);
	const [currentTree, setCurrentTree] = useState(0);
	const [modelConfig, setModelConfig] = useState<ModelConfig>({
		hiddenLayers: [128, 64, 32],
		learningRate: 0.001,
		epochs: 100,
		batchSize: 32,
		optimizer: 'adam',
		activationFunction: 'relu',
		dropoutRate: 0.3,
		validationSplit: 0.2,
	});
	const [rfConfig, setRfConfig] = useState<RandomForestConfig>({
		nEstimators: 100,
		maxDepth: 10,
		minSamplesSplit: 2,
		minSamplesLeaf: 1,
		maxFeatures: 'sqrt',
		bootstrap: true,
		randomState: 42,
	});
	const [trainedModel, setTrainedModel] = useState<
		NeuralNetworkService | SimpleRandomForest | null
	>(null);
	const [exportStatus, setExportStatus] = useState<string>('');
	const [errorMessage, setErrorMessage] = useState<string>('');
	// New: Track sanitized (numeric-only) feature usage
	const [droppedFeatureColumns, setDroppedFeatureColumns] = useState<string[]>(
		[],
	);
	const [usedFeatureColumns, setUsedFeatureColumns] = useState<string[]>([]);

	// Random Forest specific state
	const [rfTreeProgress, setRfTreeProgress] = useState<
		Array<{
			treeIndex: number;
			oobScore?: number;
			completed: boolean;
			trainingTime?: number;
		}>
	>([]);
	const [featureImportance, setFeatureImportance] = useState<
		Record<string, number>
	>({});
	const [rfAccuracyHistory, setRfAccuracyHistory] = useState<number[]>([]);
	const [rfOobHistory, setRfOobHistory] = useState<number[]>([]);
	const [selectedTreeDetail, setSelectedTreeDetail] = useState<number | null>(
		null,
	);
	const [rfTrainingStartTime, setRfTrainingStartTime] = useState<number>(0);

	const nnServiceRef = useRef<NeuralNetworkService | null>(null);
	const rfServiceRef = useRef<SimpleRandomForest | null>(null);
	const trainingCancelRef = useRef<(() => void) | null>(null);

	// Initialize TensorFlow.js backend
	useEffect(() => {
		const initTensorFlow = async () => {
			try {
				await tf.ready();
				console.log('TensorFlow.js backend initialized:', tf.getBackend());
			} catch (error) {
				console.error('Failed to initialize TensorFlow.js:', error);
				setErrorMessage(
					'Failed to initialize TensorFlow.js. Please refresh the page.',
				);
			}
		};
		initTensorFlow();
	}, []);

	// Ensure training state is properly reset on component load
	useEffect(() => {
		// If we're marked as training but have no current progress, reset the state
		if (isTraining && trainingProgress.length === 0) {
			console.log('Resetting stuck training state');
			classroomStore.setTrainingStatus(false);
		}
	}, [isTraining, trainingProgress.length, classroomStore]);

	// Periodic consistency check: guard against stale isTraining after reload or stall
	useEffect(() => {
		const interval = setInterval(() => {
			classroomStore.ensureTrainingConsistency(15000); // 15s stall window
		}, 5000); // check every 5s
		return () => clearInterval(interval);
	}, [classroomStore]);

	// Cleanup: stop training when component unmounts or user navigates away
	useEffect(() => {
		return () => {
			if (trainingCancelRef.current) {
				trainingCancelRef.current();
				trainingCancelRef.current = null;
			}
		};
	}, []);

	// Sync hyperparameters from store (model selection page) if available
	useEffect(() => {
		const hp = classroomState.modelSelection.hyperparams as any;
		if (hp && hp.modelType === 'neural-network') {
			setModelConfig((prev) => ({
				...prev,
				hiddenLayers:
					Array.isArray(hp.hiddenLayers) && hp.hiddenLayers.length
						? hp.hiddenLayers
						: prev.hiddenLayers,
				learningRate:
					typeof hp.learningRate === 'number'
						? hp.learningRate
						: prev.learningRate,
				epochs: typeof hp.epochs === 'number' ? hp.epochs : prev.epochs,
				batchSize:
					typeof hp.batchSize === 'number' ? hp.batchSize : prev.batchSize,
				dropoutRate:
					typeof hp.dropoutRate === 'number'
						? hp.dropoutRate
						: prev.dropoutRate,
				validationSplit:
					typeof hp.validationSplit === 'number'
						? hp.validationSplit
						: prev.validationSplit,
			}));
		} else if (hp && hp.modelType === 'random-forest') {
			setRfConfig((prev) => ({
				...prev,
				nEstimators:
					typeof hp.nEstimators === 'number'
						? hp.nEstimators
						: prev.nEstimators,
				maxDepth: typeof hp.maxDepth === 'number' ? hp.maxDepth : prev.maxDepth,
				minSamplesSplit:
					typeof hp.minSamplesSplit === 'number'
						? hp.minSamplesSplit
						: prev.minSamplesSplit,
				minSamplesLeaf:
					typeof hp.minSamplesLeaf === 'number'
						? hp.minSamplesLeaf
						: prev.minSamplesLeaf,
				maxFeatures:
					hp.maxFeatures !== undefined ? hp.maxFeatures : prev.maxFeatures,
				bootstrap:
					typeof hp.bootstrap === 'boolean' ? hp.bootstrap : prev.bootstrap,
				randomState:
					typeof hp.randomState === 'number'
						? hp.randomState
						: prev.randomState,
			}));
		}
	}, [classroomState.modelSelection.hyperparams]);

	// Sync current epoch/tree with training progress from store
	useEffect(() => {
		if (selectedModelType === 'neural-network' && trainingProgress.length > 0) {
			const latestEpoch = Math.max(...trainingProgress.map((p) => p.epoch));
			setCurrentEpoch(latestEpoch);
		} else if (
			selectedModelType === 'random-forest' &&
			rfTreeProgress.length > 0
		) {
			const completedTrees = rfTreeProgress.filter((t) => t.completed).length;
			setCurrentTree(completedTrees);
		}
	}, [trainingProgress, rfTreeProgress, selectedModelType]);

	// Gather training data references (updated to match store field names)
	const getTrainingData = () => {
		const dataInput = (classroomState as any).dataInput || {};
		const fileSource = dataInput.selectedDataSource; // correct field name
		let fileName = '';
		const targetColumn = dataInput.targetColumn; // correct field name
		const selectedFeatures = dataInput.selectedFeatures;
		const rawDataset = dataInput.rawDataset;
		const columnMeta = dataInput.columnMeta || [];

		switch (fileSource) {
			case 'tess':
				fileName = 'TESS-Classroom-Data.csv';
				break;
			case 'kepler':
				fileName = 'KOI-Classroom-Data.csv';
				break;
			case 'own':
				fileName = 'uploaded-data.csv';
				break;
			default:
				fileName = 'KOI-Classroom-Data.csv';
		}

		// Sanitize feature list against actual header to avoid missing column errors
		const headerSet = new Set(rawDataset?.header || []);
		const cleanedFeatures = (selectedFeatures || []).filter((f: string) =>
			headerSet.has(f),
		);

		return {
			fileName,
			targetColumn: targetColumn || '',
			featureColumns: cleanedFeatures,
			rawDataset,
			columnMeta,
		};
	};

	// Validate training readiness (with console hint for debugging)
	const canTrain = () => {
		const { fileName, targetColumn, featureColumns, rawDataset } =
			getTrainingData();
		const ready = Boolean(
			fileName && targetColumn && featureColumns.length > 0 && rawDataset,
		);
		return ready;
	};

	// Start training process (or request retrain navigation first)
	const startTraining = async () => {
		// If a model exists (retrain scenario), first navigate user back to model selection
		if (modelMetrics) {
			// Optional: clear previous training state to avoid confusion
			classroomStore.setTrainingStatus(false);
			classroomStore.clearTrainingProgress();
			setCurrentEpoch(0);
			setCurrentTree(0);
			setRfTreeProgress([]);
			setFeatureImportance({});
			setRfAccuracyHistory([]);
			setRfOobHistory([]);
			setSelectedTreeDetail(null);
			setExportStatus('');
			// Navigate to model selection so user can adjust hyperparameters, then they can return to train
			router.push('/dashboard/classroom/model-selection');
			return;
		}

		if (!canTrain()) {
			setErrorMessage(
				'Please complete data input configuration (target + features).',
			);
			return;
		}

		classroomStore.setTrainingStatus(true);
		classroomStore.clearTrainingProgress();
		setCurrentEpoch(0);
		setCurrentTree(0);
		setRfTreeProgress([]);
		setFeatureImportance({});
		setRfAccuracyHistory([]);
		setRfOobHistory([]);
		setSelectedTreeDetail(null);
		setErrorMessage('');
		setExportStatus('');

		try {
			const { fileName, targetColumn, featureColumns, rawDataset, columnMeta } =
				getTrainingData();

			// Sanitize features: Only keep numeric columns
			const numericFeatures = featureColumns.filter((f: string) => {
				const meta = columnMeta.find((c: any) => c.name === f);
				return meta?.inferredType === 'numeric';
			});
			const dropped = featureColumns.filter(
				(f: string) => !numericFeatures.includes(f),
			);
			setDroppedFeatureColumns(dropped);
			setUsedFeatureColumns(numericFeatures);

			if (numericFeatures.length === 0) {
				classroomStore.setTrainingStatus(false);
				setErrorMessage(
					'All selected features are non-numeric. Select at least one numeric feature before training.',
				);
				return;
			}

			// Get CSV content
			let csvContent = '';
			if (rawDataset?.originalCSV) {
				csvContent = rawDataset.originalCSV;
				console.log('✅ Using cached dataset from store');
			} else {
				console.log('📡 Fetching dataset from API:', fileName);
				// Fetch from API
				const response = await fetch('/api/train', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						fileName,
						targetColumn,
						featureColumns,
						modelConfig:
							selectedModelType === 'neural-network' ? modelConfig : rfConfig,
					}),
				});

				if (!response.ok) {
					const error = await response.json();
					throw new Error(error.error || 'Failed to load training data');
				}

				const data = await response.json();
				csvContent = data.csvContent;
			}

			if (selectedModelType === 'neural-network') {
				await trainNeuralNetwork(
					csvContent,
					targetColumn,
					numericFeatures,
					fileName,
					featureColumns,
					dropped,
				);
			} else if (selectedModelType === 'random-forest') {
				await trainRandomForest(
					csvContent,
					targetColumn,
					numericFeatures,
					fileName,
					featureColumns,
					dropped,
				);
			}
		} catch (error) {
			console.error('❌ Training error:', error);
			setErrorMessage(
				`Training failed: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`,
			);
			classroomStore.setTrainingStatus(false);
			trainingCancelRef.current = null;
		}
	};

	const trainNeuralNetwork = async (
		csvContent: string,
		targetColumn: string,
		numericFeatures: string[],
		fileName: string,
		featureColumns: string[],
		dropped: string[],
	) => {
		// Log the complete training configuration
		console.group('🚀 Neural Network Training Started');
		console.log('📊 Training Data:', {
			fileName,
			targetColumn,
			originalFeatureColumns: featureColumns,
			usedNumericFeatureColumns: numericFeatures,
			droppedNonNumeric: dropped,
		});
		console.log('🧠 Model Configuration:', modelConfig);
		console.groupEnd();

		// Initialize neural network service
		const nnService = new NeuralNetworkService();
		nnServiceRef.current = nnService;

		// Preprocess data
		console.log('🔄 Preprocessing data...');
		const {
			xTrain,
			yTrain,
			xVal,
			yVal,
			xTest,
			yTest,
			numClasses,
			featureNames,
			labelEncoder,
		} = await nnService.preprocessData(
			csvContent,
			targetColumn,
			numericFeatures,
		);

		// Persist test subset (NOT tensors) for later Test & Export usage
		try {
			const xTestArr = (await xTest.array()) as number[][];
			const yTestIdx = (await yTest.argMax(-1).array()) as number[];
			classroomStore.setTestDataset({
				features: xTestArr,
				labels: yTestIdx,
				featureNames: featureNames,
				classLabels: Object.keys(labelEncoder),
			});
		} catch (e) {
			console.warn('Failed to cache test dataset subset', e);
		}

		console.log('📈 Training data shape:', xTrain.shape);
		console.log('📊 Validation data shape:', xVal.shape);
		console.log('🎯 Number of classes:', numClasses);

		// Create model with advanced configuration
		const model = nnService.createModel(
			numericFeatures.length,
			numClasses,
			modelConfig.hiddenLayers,
			modelConfig.learningRate,
		);

		console.log('🧠 Model created with architecture:', {
			inputDim: numericFeatures.length,
			hiddenLayers: modelConfig.hiddenLayers,
			outputDim: numClasses,
			optimizer: modelConfig.optimizer,
			activation: modelConfig.activationFunction,
		});

		// Train model with progress tracking and cancellation support
		const EPOCHS = modelConfig.epochs;
		let trainingCancelled = false;

		// Set up cancellation function
		trainingCancelRef.current = () => {
			trainingCancelled = true;
			classroomStore.setTrainingStatus(false);
			console.log('🛑 Training cancelled by user');
		};

		const history = await nnService.trainModel(xTrain, yTrain, xVal, yVal, {
			epochs: modelConfig.epochs,
			batchSize: modelConfig.batchSize,
			onEpochEnd: (epoch, logs) => {
				// Check if training was cancelled
				if (trainingCancelled) {
					return false; // Stop training
				}

				setCurrentEpoch(epoch + 1);
				const progress = {
					epoch: epoch + 1,
					loss: logs.loss,
					accuracy: logs.acc || logs.accuracy,
					valLoss: logs.val_loss,
					valAccuracy: logs.val_acc || logs.val_accuracy,
				};
				classroomStore.updateTrainingMetrics(epoch + 1, progress);

				// Log training progress every 10 epochs
				if ((epoch + 1) % 10 === 0) {
					console.log(`📊 Epoch ${epoch + 1}/${modelConfig.epochs}:`, {
						loss: logs.loss?.toFixed(4),
						accuracy: ((logs.acc || logs.accuracy) * 100)?.toFixed(1) + '%',
						valAccuracy:
							((logs.val_acc || logs.val_accuracy) * 100)?.toFixed(1) + '%',
					});
				}
			},
		});

		// Evaluate final model
		// Evaluate on held-out test set instead of validation (validation used for early feedback)
		const finalMetrics = await nnService.evaluateModel(xTest, yTest);
		const trainingSummary = {
			epochs: modelConfig.epochs,
			finalLoss: history.history.loss[history.history.loss.length - 1],
			finalAccuracy:
				history.history.acc?.[history.history.acc.length - 1] ||
				history.history.accuracy?.[history.history.accuracy.length - 1],
			validationLoss:
				history.history.val_loss[history.history.val_loss.length - 1],
			validationAccuracy:
				history.history.val_acc?.[history.history.val_acc.length - 1] ||
				history.history.val_accuracy?.[history.history.val_accuracy.length - 1],
			trainingTime: Date.now(),
			modelConfig,
			datasetInfo: {
				fileName,
				targetColumn,
				originalFeatureColumns: featureColumns,
				usedNumericFeatureColumns: numericFeatures,
				droppedNonNumeric: dropped,
			},
		};

		classroomStore.setModelMetrics({
			accuracy: finalMetrics.accuracy,
			loss: finalMetrics.loss,
			finalAccuracy: (finalMetrics.accuracy * 100).toFixed(1) + '%',
			finalLoss: finalMetrics.loss.toFixed(4),
			trainingSummary: {
				epochs: EPOCHS,
				validationAccuracy: finalMetrics.accuracy,
			},
			modelType: 'neural-network',
		});
		classroomStore.setTrainingStatus(false);
		classroomStore.setHasTrainedModel(true);
		classroomStore.setTrainedModel(nnService);
		trainingCancelRef.current = null;

		setTrainedModel(nnService);

		// Clean up tensors
		xTrain.dispose();
		yTrain.dispose();
		xVal.dispose();
		yVal.dispose();
		xTest.dispose();
		yTest.dispose();

		console.log('✅ Neural Network training completed successfully!', {
			finalAccuracy: (finalMetrics.accuracy * 100).toFixed(1) + '%',
			finalLoss: finalMetrics.loss.toFixed(4),
		});
	};

	const trainRandomForest = async (
		csvContent: string,
		targetColumn: string,
		numericFeatures: string[],
		fileName: string,
		featureColumns: string[],
		dropped: string[],
	) => {
		console.group('🌳 Random Forest Training Started');
		console.log('📊 Training Data:', {
			fileName,
			targetColumn,
			originalFeatureColumns: featureColumns,
			usedNumericFeatureColumns: numericFeatures,
			droppedNonNumeric: dropped,
		});
		console.log('🌳 Model Configuration:', rfConfig);
		console.groupEnd();

		// Parse CSV data
		const lines = csvContent.trim().split('\n');
		const headers = lines[0].split(',').map((h: string) => h.trim());
		const rows = lines
			.slice(1)
			.map((line) => line.split(',').map((cell: string) => cell.trim()));

		// Find target column index
		const targetIdx = headers.indexOf(targetColumn);
		if (targetIdx === -1) {
			throw new Error(`Target column "${targetColumn}" not found`);
		}

		// Find feature column indices
		const featureIndices = numericFeatures.map((feature: string) => {
			const idx = headers.indexOf(feature);
			if (idx === -1) {
				throw new Error(`Feature column "${feature}" not found`);
			}
			return idx;
		});

		// Prepare data
		const X: number[][] = [];
		const y: number[] = [];
		const targetValues = new Set<string>();

		for (const row of rows) {
			if (row.length !== headers.length) continue;

			// Extract features
			const features = featureIndices.map((idx: number) =>
				parseFloat(row[idx]),
			);
			if (features.some((f: number) => isNaN(f))) continue; // Skip rows with invalid numeric data

			// Extract target
			const target = row[targetIdx];
			targetValues.add(target);

			X.push(features);
			y.push(Array.from(targetValues).indexOf(target));
		}

		console.log('📈 Processed data:', {
			samples: X.length,
			features: numericFeatures.length,
			classes: targetValues.size,
		});

		// Initialize Random Forest
		const rf = new SimpleRandomForest(rfConfig);
		rfServiceRef.current = rf;

		// Set up cancellation
		let trainingCancelled = false;
		trainingCancelRef.current = () => {
			trainingCancelled = true;
			classroomStore.setTrainingStatus(false);
			console.log('🛑 Random Forest training cancelled by user');
		};

		// Set training start time for tracking
		setRfTrainingStartTime(Date.now());

		// Train with progress tracking
		await rf.fit(X, y, numericFeatures, (treeIndex, oobScore) => {
			if (trainingCancelled) return;

			const currentTime = Date.now();
			setCurrentTree(treeIndex + 1);

			// Update tree progress with timing
			setRfTreeProgress((prev) => {
				const updated = [...prev];
				updated[treeIndex] = {
					treeIndex,
					oobScore,
					completed: true,
					trainingTime: currentTime - rfTrainingStartTime,
				};
				return updated;
			});

			// Update accuracy and OOB history for curves
			if (oobScore !== undefined) {
				setRfOobHistory((prev) => [...prev, oobScore]);
			}

			// Calculate running accuracy (estimate from completed trees)
			const completedTrees = treeIndex + 1;
			const estimatedAccuracy = oobScore || 0.5; // Use OOB as proxy
			setRfAccuracyHistory((prev) => [...prev, estimatedAccuracy]);

			// Log progress every 10 trees
			if ((treeIndex + 1) % 10 === 0) {
				console.log(`🌳 Tree ${treeIndex + 1}/${rfConfig.nEstimators}:`, {
					oobScore: oobScore?.toFixed(4) || 'N/A',
					estimatedAccuracy: estimatedAccuracy?.toFixed(4) || 'N/A',
				});
			}
		});

		// Get feature importance
		const importance = rf.getFeatureImportance();
		setFeatureImportance(importance);

		// Evaluate model (using training data as proxy)
		const predictions = rf.predict(X);
		const correct = predictions.filter((pred, idx) => pred === y[idx]).length;
		const accuracy = correct / y.length;

		// Calculate additional metrics
		const confusionMatrix = Array.from({ length: targetValues.size }, () =>
			Array(targetValues.size).fill(0),
		);
		for (let i = 0; i < y.length; i++) {
			confusionMatrix[y[i]][predictions[i]]++;
		}

		classroomStore.setModelMetrics({
			accuracy,
			finalAccuracy: (accuracy * 100).toFixed(1) + '%',
			trainingSummary: {
				nEstimators: rfConfig.nEstimators,
				accuracy,
				featureImportance: importance,
			},
			modelType: 'random-forest',
			confusionMatrix,
		});

		classroomStore.setTrainingStatus(false);
		classroomStore.setHasTrainedModel(true);
		classroomStore.setTrainedModel(rf);
		trainingCancelRef.current = null;
		setTrainedModel(rf);

		console.log('✅ Random Forest training completed successfully!', {
			finalAccuracy: (accuracy * 100).toFixed(1) + '%',
			trees: rfConfig.nEstimators,
		});
	};

	// Test model using validation split as proxy test set
	const handleTestModel = async () => {
		if (!trainedModel || !modelMetrics) {
			setErrorMessage('No trained model available for testing');
			return;
		}

		try {
			console.log('🧪 Starting model testing...');

			const { fileName, targetColumn, featureColumns, rawDataset } =
				getTrainingData();
			let csvContent = rawDataset?.originalCSV || '';

			if (!csvContent) {
				console.log('📡 Fetching dataset from API for testing:', fileName);
				const resp = await fetch('/api/train', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ fileName, targetColumn, featureColumns }),
				});
				if (resp.ok) {
					const data = await resp.json();
					csvContent = data.csvContent;
				}
			}

			if (!csvContent) {
				setErrorMessage('Unable to reconstruct dataset for testing');
				return;
			}

			if (selectedModelType === 'neural-network' && nnServiceRef.current) {
				console.log('🧠 Testing Neural Network model...');
				const nn = nnServiceRef.current;
				const numericFeatures = usedFeatureColumns.length
					? usedFeatureColumns
					: featureColumns;
				const { xTrain, yTrain, xVal, yVal } = await nn.preprocessData(
					csvContent,
					targetColumn,
					numericFeatures,
				);
				const evalMetrics = await nn.evaluateModel(xVal, yVal);
				const predsTensor = (nn as any).model.predict(xVal) as any;
				const preds = await predsTensor.array();
				const truths = await yVal.array();
				predsTensor.dispose();
				const predIdx = preds.map((r: number[]) => r.indexOf(Math.max(...r)));
				const trueIdx = truths.map((r: number[]) => r.indexOf(Math.max(...r)));
				const nClasses = Math.max(...trueIdx.concat(predIdx)) + 1;
				const matrix: number[][] = Array.from({ length: nClasses }, () =>
					Array(nClasses).fill(0),
				);
				for (let i = 0; i < trueIdx.length; i++)
					matrix[trueIdx[i]][predIdx[i]]++;
				let pSum = 0;
				let rSum = 0;
				for (let c = 0; c < nClasses; c++) {
					const tp = matrix[c][c];
					const fp = matrix.reduce(
						(acc, row, ri) => (ri === c ? acc : acc + row[c]),
						0,
					);
					const fn = matrix[c].reduce(
						(acc, v, ci) => (ci === c ? acc : acc + v),
						0,
					);
					const prec = tp + fp === 0 ? 0 : tp / (tp + fp);
					const rec = tp + fn === 0 ? 0 : tp / (tp + fn);
					pSum += prec;
					rSum += rec;
				}
				const precision = pSum / nClasses;
				const recall = rSum / nClasses;
				const f1 =
					precision + recall === 0
						? 0
						: (2 * precision * recall) / (precision + recall);
				// Derive curves if binary classification (nClasses===2)
				let rocCurve:
					| { fpr: number[]; tpr: number[]; thresholds: number[]; auc?: number }
					| undefined;
				let prCurve:
					| { recall: number[]; precision: number[]; thresholds: number[] }
					| undefined;
				if (nClasses === 2) {
					// Use probability of class 1
					const scores: number[] = preds.map((p: number[]) => p[1] ?? p[0]);
					const truthsBinary: number[] = trueIdx.map((v: number) =>
						v === 1 ? 1 : 0,
					);
					// Sort unique thresholds descending
					const thresholds = Array.from(
						new Set<number>(
							scores.slice().sort((a: number, b: number) => b - a),
						),
					);
					const tprArr: number[] = [];
					const fprArr: number[] = [];
					const precArr: number[] = [];
					const recArr: number[] = [];
					for (const thr of thresholds) {
						let tp = 0,
							fp = 0,
							tn = 0,
							fn = 0;
						for (let i = 0; i < scores.length; i++) {
							const pred = scores[i] >= thr ? 1 : 0;
							const truth = truthsBinary[i];
							if (pred === 1 && truth === 1) tp++;
							else if (pred === 1 && truth === 0) fp++;
							else if (pred === 0 && truth === 0) tn++;
							else fn++;
						}
						const tprVal = tp + fn === 0 ? 0 : tp / (tp + fn);
						const fprVal = fp + tn === 0 ? 0 : fp / (fp + tn);
						const precisionPoint = tp + fp === 0 ? 0 : tp / (tp + fp);
						const recallPoint = tprVal;
						tprArr.push(tprVal);
						fprArr.push(fprVal);
						precArr.push(precisionPoint);
						recArr.push(recallPoint);
					}
					// AUC (trapezoidal) sort by fpr ascending
					const paired = fprArr
						.map((fpr, i) => ({ fpr, tpr: tprArr[i] }))
						.sort((a, b) => a.fpr - b.fpr);
					let auc = 0;
					for (let i = 1; i < paired.length; i++) {
						const x1 = paired[i - 1].fpr,
							x2 = paired[i].fpr,
							y1 = paired[i - 1].tpr,
							y2 = paired[i].tpr;
						auc += ((x2 - x1) * (y1 + y2)) / 2;
					}
					rocCurve = {
						fpr: fprArr,
						tpr: tprArr,
						thresholds: thresholds as number[],
						auc,
					};
					prCurve = {
						recall: recArr,
						precision: precArr,
						thresholds: thresholds as number[],
					};
				}
				classroomStore.setTestResults(
					{
						accuracy: evalMetrics.accuracy,
						precision,
						recall,
						f1,
						loss: evalMetrics.loss,
						valAccuracy: modelMetrics.trainingSummary?.validationAccuracy,
					},
					matrix,
					{
						rawProbabilities: preds,
						rawTrueIndices: trueIdx,
						rocCurve,
						prCurve,
					},
				);
				xTrain.dispose();
				yTrain.dispose();
				xVal.dispose();
				yVal.dispose();

				console.log('✅ Neural Network testing completed successfully!');
			} else if (
				selectedModelType === 'random-forest' &&
				rfServiceRef.current
			) {
				console.log('🌳 Testing Random Forest model...');
				// Random Forest testing
				const rf = rfServiceRef.current;

				// Parse CSV data for testing
				const lines = csvContent.trim().split('\n');
				const headers = lines[0].split(',').map((h: string) => h.trim());
				const rows = lines
					.slice(1)
					.map((line: string) => line.split(',').map((cell) => cell.trim()));

				// Find target column index
				const targetIdx = headers.indexOf(targetColumn);
				if (targetIdx === -1) {
					throw new Error(`Target column "${targetColumn}" not found`);
				}

				// Find feature column indices
				const numericFeatures = usedFeatureColumns.length
					? usedFeatureColumns
					: featureColumns;
				const featureIndices = numericFeatures.map((feature: string) => {
					const idx = headers.indexOf(feature);
					if (idx === -1) {
						throw new Error(`Feature column "${feature}" not found`);
					}
					return idx;
				});

				// Prepare test data
				const testX: number[][] = [];
				const testY: number[] = [];
				const targetValues = new Set<string>();

				for (const row of rows) {
					if (row.length !== headers.length) continue;

					// Extract features
					const features = featureIndices.map((idx: number) =>
						parseFloat(row[idx]),
					);
					if (features.some((f: any) => isNaN(f))) continue;

					// Extract target
					const target = row[targetIdx];
					targetValues.add(target);

					testX.push(features);
					testY.push(Array.from(targetValues).indexOf(target));
				}

				// Make predictions
				const predictions = rf.predict(testX);

				// Calculate metrics
				const correct = predictions.filter(
					(pred, idx) => pred === testY[idx],
				).length;
				const accuracy = correct / testY.length;

				// Calculate precision, recall, f1
				const nClasses = targetValues.size;
				const matrix: number[][] = Array.from({ length: nClasses }, () =>
					Array(nClasses).fill(0),
				);
				for (let i = 0; i < testY.length; i++) {
					matrix[testY[i]][predictions[i]]++;
				}

				let pSum = 0;
				let rSum = 0;
				for (let c = 0; c < nClasses; c++) {
					const tp = matrix[c][c];
					const fp = matrix.reduce(
						(acc, row, ri) => (ri === c ? acc : acc + row[c]),
						0,
					);
					const fn = matrix[c].reduce(
						(acc, v, ci) => (ci === c ? acc : acc + v),
						0,
					);
					const prec = tp + fp === 0 ? 0 : tp / (tp + fp);
					const rec = tp + fn === 0 ? 0 : tp / (tp + fn);
					pSum += prec;
					rSum += rec;
				}
				const precision = pSum / nClasses;
				const recall = rSum / nClasses;
				const f1 =
					precision + recall === 0
						? 0
						: (2 * precision * recall) / (precision + recall);

				// Create mock probabilities for Random Forest (binary predictions -> probabilities)
				const mockProbabilities = predictions.map((pred) => {
					const probs = Array(nClasses).fill(0);
					probs[pred] = 1.0; // High confidence in prediction
					return probs;
				});

				classroomStore.setTestResults(
					{
						accuracy,
						precision,
						recall,
						f1,
						featureImportance: rf.getFeatureImportance(),
					},
					matrix,
					{
						rawProbabilities: mockProbabilities,
						rawTrueIndices: testY,
					},
				);

				console.log('✅ Random Forest testing completed successfully!');
			}

			// Automatically navigate to test-export page after successful testing
			console.log('🚀 Navigating to test-export page...');
			router.push('/dashboard/classroom/test-export');
		} catch (e) {
			console.error('❌ Testing failed', e);
			setErrorMessage(
				'Testing failed: ' + (e instanceof Error ? e.message : 'Unknown error'),
			);
		}
	};

	// Simple inline sparkline component for visualization (no external deps)
	const Sparklines: React.FC<{
		data: number[];
		color?: string;
		label?: string;
		suffix?: string;
	}> = ({ data, color = '#000', suffix = '' }) => {
		if (!data || data.length < 2) {
			return <div className="text-xs text-gray-500">Not enough data</div>;
		}
		const width = 220;
		const height = 60;
		const max = Math.max(...data);
		const min = Math.min(...data);
		const range = max - min || 1;
		const points = data
			.map((d, i) => {
				const x = (i / (data.length - 1)) * (width - 4) + 2;
				const y = height - ((d - min) / range) * (height - 4) - 2;
				return `${x},${y}`;
			})
			.join(' ');
		return (
			<div>
				<svg width={width} height={height} className="overflow-visible">
					<polyline
						fill="none"
						stroke={color}
						strokeWidth={2}
						points={points}
						vectorEffect="non-scaling-stroke"
					/>
				</svg>
				<div className="text-xs text-gray-600 mt-1">
					Last:{' '}
					{typeof data[data.length - 1] === 'number'
						? data[data.length - 1].toFixed(2)
						: '—'}
					{suffix}
				</div>
			</div>
		);
	};

	// Enhanced Interactive Random Forest Training Visualization
	const RandomForestVisualization: React.FC = () => {
		const treeGridSize = Math.ceil(Math.sqrt(rfConfig.nEstimators));
		const cellSize = Math.max(12, Math.min(24, 450 / treeGridSize));
		const [hoveredTree, setHoveredTree] = useState<number | null>(null);
		const [animationSpeed, setAnimationSpeed] = useState<number>(1);

		// Calculate statistics
		const completedTrees = rfTreeProgress.filter((t) => t.completed).length;
		const avgOobScore =
			rfTreeProgress.length > 0
				? rfTreeProgress.reduce((sum, t) => sum + (t.oobScore || 0), 0) /
				  rfTreeProgress.length
				: 0;
		const trainingElapsed =
			rfTrainingStartTime > 0 ? Date.now() - rfTrainingStartTime : 0;

		return (
			<div className="w-full bg-white border rounded-lg p-6">
				<div className="flex items-center justify-between mb-6">
					<h4 className="font-semibold text-base flex items-center gap-2">
						🌳 Random Forest Training Progress
						{isTraining && (
							<div className="flex items-center gap-1">
								<div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
								<span className="text-xs text-green-600 font-medium">
									Training...
								</span>
							</div>
						)}
					</h4>
					<div className="flex items-center gap-4 text-xs">
						<div className="flex items-center gap-1">
							<span className="font-medium">Speed:</span>
							<input
								type="range"
								min="0.5"
								max="3"
								step="0.5"
								value={animationSpeed}
								onChange={(e) => setAnimationSpeed(Number(e.target.value))}
								className="w-16"
							/>
							<span>{animationSpeed}x</span>
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
					{/* Enhanced Tree Grid Visualization */}
					<div className="lg:col-span-3">
						<div className="flex items-center justify-between mb-4">
							<div className="flex items-center gap-4">
								<span className="text-sm font-medium">
									Trees: {currentTree} / {rfConfig.nEstimators}
								</span>
								<span className="text-sm text-gray-600">
									{Math.round((currentTree / rfConfig.nEstimators) * 100)}%
									Complete
								</span>
								{trainingElapsed > 0 && (
									<span className="text-xs text-gray-500">
										{Math.round(trainingElapsed / 1000)}s elapsed
									</span>
								)}
							</div>
							{hoveredTree !== null && (
								<div className="text-xs bg-blue-50 border border-blue-200 rounded px-2 py-1">
									Tree {hoveredTree + 1} Details
								</div>
							)}
						</div>

						<div
							className="grid gap-2 mx-auto relative"
							style={{
								gridTemplateColumns: `repeat(${treeGridSize}, ${cellSize}px)`,
								maxWidth: `${treeGridSize * (cellSize + 8)}px`,
							}}
						>
							{Array.from({ length: rfConfig.nEstimators }, (_, i) => {
								const treeData = rfTreeProgress.find((t) => t.treeIndex === i);
								const isCompleted = treeData?.completed || false;
								const isCurrent = i === currentTree && isTraining;
								const isHovered = hoveredTree === i;
								const oobScore = treeData?.oobScore;
								const trainingTime = treeData?.trainingTime;

								// Color coding based on OOB score
								let bgColor = 'bg-gray-200 border-gray-300';
								if (isCompleted && oobScore) {
									if (oobScore >= 0.8)
										bgColor = 'bg-green-500 border-green-600';
									else if (oobScore >= 0.6)
										bgColor = 'bg-yellow-500 border-yellow-600';
									else bgColor = 'bg-red-500 border-red-600';
								} else if (isCurrent) {
									bgColor = 'bg-blue-500 border-blue-600';
								}

								return (
									<div
										key={i}
										className={`
											rounded-lg flex items-center justify-center text-xs font-medium
															transition-all duration-200 border-2 cursor-pointer relative overflow-hidden
											${bgColor}
											${isHovered ? 'scale-110 z-10 shadow-lg' : ''}
															${isCurrent ? 'rf-blink' : ''}
											text-white
										`}
										style={{
											width: cellSize,
											height: cellSize,
											fontSize: cellSize > 16 ? '10px' : '8px',
											animationDuration: `${2 / animationSpeed}s`,
										}}
										onMouseEnter={() => setHoveredTree(i)}
										onMouseLeave={() => setHoveredTree(null)}
										onClick={() =>
											setSelectedTreeDetail(selectedTreeDetail === i ? null : i)
										}
										title={`Tree ${i + 1}${
											oobScore ? ` - OOB: ${(oobScore * 100).toFixed(1)}%` : ''
										}${trainingTime ? ` - Time: ${trainingTime}ms` : ''}`}
									>
										{cellSize > 16 && (
											<>
												{isCompleted ? (
													<span className="block w-1.5 h-1.5 rounded-full bg-white" />
												) : isCurrent ? (
													<span className="block w-full h-full" />
												) : (
													<span className="block w-1.5 h-1.5 rounded-full bg-white/30" />
												)}
											</>
										)}
										{isCompleted && oobScore && (
											<div
												className="absolute bottom-0 left-0 bg-white/20 transition-all"
												style={{
													width: `${oobScore * 100}%`,
													height: '2px',
												}}
											></div>
										)}
									</div>
								);
							})}
						</div>

						{/* Enhanced Progress Bar */}
						<div className="mt-6 space-y-2">
							<div className="flex justify-between text-xs text-gray-600">
								<span>Progress</span>
								<span>
									{completedTrees} / {rfConfig.nEstimators} trees
								</span>
							</div>
							<div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden relative">
								<div
									className="h-3 bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500 ease-out"
									style={{
										width: `${(currentTree / rfConfig.nEstimators) * 100}%`,
									}}
								></div>
								{isTraining && (
									<div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
								)}
							</div>
						</div>

						{/* Tree Detail Panel */}
						{selectedTreeDetail !== null && (
							<div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
								<h6 className="font-medium text-sm mb-2">
									Tree {selectedTreeDetail + 1} Details
								</h6>
								{(() => {
									const tree = rfTreeProgress.find(
										(t) => t.treeIndex === selectedTreeDetail,
									);
									return (
										<div className="grid grid-cols-2 gap-4 text-xs">
											<div>
												Status:{' '}
												{tree?.completed ? '✅ Completed' : '⏳ Pending'}
											</div>
											<div>
												OOB Score:{' '}
												{tree?.oobScore
													? `${(tree.oobScore * 100).toFixed(2)}%`
													: 'N/A'}
											</div>
											<div>
												Training Time:{' '}
												{tree?.trainingTime ? `${tree.trainingTime}ms` : 'N/A'}
											</div>
											<div>Tree Index: {selectedTreeDetail}</div>
										</div>
									);
								})()}
								<button
									onClick={() => setSelectedTreeDetail(null)}
									className="mt-2 text-xs text-blue-600 hover:text-blue-800"
								>
									Close Details
								</button>
							</div>
						)}
					</div>

					{/* Enhanced Statistics Panel */}
					<div className="space-y-4">
						{/* Real-time Metrics */}
						<div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
							<h5 className="text-sm font-semibold mb-3 text-green-800">
								Live Metrics
							</h5>
							<div className="space-y-3">
								<div className="flex justify-between items-center">
									<span className="text-xs text-green-700">Avg OOB Score:</span>
									<span className="text-sm font-bold text-green-800">
										{avgOobScore > 0
											? `${(avgOobScore * 100).toFixed(1)}%`
											: 'N/A'}
									</span>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-xs text-green-700">Completed:</span>
									<span className="text-sm font-bold text-green-800">
										{completedTrees}
									</span>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-xs text-green-700">Remaining:</span>
									<span className="text-sm font-bold text-green-800">
										{rfConfig.nEstimators - completedTrees}
									</span>
								</div>
							</div>
						</div>

						{/* Configuration */}
						<div className="bg-gray-50 rounded-lg p-3">
							<h5 className="text-xs font-medium mb-2">Configuration</h5>
							<div className="space-y-1 text-xs text-gray-600">
								<div className="flex justify-between">
									<span>Max Depth:</span>
									<span className="font-medium">{rfConfig.maxDepth}</span>
								</div>
								<div className="flex justify-between">
									<span>Min Split:</span>
									<span className="font-medium">
										{rfConfig.minSamplesSplit}
									</span>
								</div>
								<div className="flex justify-between">
									<span>Max Features:</span>
									<span className="font-medium">{rfConfig.maxFeatures}</span>
								</div>
								<div className="flex justify-between">
									<span>Bootstrap:</span>
									<span className="font-medium">
										{rfConfig.bootstrap ? 'Yes' : 'No'}
									</span>
								</div>
							</div>
						</div>

						{/* Recent OOB Scores */}
						{rfTreeProgress.length > 0 && (
							<div className="bg-blue-50 rounded-lg p-3">
								<h5 className="text-xs font-medium mb-2 text-blue-800">
									Recent OOB Scores
								</h5>
								<div className="space-y-1">
									{rfTreeProgress
										.filter((t) => t.oobScore !== undefined)
										.slice(-6)
										.map((tree, idx) => (
											<div
												key={tree.treeIndex}
												className="flex justify-between text-xs"
											>
												<span className="text-blue-700">
													Tree {tree.treeIndex + 1}:
												</span>
												<span
													className={`font-medium ${
														tree.oobScore && tree.oobScore >= 0.8
															? 'text-green-600'
															: tree.oobScore && tree.oobScore >= 0.6
															? 'text-yellow-600'
															: 'text-red-600'
													}`}
												>
													{tree.oobScore
														? (tree.oobScore * 100).toFixed(1) + '%'
														: 'N/A'}
												</span>
											</div>
										))}
								</div>
							</div>
						)}

						{/* Feature Importance Preview */}
						{Object.keys(featureImportance).length > 0 && (
							<div className="bg-purple-50 rounded-lg p-3">
								<h5 className="text-xs font-medium mb-2 text-purple-800">
									Top Features
								</h5>
								<div className="space-y-2">
									{Object.entries(featureImportance)
										.sort(([, a], [, b]) => b - a)
										.slice(0, 4)
										.map(([feature, importance]) => (
											<div key={feature} className="flex items-center text-xs">
												<span className="flex-1 truncate text-purple-700">
													{feature}:
												</span>
												<div className="flex-1 mx-2 bg-purple-200 rounded-full h-1.5">
													<div
														className="bg-purple-500 h-1.5 rounded-full transition-all duration-500"
														style={{ width: `${importance * 100}%` }}
													></div>
												</div>
												<span className="w-8 text-right font-medium text-purple-800">
													{(importance * 100).toFixed(0)}%
												</span>
											</div>
										))}
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		);
	};

	const trainingData = getTrainingData();

	return (
		<div className="grid grid-cols-1 gap-6">
			{/* Workflow Navigation */}
			<div className="flex items-center justify-center w-full mb-2">
				<div className="flex items-center space-x-2 md:space-x-4 bg-white px-6 py-3 rounded-xl shadow-sm">
					{/* Data Input - Completed */}
					<div className="flex items-center">
						<div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="w-5 h-5"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fillRule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clipRule="evenodd"
								/>
							</svg>
						</div>
						<span className="ml-2 text-sm font-medium text-gray-500">
							Data Input
						</span>
					</div>

					{/* Connector Line */}
					<div className="w-8 h-0.5 bg-black"></div>

					{/* Model Selection - Completed */}
					<div className="flex items-center">
						<div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="w-5 h-5"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fillRule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clipRule="evenodd"
								/>
							</svg>
						</div>
						<span className="ml-2 text-sm font-medium text-gray-500">
							Model Selection
						</span>
					</div>

					{/* Connector Line */}
					<div className="w-8 h-0.5 bg-black"></div>

					{/* Train & Validate - Active (final step) */}
					<div className="flex items-center">
						<div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center">
							<span className="text-sm font-bold">3</span>
						</div>
						<span className="ml-2 text-sm font-medium">Train & Validate</span>
					</div>
				</div>
			</div>

			{/* Unified Training + Results Card */}
			<Card>
				<CardTitle>Model Training & Results</CardTitle>
				<CardContent>
					<p className="text-sm mb-4">
						{selectedModelType === 'neural-network'
							? 'Configure, train the neural network, and view live metrics plus final results.'
							: 'Configure, train the random forest, and view training progress with feature importance.'}
					</p>
					{/* Controls */}
					<div className="flex flex-wrap items-center gap-4 mb-6">
						{/* <div className="text-xs text-gray-400">
							isTraining: {String(isTraining)}, progress:{' '}
							{trainingProgress.length}
						</div> */}
						<button
							onClick={startTraining}
							disabled={(!canTrain() && !modelMetrics) || isTraining}
							className={`px-6 py-2 rounded-lg font-medium ${
								(modelMetrics || canTrain()) && !isTraining
									? 'bg-black text-white hover:bg-gray-800'
									: 'bg-gray-300 text-gray-500 cursor-not-allowed'
							}`}
						>
							{isTraining
								? 'Training...'
								: modelMetrics
								? 'Adjust & Retrain'
								: 'Start Training'}
						</button>
						{(trainingProgress.length > 0 || modelMetrics || isTraining) && (
							<button
								onClick={() => {
									classroomStore.clearTraining();
									setCurrentEpoch(0);
									setCurrentTree(0);
									setRfTreeProgress([]);
									setFeatureImportance({});
									setRfAccuracyHistory([]);
									setRfOobHistory([]);
									setSelectedTreeDetail(null);
								}}
								className="px-4 py-2 rounded-lg font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs"
								disabled={isTraining}
							>
								Reset Training
							</button>
						)}
						{!canTrain() && (
							<span className="text-xs text-red-600">
								Select a dataset, target & at least one feature in Data Input
								tab (ensure data finished loading).
							</span>
						)}
						{errorMessage && (
							<span className="text-xs text-red-600">{errorMessage}</span>
						)}
					</div>

					{/* Progress Bar */}
					{(isTraining ||
						trainingProgress.length > 0 ||
						rfTreeProgress.length > 0) && (
						<div className="mb-6">
							{selectedModelType === 'neural-network' && (
								<>
									<div className="flex items-center justify-between mb-2 text-sm">
										<span>
											Epoch {currentEpoch} / {modelConfig.epochs}
										</span>
										<span>
											{Math.min(
												100,
												Math.round((currentEpoch / modelConfig.epochs) * 100),
											)}
											%
										</span>
									</div>
									<div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
										<div
											className="h-2 bg-black transition-all duration-300"
											style={{
												width: `${(currentEpoch / modelConfig.epochs) * 100}%`,
											}}
										></div>
									</div>
								</>
							)}
							{selectedModelType === 'random-forest' && (
								<>
									<div className="flex items-center justify-between mb-2 text-sm">
										<span>
											Tree {currentTree} / {rfConfig.nEstimators}
										</span>
										<span>
											{Math.min(
												100,
												Math.round((currentTree / rfConfig.nEstimators) * 100),
											)}
											%
										</span>
									</div>
									<div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
										<div
											className="h-2 bg-green-500 transition-all duration-300"
											style={{
												width: `${(currentTree / rfConfig.nEstimators) * 100}%`,
											}}
										></div>
									</div>
								</>
							)}
						</div>
					)}

					{/* Latest Metrics */}
					{selectedModelType === 'neural-network' &&
						trainingProgress.length > 0 && (
							<div className="mb-6">
								<h4 className="font-medium mb-2">Recent Epochs</h4>
								<div className="space-y-1 text-xs md:text-sm">
									{trainingProgress.slice(-6).map((p, idx) => (
										<div
											key={`${p.epoch}-${idx}`}
											className="grid grid-cols-5 gap-2"
										>
											<span className="font-medium">Ep {p.epoch}</span>
											<span>
												Loss:{' '}
												{typeof p.loss === 'number' ? p.loss.toFixed(4) : '—'}
											</span>
											<span>
												Acc:{' '}
												{typeof p.accuracy === 'number'
													? (p.accuracy * 100).toFixed(1) + '%'
													: '—'}
											</span>
											<span>
												ValLoss:{' '}
												{typeof p.valLoss === 'number'
													? p.valLoss.toFixed(4)
													: '—'}
											</span>
											<span>
												ValAcc:{' '}
												{typeof p.valAccuracy === 'number'
													? (p.valAccuracy * 100).toFixed(1) + '%'
													: '—'}
											</span>
										</div>
									))}
								</div>
							</div>
						)}

					{selectedModelType === 'random-forest' &&
						rfTreeProgress.length > 0 && (
							<div className="mb-6">
								<h4 className="font-medium mb-2">Recent Trees</h4>
								<div className="space-y-1 text-xs md:text-sm">
									{rfTreeProgress.slice(-6).map((tree, idx) => (
										<div
											key={`${tree.treeIndex}-${idx}`}
											className="grid grid-cols-3 gap-2"
										>
											<span className="font-medium">
												Tree {tree.treeIndex + 1}
											</span>
											<span>
												OOB Score:{' '}
												{tree.oobScore
													? (tree.oobScore * 100).toFixed(1) + '%'
													: 'N/A'}
											</span>
											<span className="text-green-600">
												{tree.completed ? '✓ Completed' : 'Training...'}
											</span>
										</div>
									))}
								</div>
							</div>
						)}

					{/* Final Metrics */}
					{modelMetrics && (
						<div className="bg-gray-50 rounded-lg p-4 mb-4">
							<h4 className="font-medium mb-3">Final Metrics</h4>
							<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
								<div>
									<div className="text-xl font-bold text-green-600">
										{typeof modelMetrics.accuracy === 'number'
											? (modelMetrics.accuracy * 100).toFixed(1) + '%'
											: modelMetrics.finalAccuracy || 'N/A'}
									</div>
									<div className="text-xs text-gray-600 mt-1">Accuracy</div>
								</div>
								{selectedModelType === 'neural-network' && (
									<div>
										<div className="text-xl font-bold text-blue-600">
											{typeof modelMetrics.loss === 'number'
												? modelMetrics.loss.toFixed(4)
												: modelMetrics.finalLoss || 'N/A'}
										</div>
										<div className="text-xs text-gray-600 mt-1">Loss</div>
									</div>
								)}
								<div>
									<div className="text-xl font-bold text-purple-600">
										{selectedModelType === 'neural-network'
											? modelConfig.epochs
											: rfConfig.nEstimators}
									</div>
									<div className="text-xs text-gray-600 mt-1">
										{selectedModelType === 'neural-network'
											? 'Epochs'
											: 'Trees'}
									</div>
								</div>
								<div>
									<div className="text-xl font-bold text-orange-600">
										{usedFeatureColumns.length > 0
											? usedFeatureColumns.length
											: getTrainingData().featureColumns.length}
									</div>
									<div className="text-xs text-gray-600 mt-1">Features</div>
								</div>
							</div>

							{/* Random Forest specific metrics */}
							{selectedModelType === 'random-forest' &&
								Object.keys(featureImportance).length > 0 && (
									<div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
										<h5 className="text-sm font-medium text-green-800 mb-2">
											Top Feature Importance
										</h5>
										<div className="space-y-1">
											{Object.entries(featureImportance)
												.sort(([, a], [, b]) => b - a)
												.slice(0, 3)
												.map(([feature, importance]) => (
													<div
														key={feature}
														className="flex justify-between text-xs text-green-700"
													>
														<span>{feature}</span>
														<span className="font-medium">
															{(importance * 100).toFixed(1)}%
														</span>
													</div>
												))}
										</div>
									</div>
								)}

							{droppedFeatureColumns.length > 0 && (
								<div className="mt-4 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
									Dropped non-numeric features automatically:{' '}
									{droppedFeatureColumns.join(', ')}. (Current model only
									supports numeric inputs.)
								</div>
							)}
							{exportStatus && (
								<div className="mt-4 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
									{exportStatus}
								</div>
							)}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Random Forest Interactive Training Visualization */}
			{selectedModelType === 'random-forest' &&
				(rfTreeProgress.length > 0 || isTraining) && (
					<div className="space-y-6">
						<RandomForestVisualization />

						{/* Random Forest Training Curves */}
						{(rfAccuracyHistory.length > 0 || rfOobHistory.length > 0) && (
							<Card>
								<CardTitle>Random Forest Training Curves</CardTitle>
								<CardContent>
									<p className="text-sm mb-4">
										Out-of-bag (OOB) accuracy and training progression across
										trees.
									</p>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
										{/* OOB Score Curve */}
										{rfOobHistory.length > 0 && (
											<div className="bg-white border rounded-lg p-4">
												<h4 className="font-medium mb-2 text-sm">
													OOB Score Evolution
												</h4>
												<Sparklines
													data={rfOobHistory.map((score) => score * 100)}
													color="#16a34a"
													label="OOB Score"
													suffix="%"
												/>
											</div>
										)}

										{/* Accuracy Estimate Curve */}
										{rfAccuracyHistory.length > 0 && (
											<div className="bg-white border rounded-lg p-4">
												<h4 className="font-medium mb-2 text-sm">
													Training Accuracy Estimate
												</h4>
												<Sparklines
													data={rfAccuracyHistory.map((acc) => acc * 100)}
													color="#2563eb"
													label="Accuracy"
													suffix="%"
												/>
											</div>
										)}
									</div>

									{/* Additional RF Metrics */}
									<div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
										<div className="bg-green-50 rounded-lg p-3">
											<div className="text-lg font-bold text-green-600">
												{rfTreeProgress.filter((t) => t.completed).length}
											</div>
											<div className="text-xs text-gray-600 mt-1">
												Trees Completed
											</div>
										</div>
										<div className="bg-blue-50 rounded-lg p-3">
											<div className="text-lg font-bold text-blue-600">
												{rfOobHistory.length > 0
													? (Math.max(...rfOobHistory) * 100).toFixed(1) + '%'
													: 'N/A'}
											</div>
											<div className="text-xs text-gray-600 mt-1">
												Best OOB Score
											</div>
										</div>
										<div className="bg-purple-50 rounded-lg p-3">
											<div className="text-lg font-bold text-purple-600">
												{Object.keys(featureImportance).length || 'N/A'}
											</div>
											<div className="text-xs text-gray-600 mt-1">
												Features Used
											</div>
										</div>
										<div className="bg-orange-50 rounded-lg p-3">
											<div className="text-lg font-bold text-orange-600">
												{rfOobHistory.length > 0
													? (
															rfOobHistory[rfOobHistory.length - 1] * 100
													  ).toFixed(1) + '%'
													: 'N/A'}
											</div>
											<div className="text-xs text-gray-600 mt-1">
												Latest OOB
											</div>
										</div>
									</div>
								</CardContent>
							</Card>
						)}
					</div>
				)}

			{/* Training Visualization Card */}
			{selectedModelType === 'neural-network' &&
				trainingProgress.length > 0 && (
					<Card>
						<CardTitle>Training Visualization</CardTitle>
						<CardContent>
							<p className="text-sm mb-4">
								Loss and accuracy evolution across epochs.
							</p>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								{/* Loss sparkline */}
								<div className="bg-white border rounded-lg p-4">
									<h4 className="font-medium mb-2 text-sm">Loss Curve</h4>
									<Sparklines
										data={trainingProgress.map((p) =>
											typeof p.loss === 'number' ? p.loss : Number(p.loss) || 0,
										)}
										color="#2563eb"
										label="Loss"
									/>
								</div>
								{/* Accuracy sparkline */}
								<div className="bg-white border rounded-lg p-4">
									<h4 className="font-medium mb-2 text-sm">Accuracy Curve</h4>
									<Sparklines
										data={trainingProgress.map((p) => {
											const acc =
												typeof p.accuracy === 'number'
													? p.accuracy
													: Number(p.accuracy);
											return (acc || 0) * 100;
										})}
										color="#16a34a"
										suffix="%"
										label="Accuracy"
									/>
								</div>
							</div>
						</CardContent>
					</Card>
				)}

			{/* Test & Export button - only appears after model is trained */}
			{modelMetrics && (
				<div className="fixed bottom-6 right-6 z-40">
					<Link
						href="/dashboard/classroom/test-export"
						className="px-5 py-3 rounded-lg border-2 border-black bg-black text-white hover:bg-gray-800 active:translate-y-px active:translate-x-px transition-all text-sm font-semibold inline-block"
					>
						Go to Test & Export
					</Link>
				</div>
			)}
		</div>
	);
}
