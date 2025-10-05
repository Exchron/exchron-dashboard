'use client';

import React, { useState, useCallback, ReactNode, useEffect } from 'react';
import { Card, CardTitle, CardContent } from '../../ui/Card';
import Link from 'next/link';

// Types
interface TestResult {
	accuracy: number;
	f1Score: number;
	precision: number;
	recall: number;
}

type DatasetOption = 'reserved' | 'benchmark' | 'custom';

// Constants for reuse
const BUTTON_BASE_CLASSES =
	'rounded-lg py-2.5 px-4 text-sm font-medium w-full flex justify-center items-center gap-2';
const PRIMARY_BUTTON_CLASSES = `bg-black text-white ${BUTTON_BASE_CLASSES}`;
const SECONDARY_BUTTON_CLASSES = `border border-black ${BUTTON_BASE_CLASSES}`;

// SVG Icons as components for reuse
const CheckmarkIcon = () => (
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
);

const DownloadIcon = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		className="h-5 w-5"
		viewBox="0 0 20 20"
		fill="currentColor"
	>
		<path
			fillRule="evenodd"
			d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
			clipRule="evenodd"
		/>
	</svg>
);

const ExportIcon = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		className="h-5 w-5"
		viewBox="0 0 20 20"
		fill="currentColor"
	>
		<path d="M3 12v3a1 1 0 001 1h12a1 1 0 001-1v-3a1 1 0 00-1-1H4a1 1 0 00-1 1z" />
		<path d="M3 7v3a1 1 0 001 1h12a1 1 0 001-1V7a1 1 0 00-1-1H4a1 1 0 00-1 1z" />
	</svg>
);

const ProjectIcon = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		className="h-5 w-5"
		viewBox="0 0 20 20"
		fill="currentColor"
	>
		<path
			fillRule="evenodd"
			d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
			clipRule="evenodd"
		/>
	</svg>
);

const SpinnerIcon = () => (
	<svg
		className="animate-spin h-10 w-10 text-black mb-4"
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
		viewBox="0 0 24 24"
	>
		<circle
			className="opacity-25"
			cx="12"
			cy="12"
			r="10"
			stroke="currentColor"
			strokeWidth="4"
		></circle>
		<path
			className="opacity-75"
			fill="currentColor"
			d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
		></path>
	</svg>
);

const QuestionIcon = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		className="h-16 w-16 text-gray-300 mb-4 mx-auto"
		viewBox="0 0 20 20"
		fill="currentColor"
	>
		<path
			fillRule="evenodd"
			d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
			clipRule="evenodd"
		/>
	</svg>
);

export default function ClassroomTestExportTab() {
	// State with better typing
	const [testResults, setTestResults] = useState<TestResult | null>(null);
	const [isTesting, setIsTesting] = useState(false);
	const [selectedDataset, setSelectedDataset] =
		useState<DatasetOption>('reserved');
	const [exportedModels, setExportedModels] = useState<any[]>([]);
	const [loadingModels, setLoadingModels] = useState(true);

	// Load exported models on component mount
	useEffect(() => {
		const loadExportedModels = async () => {
			try {
				const response = await fetch('/api/export');
				if (response.ok) {
					const data = await response.json();
					setExportedModels(data.models || []);
				}
			} catch (error) {
				console.error('Failed to load exported models:', error);
			} finally {
				setLoadingModels(false);
			}
		};

		loadExportedModels();
	}, []);

	// Simulate running tests on the model - memoized with useCallback
	const handleRunTests = useCallback(() => {
		setIsTesting(true);
		setTestResults(null);

		// Simulate test processing
		setTimeout(() => {
			setIsTesting(false);
			setTestResults({
				accuracy: 0.915,
				f1Score: 0.903,
				precision: 0.892,
				recall: 0.915,
			});
		}, 2000);
	}, []);

	// Simulate exporting the model - memoized with useCallback
	const handleExportModel = useCallback(() => {
		// Create fake model file for download
		const modelContent = JSON.stringify(
			{
				model_type: 'exoplanet_classifier',
				created_at: new Date().toISOString(),
				accuracy: testResults?.accuracy || 0,
				parameters: {
					layers: [128, 64, 32],
					activation: 'relu',
				},
			},
			null,
			2,
		);

		// Create download link
		const blob = new Blob([modelContent], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'exchron_model.json';
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}, [testResults]);
	// Component for workflow step
	const WorkflowStep = ({
		step,
		isActive,
		isCompleted,
		label,
	}: {
		step: number;
		isActive: boolean;
		isCompleted: boolean;
		label: string;
	}) => (
		<div className="flex items-center">
			<div
				className={`w-8 h-8 rounded-full flex items-center justify-center ${
					isActive || isCompleted
						? 'bg-black text-white'
						: 'bg-[#E6E7E9] text-gray-500'
				}`}
			>
				{isCompleted ? (
					<CheckmarkIcon />
				) : (
					<span className="text-sm font-bold">{step}</span>
				)}
			</div>
			<span
				className={`ml-2 text-sm font-medium ${
					isActive ? '' : 'text-gray-500'
				}`}
			>
				{label}
			</span>
		</div>
	);

	// Component for metric card
	const MetricCard = ({
		label,
		value,
	}: {
		label: string;
		value: string | number;
	}) => (
		<div className="border rounded-lg p-4">
			<h4 className="text-sm font-medium mb-1">{label}</h4>
			<p className="text-2xl font-bold">{value}</p>
		</div>
	);

	// Component for dataset option
	const DatasetOption = ({
		id,
		label,
		description,
		isSelected,
		onSelect,
	}: {
		id: string;
		label: string;
		description: string;
		isSelected: boolean;
		onSelect: () => void;
	}) => (
		<div className="border rounded-lg p-4">
			<div className="flex items-center">
				<input
					type="radio"
					id={id}
					name="test-dataset"
					className="mr-2"
					checked={isSelected}
					onChange={onSelect}
				/>
				<label htmlFor={id} className="font-medium">
					{label}
				</label>
			</div>
			<p className="text-sm mt-2 ml-5">{description}</p>
		</div>
	);

	// Export button component
	const ExportButton = ({
		onClick,
		icon,
		label,
		isPrimary = false,
	}: {
		onClick?: () => void;
		icon: ReactNode;
		label: string;
		isPrimary?: boolean;
	}) => (
		<button
			onClick={onClick}
			className={isPrimary ? PRIMARY_BUTTON_CLASSES : SECONDARY_BUTTON_CLASSES}
		>
			{icon}
			{label}
		</button>
	);

	return (
		<div className="grid grid-cols-1 gap-6">
			{/* Workflow Navigation */}
			<div className="flex items-center justify-center w-full mb-2">
				<div className="flex items-center space-x-2 md:space-x-4 bg-white px-6 py-3 rounded-xl shadow-sm">
					<WorkflowStep
						step={1}
						isActive={false}
						isCompleted={true}
						label="Data Input"
					/>
					<div className="w-8 h-0.5 bg-black"></div>
					<WorkflowStep
						step={2}
						isActive={false}
						isCompleted={true}
						label="Model Selection"
					/>
					<div className="w-8 h-0.5 bg-black"></div>
					<WorkflowStep
						step={3}
						isActive={false}
						isCompleted={true}
						label="Train & Validate"
					/>
					<div className="w-8 h-0.5 bg-black"></div>
					<WorkflowStep
						step={4}
						isActive={true}
						isCompleted={false}
						label="Test & Export"
					/>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
				{/* Test Dataset Selection */}
				<div className="lg:col-span-6">
					<Card>
						<CardTitle>Test Dataset</CardTitle>
						<CardContent>
							<p className="text-sm mb-4">
								Select a test dataset to evaluate your model's performance on
								unseen data. This step is crucial to understand how well your
								model will perform in real-world scenarios.
							</p>

							<div className="space-y-4 mt-6">
								<DatasetOption
									id="test-dataset-1"
									label="Reserved Test Data (20% of original dataset)"
									description="This is 20% of your original data that was automatically set aside during training."
									isSelected={selectedDataset === 'reserved'}
									onSelect={() => setSelectedDataset('reserved')}
								/>

								<DatasetOption
									id="test-dataset-2"
									label="Official Benchmark Dataset"
									description="A standardized dataset with verified labels, used to compare model performance."
									isSelected={selectedDataset === 'benchmark'}
									onSelect={() => setSelectedDataset('benchmark')}
								/>

								<DatasetOption
									id="test-dataset-3"
									label="Upload Custom Test Data"
									description=""
									isSelected={selectedDataset === 'custom'}
									onSelect={() => setSelectedDataset('custom')}
								/>

								{selectedDataset === 'custom' && (
									<div className="mt-3 ml-5">
										<button className="bg-[#f9f9f9] border border-[#afafaf] rounded-lg py-2 px-4 text-sm">
											Choose File
										</button>
										<p className="text-sm mt-2">No file selected</p>
									</div>
								)}

								{/* Run Test button */}
								<button
									onClick={handleRunTests}
									disabled={isTesting}
									className={`w-full py-3 mt-4 rounded-lg font-semibold ${
										isTesting
											? 'bg-gray-300 text-gray-600 cursor-not-allowed'
											: 'bg-black text-white hover:bg-gray-800'
									}`}
								>
									{isTesting ? 'Running Tests...' : 'Run Model Test'}
								</button>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Test Results */}
				<div className="lg:col-span-6">
					<Card>
						<CardTitle>Test Results</CardTitle>
						<CardContent>
							<p className="text-sm mb-4">
								These metrics show how well your model performs on data it
								hasn't seen during training.
							</p>

							{testResults ? (
								<div className="space-y-6 mt-6">
									{/* Performance metrics */}
									<div className="grid grid-cols-2 gap-4">
										<MetricCard
											label="Accuracy"
											value={`${(testResults.accuracy * 100).toFixed(1)}%`}
										/>
										<MetricCard
											label="F1 Score"
											value={testResults.f1Score.toFixed(3)}
										/>
										<MetricCard
											label="Precision"
											value={testResults.precision.toFixed(3)}
										/>
										<MetricCard
											label="Recall"
											value={testResults.recall.toFixed(3)}
										/>
									</div>

									{/* Confusion matrix placeholder */}
									<div className="bg-[#D9D9D9] h-[200px] flex items-center justify-center">
										<p className="text-gray-600">Confusion Matrix</p>
									</div>

									{/* Export options */}
									<div className="bg-[#F9F9F9] rounded-lg p-5 space-y-4">
										<h3 className="font-semibold">Export Options</h3>

										<div className="space-y-2">
											<ExportButton
												onClick={handleExportModel}
												icon={<DownloadIcon />}
												label="Download Model (.json)"
												isPrimary={true}
											/>

											<ExportButton
												icon={<ExportIcon />}
												label="Export Test Results (.csv)"
											/>

											<ExportButton
												icon={<ProjectIcon />}
												label="Export Full Project"
											/>
										</div>
									</div>
								</div>
							) : (
								<div className="flex flex-col items-center justify-center py-20">
									{isTesting ? (
										<div className="flex flex-col items-center">
											<SpinnerIcon />
											<p className="text-lg">Testing your model...</p>
										</div>
									) : (
										<div className="text-center">
											<QuestionIcon />
											<p className="text-lg font-medium">No test results yet</p>
											<p className="text-sm mt-2">
												Run a test on your model to see performance metrics.
											</p>
										</div>
									)}
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Exported Models Section */}
			<div className="grid grid-cols-1 gap-6">
				<Card>
					<CardTitle>Exported Neural Network Models</CardTitle>
					<CardContent>
						<p className="text-sm mb-4">
							View and manage your trained neural network models. These models
							can be downloaded and used in other applications.
						</p>

						{loadingModels ? (
							<div className="flex items-center justify-center py-8">
								<SpinnerIcon />
								<span className="ml-2">Loading exported models...</span>
							</div>
						) : exportedModels.length > 0 ? (
							<div className="space-y-4">
								{exportedModels.map((model, index) => (
									<div key={index} className="border rounded-lg p-4 bg-gray-50">
										<div className="flex items-start justify-between">
											<div className="flex-1">
												<h4 className="font-medium text-lg">{model.name}</h4>
												<p className="text-sm text-gray-600 mt-1">
													Exported:{' '}
													{new Date(model.exportedAt).toLocaleDateString()} at{' '}
													{new Date(model.exportedAt).toLocaleTimeString()}
												</p>

												{model.metadata && (
													<div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
														<div>
															<span className="font-medium">Target:</span>
															<div className="text-gray-600">
																{model.metadata.targetColumn}
															</div>
														</div>
														<div>
															<span className="font-medium">Features:</span>
															<div className="text-gray-600">
																{model.metadata.featureColumns?.length || 0}
															</div>
														</div>
														<div>
															<span className="font-medium">Accuracy:</span>
															<div className="text-gray-600">
																{model.metadata.trainingSummary?.finalAccuracy
																	? `${(
																			model.metadata.trainingSummary
																				.finalAccuracy * 100
																	  ).toFixed(1)}%`
																	: 'N/A'}
															</div>
														</div>
														<div>
															<span className="font-medium">Epochs:</span>
															<div className="text-gray-600">
																{model.metadata.trainingSummary?.epochs ||
																	'N/A'}
															</div>
														</div>
													</div>
												)}

												<div className="mt-3 flex flex-wrap gap-2">
													{model.files?.map(
														(file: string, fileIndex: number) => (
															<span
																key={fileIndex}
																className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
															>
																{file}
															</span>
														),
													)}
												</div>
											</div>

											<div className="ml-4 flex flex-col space-y-2">
												<button className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
													Download Model
												</button>
												<button className="text-sm px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">
													View Details
												</button>
											</div>
										</div>
									</div>
								))}
							</div>
						) : (
							<div className="text-center py-8">
								<QuestionIcon />
								<p className="text-lg font-medium">No exported models yet</p>
								<p className="text-sm text-gray-600 mt-2">
									Train and export a model from the Train & Validate tab to see
									it here.
								</p>
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Navigation Buttons */}
			<div className="flex justify-between">
				{/* Start Over Button */}
				<div className="fixed bottom-8 left-8 z-10">
					<Link
						href="/dashboard/classroom/data-input"
						className="bg-white border border-black text-black rounded-xl py-4 px-8 font-semibold text-xl flex items-center shadow-lg"
					>
						<svg
							className="w-7 h-7 mr-2"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								fillRule="evenodd"
								d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z"
								clipRule="evenodd"
							/>
						</svg>
						Start Over
					</Link>
				</div>

				{/* New Project Button */}
				<div className="fixed bottom-8 right-8 z-10">
					<Link
						href="/dashboard"
						className="bg-black text-white rounded-xl py-4 px-8 font-semibold text-xl flex items-center shadow-lg"
					>
						New Project
						<svg
							className="w-7 h-7 ml-2"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								fillRule="evenodd"
								d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
								clipRule="evenodd"
							/>
						</svg>
					</Link>
				</div>
			</div>
		</div>
	);
}
