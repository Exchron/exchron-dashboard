'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
	const [classroomState] = useClassroomStore();
	const router = useRouter();
	// Fixed to neural-network only after UI simplification
	const [isTraining, setIsTraining] = useState(false);
	const [trainingProgress, setTrainingProgress] = useState<TrainingProgress[]>(
		[],
	);
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
	const [modelMetrics, setModelMetrics] = useState<any>(null);
	const [exportStatus, setExportStatus] = useState<string>('');
	const [errorMessage, setErrorMessage] = useState<string>('');

	const nnServiceRef = useRef<NeuralNetworkService | null>(null);

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

	// Gather training data references (updated to match store field names)
	const getTrainingData = () => {
		const dataInput = (classroomState as any).dataInput || {};
		const fileSource = dataInput.selectedDataSource; // correct field name
		let fileName = '';
		const targetColumn = dataInput.targetColumn; // correct field name
		const selectedFeatures = dataInput.selectedFeatures;
		const rawDataset = dataInput.rawDataset;

		switch (fileSource) {
			case 'k2':
				fileName = 'K2-Classroom-Data.csv';
				break;
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
			setIsTraining(false);
			setTrainingProgress([]);
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

		setIsTraining(true);
		setTrainingProgress([]);
		setCurrentEpoch(0);
		setErrorMessage('');
		setExportStatus('');

		try {
			const { fileName, targetColumn, featureColumns, rawDataset } =
				getTrainingData();

			// Log the complete training configuration
			console.group('🚀 Neural Network Training Started');
			console.log('📊 Training Data:', {
				fileName,
				targetColumn,
				featureColumns,
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
					featureColumns,
				);

			console.log('📈 Training data shape:', xTrain.shape);
			console.log('📊 Validation data shape:', xVal.shape);
			console.log('🎯 Number of classes:', numClasses);

			// Create model with advanced configuration
			const model = nnService.createModel(
				featureColumns.length,
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

			// Train model with progress tracking
			const history = await nnService.trainModel(xTrain, yTrain, xVal, yVal, {
				epochs: modelConfig.epochs,
				batchSize: modelConfig.batchSize,
				onEpochEnd: (epoch, logs) => {
					setCurrentEpoch(epoch + 1);
					const progress: TrainingProgress = {
						epoch: epoch + 1,
						loss: logs.loss,
						accuracy: logs.acc || logs.accuracy,
						valLoss: logs.val_loss,
						valAccuracy: logs.val_acc || logs.val_accuracy,
					};
					setTrainingProgress((prev) => [...prev, progress]);

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
				datasetInfo: { fileName, targetColumn, featureColumns },
			};

			setModelMetrics({
				...finalMetrics,
				trainingSummary,
			});

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
		} finally {
			setIsTraining(false);
		}
	};

	// Export trained model
	const exportModel = async () => {
		if (!trainedModel || !nnServiceRef.current) {
			setErrorMessage('No trained model to export');
			return;
		}

		setExportStatus('Exporting model...');

		try {
			const { targetColumn, featureColumns } = getTrainingData();

			// Export model using TensorFlow.js format
			const exportData = await trainedModel.exportModel('neural_network_model');

			// Prepare comprehensive metadata
			const metadata = {
				...exportData.metadata,
				targetColumn,
				featureColumns,
				modelConfig,
				trainingSummary: modelMetrics?.trainingSummary,
				exportedAt: new Date().toISOString(),
				modelType: 'neural_network',
				framework: 'tensorflow_js',
			};

			// Save to server in multiple formats
			const response = await fetch('/api/export', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					modelData: {
						modelTopology: exportData.modelTopology,
						modelUrl: exportData.modelUrl,
						modelWeightsUrl: exportData.modelWeightsUrl,
					},
					metadata,
					exportFormat: 'json-tfjs',
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Export failed');
			}

			const result = await response.json();
			setExportStatus(
				`✅ Model exported successfully to: ${result.exportPath}`,
			);

			console.log('📦 Model exported:', {
				path: result.exportPath,
				files: result.files,
				accuracy: (modelMetrics?.accuracy * 100)?.toFixed(1) + '%',
			});
		} catch (error) {
			console.error('❌ Export error:', error);
			setErrorMessage(
				`Export failed: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`,
			);
			setExportStatus('');
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
					Last: {data[data.length - 1].toFixed(2)}
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
						{trainedModel && (
							<button
								onClick={exportModel}
								className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
							>
								Export Model
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
								{trainingProgress.slice(-6).map((p) => (
									<div key={p.epoch} className="grid grid-cols-5 gap-2">
										<span className="font-medium">Ep {p.epoch}</span>
										<span>Loss: {p.loss.toFixed(4)}</span>
										<span>Acc: {((p.accuracy || 0) * 100).toFixed(1)}%</span>
										<span>ValLoss: {p.valLoss?.toFixed(4) ?? '—'}</span>
										<span>
											ValAcc: {((p.valAccuracy || 0) * 100).toFixed(1)}%
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
										{getTrainingData().featureColumns.length}
									</div>
									<div className="text-xs text-gray-600 mt-1">Features</div>
								</div>
							</div>
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
									data={trainingProgress.map((p) => p.loss)}
									color="#2563eb"
									label="Loss"
								/>
							</div>
							{/* Accuracy sparkline */}
							<div className="bg-white border rounded-lg p-4">
								<h4 className="font-medium mb-2 text-sm">Accuracy Curve</h4>
								<Sparklines
									data={trainingProgress.map((p) => (p.accuracy || 0) * 100)}
									color="#16a34a"
									suffix="%"
									label="Accuracy"
								/>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Removed Next (Test & Export) button since workflow ends here */}
		</div>
	);
}
