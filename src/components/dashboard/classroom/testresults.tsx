'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardTitle, CardContent } from '../../ui/Card';
import Link from 'next/link';
import { useClassroomStore } from '../../../lib/ml/state/classroomStore';

// SparkLine (kept for potential future mini-trends; currently unused in UI)
const SparkLine: React.FC<{
	data: number[];
	color?: string;
	suffix?: string;
}> = ({ data, color = '#000', suffix = '' }) => {
	if (!data || data.length < 2)
		return <div className="text-xs text-gray-500">No data</div>;
	const w = 200;
	const h = 50;
	const min = Math.min(...data);
	const max = Math.max(...data);
	const range = max - min || 1;
	const pts = data
		.map((d, i) => {
			const x = (i / (data.length - 1)) * (w - 4) + 2;
			const y = h - ((d - min) / range) * (h - 4) - 2;
			return `${x},${y}`;
		})
		.join(' ');
	return (
		<div>
			<svg width={w} height={h} className="overflow-visible">
				<polyline
					fill="none"
					stroke={color}
					strokeWidth={2}
					points={pts}
					vectorEffect="non-scaling-stroke"
				/>
			</svg>
			<div className="text-xs text-gray-600 mt-1">{suffix}</div>
		</div>
	);
};

// Simple inline curve plot (ROC / PR)
const CurvePlot: React.FC<{
	x: number[];
	y: number[];
	width?: number;
	height?: number;
	color?: string;
	xLabel?: string;
	yLabel?: string;
}> = ({ x, y, width = 220, height = 160, color = '#111', xLabel, yLabel }) => {
	if (!x || !y || x.length < 2 || y.length !== x.length)
		return <div className="text-xs text-gray-500">No curve</div>;
	const minX = Math.min(...x),
		maxX = Math.max(...x);
	const minY = Math.min(...y),
		maxY = Math.max(...y);
	const rX = maxX - minX || 1;
	const rY = maxY - minY || 1;
	const pts = x
		.map((vx, i) => {
			const vy = y[i];
			const px = ((vx - minX) / rX) * (width - 30) + 25;
			const py = height - 25 - ((vy - minY) / rY) * (height - 35);
			return `${px},${py}`;
		})
		.join(' ');
	return (
		<svg
			width={width}
			height={height}
			className="overflow-visible bg-white border rounded"
		>
			<polyline fill="none" stroke={color} strokeWidth={2} points={pts} />
			<line
				x1={25}
				y1={height - 25}
				x2={width - 5}
				y2={height - 25}
				stroke="#999"
				strokeWidth={1}
			/>
			<line
				x1={25}
				y1={height - 25}
				x2={25}
				y2={10}
				stroke="#999"
				strokeWidth={1}
			/>
			{xLabel && (
				<text
					x={width / 2}
					y={height - 5}
					textAnchor="middle"
					fontSize={10}
					fill="#555"
				>
					{xLabel}
				</text>
			)}
			{yLabel && (
				<text
					x={10}
					y={height / 2}
					transform={`rotate(-90 10 ${height / 2})`}
					textAnchor="middle"
					fontSize={10}
					fill="#555"
				>
					{yLabel}
				</text>
			)}
		</svg>
	);
};

export default function ClassroomTestResultsTab() {
	const [state, classroomStore] = useClassroomStore();
	const testMetrics = state.testExport.testMetrics;
	const confusion = state.testExport.confusionMatrix;
	const roc = state.testExport.rocCurve;
	const pr = state.testExport.prCurve;
	const trained = state.training.hasTrainedModel;

	const [overviewCollapsed, setOverviewCollapsed] = useState(false);

	// Export model function
	const handleExportModel = async () => {
		try {
			// Create comprehensive model export data
			const modelData = {
				model_type: 'neural_network_exoplanet_classifier',
				created_at: new Date().toISOString(),
				test_metrics: testMetrics,
				confusion_matrix: confusion,
				roc_curve: roc,
				pr_curve: pr,
				training_completed: trained,
				parameters: {
					architecture: 'neural_network',
					layers: [128, 64, 32],
					activation: 'relu',
					optimizer: 'adam',
				},
			};

			// Create download
			const modelContent = JSON.stringify(modelData, null, 2);
			const blob = new Blob([modelContent], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `exchron_model_${new Date()
				.toISOString()
				.slice(0, 19)
				.replace(/:/g, '-')}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error('Export failed:', error);
		}
	};

	useEffect(() => {
		// placeholder: side-effects/logging if needed
	}, [testMetrics]);

	const confusionHeatmap = useMemo(() => {
		if (!confusion || !confusion.length) return null;
		const n = confusion.length;
		const flat = confusion.flat();
		const max = Math.max(...flat, 1);
		const cell = 46;
		const gridTemplate = `repeat(${n + 1}, ${cell}px)`;
		return (
			<div className="flex flex-col items-center">
				<div className="flex items-start">
					<div
						className="grid relative"
						style={{
							gridTemplateColumns: gridTemplate,
							gridTemplateRows: gridTemplate,
						}}
					>
						<div />
						{Array.from({ length: n }).map((_, col) => (
							<div
								key={`c-label-${col}`}
								className="flex items-center justify-center text-[11px] font-medium text-gray-600 tracking-wide"
							>
								Pred {col}
							</div>
						))}
						{confusion.map((row, r) => (
							<React.Fragment key={`r-${r}`}>
								<div className="flex items-center justify-center text-[11px] font-medium text-gray-600 tracking-wide">
									True {r}
								</div>
								{row.map((val, c) => {
									const intensity = val === 0 ? 0 : 0.15 + 0.85 * (val / max);
									const bg = `rgba(37,99,235,${intensity.toFixed(3)})`;
									const rowTotal = row.reduce((a, b) => a + b, 0) || 1;
									const pct = ((val / rowTotal) * 100).toFixed(1);
									const isDiag = r === c;
									return (
										<div
											key={`cell-${r}-${c}`}
											className={`relative flex items-center justify-center text-[12px] font-semibold border border-white/40 cursor-help select-none transition-transform duration-150 ease-out rounded-sm hover:scale-[1.06] hover:z-10 ${
												isDiag ? 'ring-1 ring-offset-1 ring-black/30' : ''
											}`}
											style={{ backgroundColor: bg, width: cell, height: cell }}
											title={`True ${r} / Pred ${c}: ${val} (${pct}% of row)`}
										>
											<span className="text-white drop-shadow-sm mix-blend-luminosity">
												{val}
											</span>
										</div>
									);
								})}
							</React.Fragment>
						))}
					</div>
					<div className="ml-4 flex flex-col items-center select-none">
						<div className="text-[10px] text-gray-500 mb-1"></div>
						<div className="w-3 h-[calc(100%-28px)] rounded-full bg-gradient-to-b from-[rgba(37,99,235,1)] to-[rgba(37,99,235,0.15)] relative overflow-hidden shadow-inner">
							<div className="absolute inset-0 border border-white/30 rounded-full pointer-events-none" />
						</div>
						<div className="text-[10px] text-gray-500 mt-1"></div>
					</div>
				</div>
				<div className="mt-3 flex items-center gap-2 justify-center">
					<span className="text-[10px] text-gray-500">Low</span>
					<div
						className="h-2 w-32 rounded-full"
						style={{
							background:
								'linear-gradient(to right, rgba(37,99,235,0.15), rgba(37,99,235,1))',
						}}
					/>
					<span className="text-[10px] text-gray-500">High</span>
				</div>
				<p className="text-[11px] text-gray-600 mt-2 tracking-wide font-medium">
					Confusion Matrix Heatmap
				</p>
			</div>
		);
	}, [confusion]);

	return (
		<div className="grid grid-cols-1 gap-6">
			{/* Stepper navigation */}
			<div className="flex items-center justify-center w-full mb-2">
				<div className="flex items-center space-x-2 md:space-x-4 bg-white px-6 py-3 rounded-xl shadow-sm">
					{[
						'Data Input',
						'Model Selection',
						'Train & Validate',
						'Test & Export',
					].map((label, i) => {
						const step = i + 1;
						const active = label === 'Test & Export';
						return (
							<React.Fragment key={label}>
								<div className="flex items-center">
									<div
										className={`w-8 h-8 rounded-full flex items-center justify-center ${
											active || step < 4
												? 'bg-black text-white'
												: 'bg-[#E6E7E9] text-gray-500'
										}`}
									>
										{step < 4 ? (
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
										) : (
											<span className="text-sm font-bold">4</span>
										)}
									</div>
									<span
										className={`ml-2 text-sm font-medium ${
											active ? '' : 'text-gray-500'
										}`}
									>
										{label}
									</span>
								</div>
								{step < 4 && (
									<div
										className={`w-8 h-0.5 ${
											step < 4 ? 'bg-black' : 'bg-[#E6E7E9]'
										}`}
									></div>
								)}
							</React.Fragment>
						);
					})}
				</div>
			</div>

			{/* Export Model Button - Only show if model is trained and has test results */}
			{trained && testMetrics && (
				<div className="flex justify-center mb-6">
					<button
						onClick={handleExportModel}
						className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
					>
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
						Export Trained Model
					</button>
				</div>
			)}

			<Card>
				<CardTitle>Test and Export</CardTitle>
				<CardContent>
					{!trained && (
						<div className="text-center py-12">
							<div className="mb-4">
								<svg
									className="mx-auto h-12 w-12 text-gray-400"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={1}
										d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
									/>
								</svg>
							</div>
							<h3 className="text-lg font-medium text-gray-900 mb-2">
								No Model Trained Yet
							</h3>
							<p className="text-sm text-gray-600 mb-6">
								Complete the training process first to see test results and
								export options.
							</p>
							<div className="space-y-2 text-left bg-gray-50 p-4 rounded-lg max-w-md mx-auto">
								<div className="flex items-center gap-2 text-sm">
									<span className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs">
										✓
									</span>
									<span className="text-gray-600">Complete Data Input</span>
								</div>
								<div className="flex items-center gap-2 text-sm">
									<span className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs">
										✓
									</span>
									<span className="text-gray-600">
										Select Model Architecture
									</span>
								</div>
								<div className="flex items-center gap-2 text-sm">
									<span className="w-6 h-6 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-xs">
										3
									</span>
									<span className="text-gray-900 font-medium">
										Train & Validate Your Model
									</span>
								</div>
								<div className="flex items-center gap-2 text-sm">
									<span className="w-6 h-6 bg-gray-200 text-gray-400 rounded-full flex items-center justify-center text-xs">
										4
									</span>
									<span className="text-gray-400">Test & Export Results</span>
								</div>
							</div>
						</div>
					)}
					{!testMetrics && trained && (
						<div className="text-center py-8">
							<div className="mb-4">
								<svg
									className="mx-auto h-10 w-10 text-blue-400"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={1}
										d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
							</div>
							<h3 className="text-md font-medium text-gray-900 mb-2">
								Model Trained Successfully
							</h3>
							<p className="text-sm text-gray-600 mb-4">
								Your model is ready for testing. Click "Test & Export" on the
								Train & Validate page to generate test results.
							</p>
						</div>
					)}
					{testMetrics && (
						<div className="space-y-6">
							{/* Metrics summary */}
							<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
								{[
									{
										label: 'Accuracy',
										value: testMetrics.accuracy,
										color: 'text-green-600',
									},
									testMetrics.precision != null
										? {
												label: 'Precision',
												value: testMetrics.precision,
												color: 'text-blue-600',
										  }
										: null,
									testMetrics.recall != null
										? {
												label: 'Recall',
												value: testMetrics.recall,
												color: 'text-purple-600',
										  }
										: null,
									testMetrics.f1 != null
										? {
												label: 'F1 Score',
												value: testMetrics.f1,
												color: 'text-orange-600',
										  }
										: null,
									testMetrics.valAccuracy != null
										? {
												label: 'Val Acc',
												value: testMetrics.valAccuracy,
												color: 'text-emerald-600',
										  }
										: null,
								]
									.filter(Boolean)
									.map((m, i) => (
										<div
											key={i}
											className="group relative rounded-lg border border-gray-300 bg-white px-3 py-4 text-center shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-black/50"
										>
											<div
												className={`text-2xl font-bold tracking-tight ${
													m!.color
												}`}
											>
												{(m!.value * 100).toFixed(1)}%
											</div>
											<div className="mt-1 text-[11px] font-medium text-gray-600 tracking-wide">
												{m!.label}
											</div>
											<div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-gradient-to-br from-transparent via-transparent to-black/5" />
										</div>
									))}
							</div>

							{/* Collapsible overview */}
							<div className="mx-auto max-w-lg mt-4 p-5 rounded-xl bg-white border-2 border-black shadow-[4px_4px_0_0_#000] relative transition-all hover:shadow-[6px_6px_0_0_#000]">
								<button
									onClick={() => setOverviewCollapsed((o) => !o)}
									className="absolute -top-4 left-5 bg-black text-white text-[11px] px-3 py-1 rounded-full flex items-center gap-1"
									aria-expanded={!overviewCollapsed}
								>
									<span>Overview</span>
									<svg
										className={`w-3 h-3 transition-transform ${
											overviewCollapsed ? 'rotate-180' : ''
										}`}
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fillRule="evenodd"
											d="M5.23 7.21a.75.75 0 011.06.02L10 10.585l3.71-3.354a.75.75 0 011.04 1.08l-4.24 3.833a.75.75 0 01-1.04 0L5.25 8.29a.75.75 0 01-.02-1.08z"
											clipRule="evenodd"
										/>
									</svg>
								</button>
								<h5 className="font-semibold mb-4 text-center tracking-wide text-base">
									Detailed Test Overview
								</h5>
								<div
									className={`overflow-hidden transition-all duration-300 ease-in-out ${
										overviewCollapsed
											? 'max-h-0 opacity-0'
											: 'max-h-[600px] opacity-100'
									}`}
								>
									<ul className="grid gap-1.5 text-[13px]">
										<li className="flex justify-between hover:bg-gray-50 rounded px-3 py-2 transition-colors">
											<span className="font-medium text-gray-600">
												Total Samples
											</span>
											<span className="font-semibold">
												{state.testExport.rawTrueIndices?.length ?? '—'}
											</span>
										</li>
										<li className="flex justify-between hover:bg-gray-50 rounded px-3 py-2 transition-colors">
											<span className="font-medium text-gray-600">Classes</span>
											<span className="font-semibold">
												{confusion ? confusion.length : '—'}
											</span>
										</li>
										{roc?.auc != null && (
											<li className="flex justify-between hover:bg-gray-50 rounded px-3 py-2 transition-colors">
												<span className="font-medium text-gray-600">
													ROC AUC
												</span>
												<span className="font-semibold">
													{roc.auc.toFixed(3)}
												</span>
											</li>
										)}
										<li className="flex justify-between hover:bg-gray-50 rounded px-3 py-2 transition-colors">
											<span className="font-medium text-gray-600">
												Macro Precision
											</span>
											<span className="font-semibold">
												{testMetrics.precision != null
													? (testMetrics.precision * 100).toFixed(2) + '%'
													: '—'}
											</span>
										</li>
										<li className="flex justify-between hover:bg-gray-50 rounded px-3 py-2 transition-colors">
											<span className="font-medium text-gray-600">
												Macro Recall
											</span>
											<span className="font-semibold">
												{testMetrics.recall != null
													? (testMetrics.recall * 100).toFixed(2) + '%'
													: '—'}
											</span>
										</li>
										<li className="flex justify-between hover:bg-gray-50 rounded px-3 py-2 transition-colors">
											<span className="font-medium text-gray-600">
												Macro F1 Score
											</span>
											<span className="font-semibold">
												{testMetrics.f1 != null
													? (testMetrics.f1 * 100).toFixed(2) + '%'
													: '—'}
											</span>
										</li>
									</ul>
								</div>
							</div>

							{/* Visualization grid */}
							<div className="mt-8 grid md:grid-cols-3 gap-6">
								{[
									{
										key: 'matrix',
										title: 'Confusion Matrix',
										content: confusionHeatmap,
									},
									{
										key: 'roc',
										title: 'ROC Curve',
										badge:
											roc?.auc != null
												? `AUC ${roc.auc.toFixed(3)}`
												: undefined,
										content: roc ? (
											<CurvePlot
												x={roc.fpr}
												y={roc.tpr}
												xLabel="FPR"
												yLabel="TPR"
												color="#2563eb"
											/>
										) : (
											<div className="text-xs text-gray-500 text-center px-4">
												Only shown for binary classification
											</div>
										),
									},
									{
										key: 'pr',
										title: 'Precision-Recall Curve',
										content: pr ? (
											<CurvePlot
												x={pr.recall}
												y={pr.precision}
												xLabel="Recall"
												yLabel="Precision"
												color="#16a34a"
											/>
										) : (
											<div className="text-xs text-gray-500 text-center px-4">
												Only shown for binary classification
											</div>
										),
									},
								].map((box) => (
									<div
										key={box.key}
										className="bg-white border border-gray-300 rounded-lg p-4 shadow-sm flex flex-col items-center justify-start min-h-[260px] relative overflow-hidden"
									>
										<h4 className="font-medium mb-2 text-sm flex items-center gap-2">
											<span>{box.title}</span>
											{box.badge && (
												<span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
													{box.badge}
												</span>
											)}
										</h4>
										<div className="flex-1 flex items-center justify-center w-full">
											{box.content || (
												<div className="text-xs text-gray-500">
													Not available
												</div>
											)}
										</div>
									</div>
								))}
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Floating action buttons (no shadow) */}
			<div className="fixed bottom-6 right-6 flex flex-col sm:flex-row gap-3 z-40">
				<Link
					href="/dashboard/classroom/train-validate"
					className="px-5 py-3 rounded-lg border-2 border-black bg-white hover:bg-gray-100 active:translate-y-px active:translate-x-px transition-all text-sm font-semibold"
				>
					Back to Training
				</Link>
				<Link
					href="/dashboard/classroom/data-input"
					onClick={() => {
						// Reset all state when starting a completely new model training
						classroomStore.reset();
					}}
					className="px-5 py-3 rounded-lg border-2 border-black bg-black text-white hover:bg-gray-800 active:translate-y-px active:translate-x-px transition-all text-sm font-semibold"
				>
					Train Another Model
				</Link>
			</div>
		</div>
	);
}
