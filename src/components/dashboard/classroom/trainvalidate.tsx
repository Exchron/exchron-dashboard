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

export default function ClassroomTrainValidateTab() {
	// Use classroom store for persistence
	const [classroomState, classroomStore] = useClassroomStore();
	const router = useRouter();

	// Get training state from store for persistence
	const modelMetrics = classroomState.training.modelMetrics;
	const trainingProgress = classroomState.training.trainingProgress || [];
	const isTraining = classroomState.training.isTraining;

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
	const [trainedModel, setTrainedModel] = useState<NeuralNetworkService | null>(
		null,
	);
	const [exportStatus, setExportStatus] = useState<string>('');
	const [errorMessage, setErrorMessage] = useState<string>('');
	// New: Track sanitized (numeric-only) feature usage
	const [droppedFeatureColumns, setDroppedFeatureColumns] = useState<string[]>(
		[],
	);
	const [usedFeatureColumns, setUsedFeatureColumns] = useState<string[]>([]);

	const nnServiceRef = useRef<NeuralNetworkService | null>(null);
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
		}
	}, [classroomState.modelSelection.hyperparams]);

	// Sync current epoch with training progress from store
	useEffect(() => {
		if (trainingProgress.length > 0) {
			const latestEpoch = Math.max(...trainingProgress.map((p) => p.epoch));
			setCurrentEpoch(latestEpoch);
		}
	}, [trainingProgress]);

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
		setErrorMessage('');
		setExportStatus('');

		try {
			const { fileName, targetColumn, featureColumns, rawDataset, columnMeta } =
				getTrainingData();

			// Sanitize features: Only keep numeric columns (current NN only handles numeric inputs)
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
					'All selected features are non-numeric. Select at least one numeric feature (or encode categorical values) before training.',
				);
				return;
			}

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
			console.log('📁 Raw Dataset Available:', !!rawDataset);
			console.groupEnd();

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
						modelConfig,
					}),
				});

				if (!response.ok) {
					const error = await response.json();
					throw new Error(error.error || 'Failed to load training data');
				}

				const data = await response.json();
				csvContent = data.csvContent;
			}

			// Initialize neural network service
			const nnService = new NeuralNetworkService();
			nnServiceRef.current = nnService;

			// Preprocess data
			console.log('🔄 Preprocessing data...');
			const { xTrain, yTrain, xVal, yVal, numClasses } =
				await nnService.preprocessData(
					csvContent,
					targetColumn,
					numericFeatures,
				);

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
				inputDim: featureColumns.length,
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
			const finalMetrics = await nnService.evaluateModel(xVal, yVal);
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
					history.history.val_accuracy?.[
						history.history.val_accuracy.length - 1
					],
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
			});
			classroomStore.setTrainingStatus(false);
			classroomStore.setHasTrainedModel(true);
			trainingCancelRef.current = null; // Clear cancellation reference

			setTrainedModel(nnService);

			// Clean up tensors
			xTrain.dispose();
			yTrain.dispose();
			xVal.dispose();
			yVal.dispose();

			console.log('✅ Training completed successfully!', {
				finalAccuracy: (finalMetrics.accuracy * 100).toFixed(1) + '%',
				finalLoss: finalMetrics.loss.toFixed(4),
			});
		} catch (error) {
			console.error('❌ Training error:', error);
			setErrorMessage(
				`Training failed: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`,
			);
			classroomStore.setTrainingStatus(false);
			trainingCancelRef.current = null; // Clear cancellation reference
		}
	};

	// Test model using validation split as proxy test set
	const handleTestModel = async () => {
		if (!trainedModel || !nnServiceRef.current || !modelMetrics) return;
		try {
			const { fileName, targetColumn, featureColumns, rawDataset } =
				getTrainingData();
			let csvContent = rawDataset?.originalCSV || '';
			if (!csvContent) {
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
			for (let i = 0; i < trueIdx.length; i++) matrix[trueIdx[i]][predIdx[i]]++;
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
					new Set<number>(scores.slice().sort((a: number, b: number) => b - a)),
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
			router.push('/dashboard/classroom/test-export');
			xTrain.dispose();
			yTrain.dispose();
			xVal.dispose();
			yVal.dispose();
		} catch (e) {
			console.error('Testing failed', e);
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
						Configure (fixed defaults), train the neural network, and view live
						metrics plus final results.
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
					{(isTraining || trainingProgress.length > 0) && (
						<div className="mb-6">
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
						</div>
					)}

					{/* Latest Metrics */}
					{trainingProgress.length > 0 && (
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

					{/* Final Metrics */}
					{modelMetrics && (
						<div className="bg-gray-50 rounded-lg p-4 mb-4">
							<h4 className="font-medium mb-3">Final Metrics</h4>
							<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
								<div>
									<div className="text-xl font-bold text-green-600">
										{(modelMetrics.accuracy * 100).toFixed(1)}%
									</div>
									<div className="text-xs text-gray-600 mt-1">Accuracy</div>
								</div>
								<div>
									<div className="text-xl font-bold text-blue-600">
										{modelMetrics.loss.toFixed(4)}
									</div>
									<div className="text-xs text-gray-600 mt-1">Loss</div>
								</div>
								<div>
									<div className="text-xl font-bold text-purple-600">
										{modelConfig.epochs}
									</div>
									<div className="text-xs text-gray-600 mt-1">Epochs</div>
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

			{/* Training Visualization Card */}
			{trainingProgress.length > 0 && (
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
