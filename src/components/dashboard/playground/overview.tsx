'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardTitle, CardContent } from '../../ui/Card';
import { ActionButton } from '../../ui/ActionButton';
import Image from 'next/image';
import CNN_confusionmatrix from '../../../../assets/CNN/conf_matrix.jpg';
import Historyc from '../../../../assets/CNN/his.jpg';
import LightcurveImg from '../../../../assets/CNN/lightcurve.jpg';
import roc from '../../../../assets/CNN/roc.jpg';
// DNN
import D_conf_data from '../../../../assets/DNN/conf_data.jpg';
import correlationMatrix from '../../../../assets/DNN/correlation_matrix.jpg';
import featureAnalysisImg from '../../../../assets/DNN/feature_analysis.jpg';
import m_data from '../../../../assets/DNN/m_data.jpg';

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
		id: 'exchron-cnn',
		short: 'EXCHRON-CNN',
		description: [
			'EXCHRON_CNN is a convolutional neural network specifically designed for the classification of exoplanet light curves, where identifying weak transit signals among stellar variability and noise is a major challenge. The model is built around stacked 1D convolutional layers that capture short-term flux variations and periodic dips characteristic of planetary transits. To strengthen the learning process, it uses residual-style feature preservation, ensuring that low-level temporal information is not lost as deeper layers refine higher-level representations. This layered approach allows the model to efficiently recognize both subtle and pronounced transit patterns, making it robust across diverse light curve profiles.',
			'To maintain stability and prevent overfitting, EXCHRON_CNN integrates regularization techniques such as dropout and weight constraints, alongside batch-based optimization with Adam. Hyperparameters have been carefully tuned to balance training efficiency and predictive accuracy, including a moderate learning rate, dropout probability, and controlled network depth. Together, these design choices allow the model to achieve strong generalization across unseen data while remaining computationally efficient. The result is a CNN architecture that not only performs well in controlled experiments but also scales effectively for large-scale exoplanet surveys, where thousands of light curves must be analyzed quickly and reliably.',
		],
		architecturePlaceholders: [
			{ label: 'EXCHRON_CNN Architecture' },
			{ label: 'Training Curve' },
		],
		metrics: [
			{ label: 'Accuracy', value: 0.801 },
			{ label: 'Recall', value: 0.711 },
			{ label: 'Precision', value: 0.801 },
			{ label: 'F1 Score', value: 0.801 },
			{ label: 'AUC', value: 0.947 },
			{ label: 'Latency (ms)', value: 10.8, higherIsBetter: false },
		],
		parameters: {
			'Learning Rate': '1e-3',
			Optimizer: 'Adam',
			Epochs: 30,
			Batch: 128,
			Dropout: '0.15',
			Layers: 12,
		},
		comparisonBaseline: 'EXCHRON_DNN',
		comparisonMetrics: [
			{ label: 'Accuracy', model: 0.935, baseline: 0.928 },
			{ label: 'Recall', model: 0.918, baseline: 0.905 },
			{ label: 'Precision', model: 0.922, baseline: 0.926 },
			{ label: 'F1', model: 0.92, baseline: 0.915 },
			{ label: 'AUC', model: 0.947, baseline: 0.939 },
		],
	},
	{
		id: 'exchron-dnn',
		short: 'EXCHRON-DNN',
		description: [
			'EXCHRON_DNN is a dual-input deep neural network designed for robust exoplanet classification by combining both raw time-series signals and engineered astronomical features. The architecture is built with two specialized branches: a time-series branch, powered by 1D convolutional and pooling layers to detect subtle transit-like dips across thousands of flux measurements, and a feature branch, which processes extracted statistical, frequency, variability, and astrophysical parameters derived from the KOI catalog. By integrating these complementary perspectives, the network captures both fine-grained temporal patterns and higher-level contextual information that are crucial for accurate candidate validation.',
			'The two branches are merged into a unified representation, followed by dense layers with dropout and batch normalization to improve generalization and stability during training. This design enables EXCHRON_DNN to achieve a balance between raw signal recognition and interpretability, offering insights into feature importance through methods like SHAP. With its flexible architecture and strong generalization, the model provides reliable classification performance across diverse stellar systems, making it a powerful tool for large-scale exoplanet discovery pipelines.',
		],
		architecturePlaceholders: [
			{ label: 'EXCHRON_DNN Architecture' },
			{ label: 'Training Curve' },
		],
		metrics: [
			{ label: 'Accuracy', value: 0.928 },
			{ label: 'Recall', value: 0.905 },
			{ label: 'Precision', value: 0.926 },
			{ label: 'F1 Score', value: 0.915 },
			{ label: 'AUC', value: 0.939 },
			{ label: 'Latency (ms)', value: 8.6, higherIsBetter: false },
		],
		parameters: {
			'Learning Rate': '8e-4',
			Optimizer: 'Adam',
			Epochs: 35,
			Batch: 256,
			Dropout: '0.20',
			Layers: 8,
		},
		comparisonBaseline: 'EXCHRON_CNN',
		comparisonMetrics: [
			{ label: 'Accuracy', model: 0.928, baseline: 0.935 },
			{ label: 'Recall', model: 0.905, baseline: 0.918 },
			{ label: 'Precision', model: 0.926, baseline: 0.922 },
			{ label: 'F1', model: 0.915, baseline: 0.92 },
			{ label: 'AUC', model: 0.939, baseline: 0.947 },
		],
	},
];

const numberFormat = (v: number) => (v < 1 ? v.toFixed(4) : v.toFixed(2));

export default function OverviewTab() {
	const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
	// Lightbox functionality removed per revert request; images now static.
	const model = useMemo(
		() =>
			selectedModelId ? MODELS.find((m) => m.id === selectedModelId) : null,
		[selectedModelId],
	);
	const handleModelSelect = (id: string) =>
		setSelectedModelId((prev) => (prev === id ? null : id));

	return (
		<div className="w-full">
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
									</button>
								);
							})}
						</div>
					</div>
				</div>
			</Card>

			{model ? (
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
					<div className="lg:col-span-6">
						<Card className="h-full flex flex-col">
							<CardTitle>Model Architecture · </CardTitle>
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
								{/* Architecture Visual Only (intrinsic ratio) */}
								<div className="mt-auto">
									{model.id === 'exchron-cnn' && (
										<figure className="mx-auto max-w-[760px] mb-6 text-center">
											<Image
												src={LightcurveImg}
												alt="EXCHRON_CNN architecture"
												className="w-full h-auto rounded-lg border border-[var(--input-border)]"
												placeholder="blur"
											/>
											<figcaption className="mt-2 text-[11px] uppercase tracking-wide text-[var(--text-secondary)]">
												Architecture
											</figcaption>
										</figure>
									)}
									{model.id === 'exchron-dnn' && (
										<figure className="mx-auto max-w-[760px] mb-6 text-center">
											<Image
												src={featureAnalysisImg}
												alt="EXCHRON_DNN architecture"
												className="w-full h-auto rounded-lg border border-[var(--input-border)]"
												placeholder="blur"
											/>
											<figcaption className="mt-2 text-[11px] uppercase tracking-wide text-[var(--text-secondary)]">
												Feature Branch
											</figcaption>
										</figure>
									)}
								</div>
							</CardContent>
						</Card>
					</div>
					<div className="lg:col-span-6 flex flex-col gap-4">
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
										{model.id === 'exchron-cnn' && (
											<figure
												style={{
													aspectRatio: `${Historyc.width} / ${Historyc.height}`,
												}}
												className="w-full"
											>
												<div className="relative w-full h-full rounded-md border border-[var(--input-border)] overflow-hidden bg-white">
													<Image
														src={Historyc}
														alt="EXCHRON_CNN training / validation curves"
														fill
														className="object-contain"
														placeholder="blur"
														sizes="(max-width: 800px) 100vw, 480px"
													/>
													<span className="absolute bottom-1 left-1 bg-black/60 text-[10px] text-white px-2 py-0.5 rounded">
														Training Curve
													</span>
												</div>
											</figure>
										)}
										{model.id === 'exchron-dnn' && (
											<figure
												style={{
													aspectRatio: `${m_data.width} / ${m_data.height}`,
												}}
												className="w-full"
											>
												<div className="relative w-full h-full rounded-md border border-[var(--input-border)] overflow-hidden bg-white">
													<Image
														src={m_data}
														alt="EXCHRON_DNN training / validation curves"
														fill
														className="object-contain"
														placeholder="blur"
														sizes="(max-width: 800px) 100vw, 480px"
													/>
													<span className="absolute bottom-1 left-1 bg-black/60 text-[10px] text-white px-2 py-0.5 rounded">
														Training Curve
													</span>
												</div>
											</figure>
										)}
										{!['exchron-cnn', 'exchron-dnn'].includes(model.id) && (
											<div className="rounded-md border border-[var(--input-border)] bg-[var(--placeholder-color)] h-[200px] flex items-center justify-center text-sm text-[var(--text-secondary)]">
												Training / Validation Curves
											</div>
										)}
									</div>
								</div>
							</CardContent>
						</Card>
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
								<div className="mt-6 grid grid-cols-2 gap-4">
									{model.id === 'exchron-cnn' && (
										<>
											<figure
												style={{ aspectRatio: `${roc.width} / ${roc.height}` }}
												className="w-full"
											>
												<div className="relative w-full h-full rounded-md border border-[var(--input-border)] overflow-hidden bg-white">
													<Image
														src={roc}
														alt="EXCHRON_CNN ROC Curve"
														fill
														className="object-contain"
														placeholder="blur"
														sizes="(max-width: 900px) 100vw, 420px"
													/>
													<span className="absolute bottom-1 left-1 bg-black/60 text-[10px] text-white px-1.5 py-0.5 rounded">
														ROC Curve
													</span>
												</div>
											</figure>
											<figure
												style={{
													aspectRatio: `${CNN_confusionmatrix.width} / ${CNN_confusionmatrix.height}`,
												}}
												className="w-full"
											>
												<div className="relative w-full h-full rounded-md border border-[var(--input-border)] overflow-hidden bg-white">
													<Image
														src={CNN_confusionmatrix}
														alt="EXCHRON_CNN Confusion Matrix"
														fill
														className="object-contain"
														placeholder="blur"
														sizes="(max-width: 900px) 100vw, 420px"
													/>
													<span className="absolute bottom-1 left-1 bg-black/60 text-[10px] text-white px-1.5 py-0.5 rounded">
														Confusion Matrix
													</span>
												</div>
											</figure>
										</>
									)}
									{model.id === 'exchron-dnn' && (
										<>
											<figure
												style={{
													aspectRatio: `${correlationMatrix.width} / ${correlationMatrix.height}`,
												}}
												className="w-full"
											>
												<div className="relative w-full h-full rounded-md border border-[var(--input-border)] overflow-hidden bg-white">
													<Image
														src={correlationMatrix}
														alt="EXCHRON_DNN Correlation Matrix"
														fill
														className="object-contain"
														placeholder="blur"
														sizes="(max-width: 900px) 100vw, 420px"
													/>
													<span className="absolute bottom-1 left-1 bg-black/60 text-[10px] text-white px-1.5 py-0.5 rounded">
														Correlation Matrix
													</span>
												</div>
											</figure>
											<figure
												style={{
													aspectRatio: `${D_conf_data.width} / ${D_conf_data.height}`,
												}}
												className="w-full"
											>
												<div className="relative w-full h-full rounded-md border border-[var(--input-border)] overflow-hidden bg-white">
													<Image
														src={D_conf_data}
														alt="EXCHRON_DNN Confusion Matrix"
														fill
														className="object-contain"
														placeholder="blur"
														sizes="(max-width: 900px) 100vw, 420px"
													/>
													<span className="absolute bottom-1 left-1 bg-black/60 text-[10px] text-white px-1.5 py-0.5 rounded">
														Confusion Matrix
													</span>
												</div>
											</figure>
										</>
									)}
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
