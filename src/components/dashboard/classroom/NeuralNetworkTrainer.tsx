'use client';

import React, { useState, useEffect, useRef } from 'react';
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
}

export default function NeuralNetworkTrainer() {
	const [classroomState] = useClassroomStore();
	const [isTraining, setIsTraining] = useState(false);
	const [trainingProgress, setTrainingProgress] = useState<TrainingProgress[]>(
		[],
	);
	const [currentEpoch, setCurrentEpoch] = useState(0);
	const [modelConfig, setModelConfig] = useState<ModelConfig>({
		hiddenLayers: [64, 32],
		learningRate: 0.001,
		epochs: 50,
		batchSize: 32,
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

	// Get training data from classroom store
	const getTrainingData = () => {
		const { dataInput } = classroomState;
		const { selectedDataSource, targetColumn, selectedFeatures, rawDataset } =
			dataInput;

		// Determine filename based on data source
		let fileName = '';
		switch (selectedDataSource) {
			case 'kepler':
				fileName = 'KOI-Classroom-Data.csv';
				break;
			case 'k2':
				fileName = 'K2-Classroom-Data.csv';
				break;
			case 'tess':
				fileName = 'TESS-Classroom-Data.csv';
				break;
			case 'own':
				// For uploaded files, we'll use the rawDataset directly
				fileName = 'uploaded-data.csv';
				break;
			default:
				fileName = 'KOI-Classroom-Data.csv';
		}

		return {
			fileName,
			targetColumn: targetColumn || '',
			featureColumns: selectedFeatures || [],
			rawDataset,
		};
	};

	// Validate training readiness
	const canTrain = () => {
		const { fileName, targetColumn, featureColumns } = getTrainingData();
		return fileName && targetColumn && featureColumns.length > 0;
	};

	// Start training process
	const startTraining = async () => {
		if (!canTrain()) {
			setErrorMessage(
				'Please select a dataset, target column, and features before training.',
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

			// Get CSV content
			let csvContent = '';
			if (rawDataset?.originalCSV) {
				csvContent = rawDataset.originalCSV;
			} else {
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
			console.log('Preprocessing data...');
			const { xTrain, yTrain, xVal, yVal, numClasses } =
				await nnService.preprocessData(
					csvContent,
					targetColumn,
					featureColumns,
				);

			console.log('Training data shape:', xTrain.shape);
			console.log('Validation data shape:', xVal.shape);
			console.log('Number of classes:', numClasses);

			// Create model
			const model = nnService.createModel(
				featureColumns.length,
				numClasses,
				modelConfig.hiddenLayers,
				modelConfig.learningRate,
			);

			console.log('Model created:', model.summary);

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
				},
			});

			// Evaluate final model
			const finalMetrics = await nnService.evaluateModel(xVal, yVal);
			setModelMetrics({
				...finalMetrics,
				trainingSummary: {
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
				},
			});

			setTrainedModel(nnService);

			// Clean up tensors
			xTrain.dispose();
			yTrain.dispose();
			xVal.dispose();
			yVal.dispose();

			console.log('Training completed successfully!');
		} catch (error) {
			console.error('Training error:', error);
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

			// Export model using TensorFlow.js download
			const exportData = await trainedModel.exportModel('neural_network_model');

			// Prepare metadata for server-side storage
			const metadata = {
				...exportData.metadata,
				targetColumn,
				featureColumns,
				modelConfig,
				trainingSummary: modelMetrics?.trainingSummary,
			};

			// Save to server
			const response = await fetch('/api/export', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					modelData: {
						modelTopology: exportData.modelTopology,
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
			setExportStatus(`Model exported successfully to: ${result.exportPath}`);
		} catch (error) {
			console.error('Export error:', error);
			setErrorMessage(
				`Export failed: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`,
			);
			setExportStatus('');
		}
	};

	// Update model configuration
	const updateModelConfig = (updates: Partial<ModelConfig>) => {
		setModelConfig((prev) => ({ ...prev, ...updates }));
	};

	const trainingData = getTrainingData();

	return (
		<div className="space-y-6">
			{/* Training Configuration */}
			<Card>
				<CardTitle>Neural Network Configuration</CardTitle>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{/* Data Summary */}
						<div>
							<h4 className="font-medium mb-3">Training Data Summary</h4>
							<div className="space-y-2 text-sm">
								<div>
									<strong>Dataset:</strong> {trainingData.fileName}
								</div>
								<div>
									<strong>Target Column:</strong>{' '}
									{trainingData.targetColumn || 'Not selected'}
								</div>
								<div>
									<strong>Features:</strong>{' '}
									{trainingData.featureColumns.length} selected
								</div>
								{trainingData.featureColumns.length > 0 && (
									<div className="text-xs text-gray-600 mt-1">
										{trainingData.featureColumns.join(', ')}
									</div>
								)}
							</div>
						</div>

						{/* Model Configuration */}
						<div>
							<h4 className="font-medium mb-3">Model Parameters</h4>
							<div className="space-y-3">
								<div>
									<label className="block text-sm font-medium mb-1">
										Hidden Layers (comma-separated)
									</label>
									<input
										type="text"
										value={modelConfig.hiddenLayers.join(', ')}
										onChange={(e) => {
											const layers = e.target.value
												.split(',')
												.map((n) => parseInt(n.trim()))
												.filter((n) => !isNaN(n));
											updateModelConfig({ hiddenLayers: layers });
										}}
										className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
										placeholder="64, 32"
									/>
								</div>

								<div className="grid grid-cols-2 gap-3">
									<div>
										<label className="block text-sm font-medium mb-1">
											Learning Rate
										</label>
										<input
											type="number"
											step="0.0001"
											min="0.0001"
											max="1"
											value={modelConfig.learningRate}
											onChange={(e) =>
												updateModelConfig({
													learningRate: parseFloat(e.target.value),
												})
											}
											className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium mb-1">
											Batch Size
										</label>
										<input
											type="number"
											min="1"
											max="512"
											value={modelConfig.batchSize}
											onChange={(e) =>
												updateModelConfig({
													batchSize: parseInt(e.target.value),
												})
											}
											className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
										/>
									</div>
								</div>

								<div>
									<label className="block text-sm font-medium mb-1">
										Epochs
									</label>
									<input
										type="number"
										min="1"
										max="1000"
										value={modelConfig.epochs}
										onChange={(e) =>
											updateModelConfig({ epochs: parseInt(e.target.value) })
										}
										className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
									/>
								</div>
							</div>
						</div>
					</div>

					{/* Training Controls */}
					<div className="mt-6 pt-4 border-t border-gray-200">
						<div className="flex items-center justify-between">
							<div>
								{!canTrain() && (
									<p className="text-sm text-red-600">
										Complete data input configuration to enable training
									</p>
								)}
								{errorMessage && (
									<p className="text-sm text-red-600">{errorMessage}</p>
								)}
							</div>

							<div className="flex space-x-3">
								<button
									onClick={startTraining}
									disabled={!canTrain() || isTraining}
									className={`px-6 py-2 rounded-lg font-medium ${
										canTrain() && !isTraining
											? 'bg-black text-white hover:bg-gray-800'
											: 'bg-gray-300 text-gray-500 cursor-not-allowed'
									}`}
								>
									{isTraining ? 'Training...' : 'Start Training'}
								</button>

								{trainedModel && (
									<button
										onClick={exportModel}
										className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
									>
										Export Model
									</button>
								)}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Training Progress */}
			{(isTraining || trainingProgress.length > 0) && (
				<Card>
					<CardTitle>Training Progress</CardTitle>
					<CardContent>
						{isTraining && (
							<div className="mb-4">
								<div className="flex items-center justify-between mb-2">
									<span className="text-sm font-medium">
										Epoch {currentEpoch} / {modelConfig.epochs}
									</span>
									<span className="text-sm text-gray-600">
										{Math.round((currentEpoch / modelConfig.epochs) * 100)}%
									</span>
								</div>
								<div className="w-full bg-gray-200 rounded-full h-2">
									<div
										className="bg-black h-2 rounded-full transition-all duration-300"
										style={{
											width: `${(currentEpoch / modelConfig.epochs) * 100}%`,
										}}
									></div>
								</div>
							</div>
						)}

						{trainingProgress.length > 0 && (
							<div className="space-y-3">
								<h4 className="font-medium">Latest Metrics</h4>
								{trainingProgress.slice(-5).map((progress, index) => (
									<div key={index} className="grid grid-cols-4 gap-4 text-sm">
										<div>
											<strong>Epoch {progress.epoch}</strong>
										</div>
										<div>Loss: {progress.loss.toFixed(4)}</div>
										<div>
											Accuracy: {((progress.accuracy || 0) * 100).toFixed(1)}%
										</div>
										<div>
											Val Acc: {((progress.valAccuracy || 0) * 100).toFixed(1)}%
										</div>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			)}

			{/* Model Results */}
			{modelMetrics && (
				<Card>
					<CardTitle>Training Results</CardTitle>
					<CardContent>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							<div className="text-center">
								<div className="text-2xl font-bold text-green-600">
									{(modelMetrics.accuracy * 100).toFixed(1)}%
								</div>
								<div className="text-sm text-gray-600">Final Accuracy</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-bold text-blue-600">
									{modelMetrics.loss.toFixed(4)}
								</div>
								<div className="text-sm text-gray-600">Final Loss</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-bold text-purple-600">
									{modelConfig.epochs}
								</div>
								<div className="text-sm text-gray-600">Epochs</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-bold text-orange-600">
									{trainingData.featureColumns.length}
								</div>
								<div className="text-sm text-gray-600">Features</div>
							</div>
						</div>

						{exportStatus && (
							<div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
								<p className="text-sm text-green-700">{exportStatus}</p>
							</div>
						)}
					</CardContent>
				</Card>
			)}
		</div>
	);
}
