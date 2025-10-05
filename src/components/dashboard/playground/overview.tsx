'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardTitle, CardContent } from '../../ui/Card';
import Link from 'next/link';
import { ActionButton } from '../../ui/ActionButton';

// Types
type ModelMetric = {
	label: string;
	value: number;
	format?: (v: number) => string;
	higherIsBetter?: boolean; // for potential future coloring
};

type ModelParameters = Record<string, string | number>;

interface PlaygroundModel {
	id: string;
	name: string;
	short: string; // short label for toggle chip
	description: string[]; // paragraphs
	architecturePlaceholders: { label: string }[]; // placeholder tiles (diagrams, curves, etc.)
	metrics: ModelMetric[];
	parameters: ModelParameters;
	comparisonBaseline?: string;
	comparisonMetrics?: { label: string; model: number; baseline: number }[];
}

// Static demo data (replace with API fetch later). Kept outside component for SSR friendliness.
const MODELS: PlaygroundModel[] = [
	{
		id: 'cnn',
		name: 'CNN',
		short: 'CNN',
		description: [
			'A standard Convolutional Neural Network (CNN) for time series classification. Suitable for baseline performance on light curve data.',
			'Uses stacked 1D convolutional layers with ReLU activations and max pooling. Trained with cross-entropy loss and Adam optimizer.',
		],
		architecturePlaceholders: [
			{ label: 'CNN Architecture' },
			{ label: 'Training Curve' },
		],
		metrics: [
			{ label: 'Accuracy', value: 0.91 },
			{ label: 'Recall', value: 0.88 },
			{ label: 'Precision', value: 0.89 },
			{ label: 'F1 Score', value: 0.885 },
			{ label: 'AUC', value: 0.92 },
			{ label: 'Latency (ms)', value: 10.2, higherIsBetter: false },
		],
		parameters: {
			'Learning Rate': '1e-3',
			Optimizer: 'Adam',
			Epochs: 30,
			Batch: 128,
			Dropout: '0.15',
			Layers: 10,
		},
		comparisonBaseline: 'CNN-SMOTE',
		comparisonMetrics: [
			{ label: 'Accuracy', model: 0.91, baseline: 0.93 },
			{ label: 'Recall', model: 0.88, baseline: 0.92 },
			{ label: 'Precision', model: 0.89, baseline: 0.91 },
			{ label: 'F1', model: 0.885, baseline: 0.915 },
			{ label: 'AUC', model: 0.92, baseline: 0.94 },
		],
	},
	{
		id: 'cnn-smote',
		name: 'CNN-SMOTE',
		short: 'CNN-SMOTE',
		description: [
			'A CNN model trained with SMOTE (Synthetic Minority Over-sampling Technique) to address class imbalance in exoplanet transit detection.',
			'SMOTE generates synthetic samples for the minority class, improving recall and overall robustness.',
		],
		architecturePlaceholders: [
			{ label: 'CNN-SMOTE Architecture' },
			{ label: 'SMOTE Visualization' },
		],
		metrics: [
			{ label: 'Accuracy', value: 0.93 },
			{ label: 'Recall', value: 0.92 },
			{ label: 'Precision', value: 0.91 },
			{ label: 'F1 Score', value: 0.915 },
			{ label: 'AUC', value: 0.94 },
			{ label: 'Latency (ms)', value: 11.5, higherIsBetter: false },
		],
		parameters: {
			'Learning Rate': '1e-3',
			Optimizer: 'Adam',
			Epochs: 30,
			Batch: 128,
			Dropout: '0.15',
			Layers: 10,
		},
		comparisonBaseline: 'CNN',
		comparisonMetrics: [
			{ label: 'Accuracy', model: 0.93, baseline: 0.91 },
			{ label: 'Recall', model: 0.92, baseline: 0.88 },
			{ label: 'Precision', model: 0.91, baseline: 0.89 },
			{ label: 'F1', model: 0.915, baseline: 0.885 },
			{ label: 'AUC', model: 0.94, baseline: 0.92 },
		],
	},
];

const numberFormat = (v: number) => (v < 1 ? v.toFixed(4) : v.toFixed(2));

export default function OverviewTab() {
	const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
	const model = useMemo(
		() =>
			selectedModelId ? MODELS.find((m) => m.id === selectedModelId) : null,
		[selectedModelId],
	);

	// Save selected model to localStorage with deselection support
	const handleModelSelect = (modelId: string) => {
		if (selectedModelId === modelId) {
			// Deselect if clicking the same model
			setSelectedModelId(null);
			localStorage.removeItem('selectedModel');
			// Trigger storage event for real-time updates
			window.dispatchEvent(
				new StorageEvent('storage', {
					key: 'selectedModel',
					newValue: null,
					oldValue: localStorage.getItem('selectedModel'),
					storageArea: localStorage,
				}),
			);
		} else {
			// Select new model
			setSelectedModelId(modelId);
			const selectedModel = MODELS.find((m) => m.id === modelId);
			if (selectedModel) {
				const modelData = JSON.stringify({
					id: selectedModel.id,
					name: selectedModel.name,
					short: selectedModel.short,
				});
				localStorage.setItem('selectedModel', modelData);
				// Trigger storage event for real-time updates
				window.dispatchEvent(
					new StorageEvent('storage', {
						key: 'selectedModel',
						newValue: modelData,
						oldValue: null,
						storageArea: localStorage,
					}),
				);
			}
		}
	};

	// Clear localStorage and load selected model from localStorage on mount
	React.useEffect(() => {
		// Clear any existing selections on app start
		const isInitialLoad = !sessionStorage.getItem('appInitialized');
		if (isInitialLoad) {
			localStorage.removeItem('selectedModel');
			sessionStorage.setItem('appInitialized', 'true');
			return;
		}

		const savedModel = localStorage.getItem('selectedModel');
		if (savedModel) {
			try {
				const parsed = JSON.parse(savedModel);
				const foundModel = MODELS.find((m) => m.id === parsed.id);
				if (foundModel) {
					setSelectedModelId(foundModel.id);
				}
			} catch (e) {
				// Ignore parsing errors
			}
		}
	}, []);

	return (
		<div className="w-full">
			{/* Model Selection */}
			<Card className="mb-3">
				<div className="flex flex-col gap-3">
					<div className="flex items-center justify-between gap-4 flex-wrap">
						<CardTitle className="ml-3 !mb-0 flex items-center self-center leading-none">
							Model Selection
						</CardTitle>
						<div className="flex flex-wrap gap-2">
							{MODELS.map((m) => {
								const active = m.id === selectedModelId;
								return (
									<button
										key={m.id}
										onClick={() => handleModelSelect(m.id)}
										className={`px-3 py-2 text-sm rounded-md border transition-colors font-medium ${
											active
												? 'bg-black text-white border-black'
												: 'bg-[var(--input-background)] border-[var(--input-border)] hover:bg-[var(--hover-background)]'
										}`}
										aria-pressed={active}
									>
										{m.short}
										<span
											className={`ml-1 text-[11px] ${
												active
													? 'text-gray-300'
													: 'text-[var(--text-secondary)]'
											}`}
										>
											{m.name}
										</span>
									</button>
								);
							})}
						</div>
					</div>
				</div>
			</Card>

			{/* Main grid layout */}
			{model ? (
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
					{/* Left Column - Architecture */}
					<div className="lg:col-span-6">
						<Card className="h-full flex flex-col">
							<CardTitle>
								Model Architecture ·{' '}
								<span className="text-sm font-normal text-[var(--text-secondary)]">
									{model.name}
								</span>
							</CardTitle>
							<CardContent className="flex-1 flex flex-col">
								{model.description.map((p, idx) => (
									<p
										key={idx}
										className={`text-left ${
											idx < model.description.length - 1 ? 'mb-3' : 'mb-4'
										}`}
									>
										{p}
									</p>
								))}
								<div className="mt-auto grid grid-cols-2 gap-4">
									{model.architecturePlaceholders.map((ph) => (
										<div
											key={ph.label}
											className="bg-[var(--placeholder-color)] aspect-square flex items-center justify-center rounded-lg border border-[var(--input-border)] text-center px-2"
										>
											<span className="text-sm text-[var(--text-secondary)] leading-tight">
												{ph.label}
											</span>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Right Column - Metrics & Comparison */}
					<div className="lg:col-span-6 flex flex-col gap-4">
						{/* Performance Metrics & Hyperparameters */}
						<Card>
							<CardTitle>Performance Metrics & Best Parameters</CardTitle>
							<CardContent>
								<div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
									{model.metrics.map((metric) => (
										<div
											key={metric.label}
											className="rounded-md border border-[var(--input-border)] bg-[var(--input-background)] p-3 flex flex-col"
										>
											<span className="text-[11px] uppercase tracking-wide text-[var(--text-secondary)] mb-1">
												{metric.label}
											</span>
											<span className="text-base font-semibold">
												{metric.format
													? metric.format(metric.value)
													: numberFormat(metric.value)}
											</span>
										</div>
									))}
								</div>
								<div className="grid md:grid-cols-12 gap-4 items-start">
									<div className="md:col-span-6">
										<h4 className="text-sm font-semibold mb-3">
											Tuned Hyperparameters
										</h4>
										<ul className="text-sm space-y-2">
											{Object.entries(model.parameters).map(([k, v]) => (
												<li key={k} className="flex justify-between gap-4">
													<span className="text-[var(--text-secondary)]">
														{k}
													</span>
													<span className="font-medium">{v}</span>
												</li>
											))}
										</ul>
									</div>
									<div className="md:col-span-6">
										<div className="bg-[var(--placeholder-color)] h-full min-h-[180px] rounded-md border border-[var(--input-border)] flex items-center justify-center text-sm text-[var(--text-secondary)]">
											Training / Validation Curves
										</div>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Metrics Comparison */}
						<Card className="relative">
							<CardTitle>Metrics Comparison</CardTitle>
							<CardContent>
								<p className="mb-4 text-sm text-left text-[var(--text-secondary)]">
									Comparison of{' '}
									<span className="font-medium text-black">{model.short}</span>{' '}
									vs{' '}
									<span className="font-medium text-black">
										{model.comparisonBaseline}
									</span>{' '}
									across core evaluation metrics.
								</p>

								<div className="mt-8 bg-[var(--placeholder-color)] min-h-[160px] rounded-md border border-[var(--input-border)] flex items-center justify-center text-sm text-[var(--text-secondary)]">
									Additional Graph (Scatter / ROC / PR Curve Placeholder)
								</div>

								<div className="fixed bottom-8 right-8 z-20">
									<ActionButton
										href={
											model ? '/dashboard/playground/data-input' : undefined
										}
										ariaLabel={
											model ? 'Go to Data Input' : 'Select a model first'
										}
										icon={model ? 'arrow-right' : 'none'}
										disabled={!model}
									>
										{model ? 'Input Data' : 'Select Model First'}
									</ActionButton>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			) : (
				<Card>
					<CardContent className="py-12">
						<div className="text-center">
							<p className="text-lg text-[var(--text-secondary)]">
								Select a model above to view its details and performance
								metrics.
							</p>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
