'use client';

import React, {
	useState,
	useCallback,
	ReactNode,
	useEffect,
	useMemo,
} from 'react';
import { Card, CardTitle, CardContent } from '../../ui/Card';
import Link from 'next/link';
import { useClassroomStore } from '../../../lib/ml/state/classroomStore';
// Dynamically import JSZip when exporting to avoid SSR issues if any
let JSZipLib: any;
import { useRouter } from 'next/navigation';

// Types
interface TestResult {
	accuracy: number;
	f1Score: number;
	precision: number;
	recall: number;
}

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
	// Use state from store
	const [state, classroomStore] = useClassroomStore();
	const testMetrics = state.testExport.testMetrics;
	const confusion = state.testExport.confusionMatrix;
	const roc = state.testExport.rocCurve;
	const pr = state.testExport.prCurve;
	const trained = state.training.hasTrainedModel;
	const router = useRouter();

	// Local state (restored)
	// Removed exported models listing per new requirements
	const [loadingModels] = useState(false);
	const [exportedModels] = useState<any[]>([]);
	const [isTesting, setIsTesting] = useState(false);

	// Load exported models (restored)
	// Removed remote exported models fetch (no longer needed)
	useEffect(() => {}, []);

	// Handle test model (restored simplified version)
	const handleTestModel = useCallback(async () => {
		if (!trained || testMetrics) return;
		setIsTesting(true);
		try {
			await new Promise((r) => setTimeout(r, 1200));
			// Simulated base metrics
			const metrics = {
				accuracy: 0.9 + Math.random() * 0.05,
				precision: 0.88 + Math.random() * 0.05,
				recall: 0.87 + Math.random() * 0.05,
				f1: 0.885 + Math.random() * 0.04,
				loss: 0.25 + Math.random() * 0.1,
			};
			// Simulated confusion matrix
			const matrix = [
				[
					60 + Math.floor(Math.random() * 10),
					4 + Math.floor(Math.random() * 6),
				],
				[
					6 + Math.floor(Math.random() * 6),
					55 + Math.floor(Math.random() * 10),
				],
			];

			// --- Simulated ROC & PR Curve Generation ---
			// Generate thresholds descending 1.0 -> 0.0
			const thresholds: number[] = Array.from({ length: 30 }, (_, i) =>
				parseFloat((1 - i / 29).toFixed(3)),
			);
			// Simulate a generally good classifier: TPR high, FPR low-ish
			const fpr: number[] = [];
			const tpr: number[] = [];
			const precisionArr: number[] = [];
			const recallArr: number[] = [];
			for (let i = 0; i < thresholds.length; i++) {
				const t = thresholds[i];
				// FPR rises slowly as threshold lowers
				const fpRate = Math.pow(1 - t, 1.3) * 0.5; // capped ~0.5
				const tpRate = 0.75 + (1 - t) * 0.23 - Math.pow(1 - t, 2) * 0.08; // concave near top
				fpr.push(parseFloat(Math.min(1, fpRate).toFixed(4)));
				tpr.push(parseFloat(Math.min(1, tpRate).toFixed(4)));
				// Derive synthetic precision/recall points
				const prec = 0.82 + (tpr[i] - fpr[i]) * 0.15 - (1 - t) * 0.05;
				const rec = tpr[i] - fpr[i] * 0.05; // mostly follows tpr
				precisionArr.push(
					parseFloat(Math.max(0, Math.min(1, prec)).toFixed(4)),
				);
				recallArr.push(parseFloat(Math.max(0, Math.min(1, rec)).toFixed(4)));
			}
			// Ensure starting (0,0) and ending (1,1) for ROC for proper AUC
			if (fpr[0] !== 0 || tpr[0] !== 0) {
				fpr.unshift(0);
				tpr.unshift(0);
				thresholds.unshift(1.01); // pseudo threshold
			}
			if (fpr[fpr.length - 1] !== 1 || tpr[tpr.length - 1] !== 1) {
				fpr.push(1);
				tpr.push(1);
				thresholds.push(-0.01);
			}
			// Trapezoidal AUC
			let auc = 0;
			for (let i = 1; i < fpr.length; i++) {
				const width = fpr[i] - fpr[i - 1];
				const height = (tpr[i] + tpr[i - 1]) / 2;
				auc += width * height;
			}
			auc = parseFloat(auc.toFixed(4));

			// Store in classroomStore
			classroomStore.setTestResults(metrics, matrix, {
				rocCurve: { fpr, tpr, thresholds, auc },
				prCurve: { recall: recallArr, precision: precisionArr, thresholds },
			});
		} catch (e) {
			console.error('Test failed', e);
		} finally {
			setIsTesting(false);
		}
	}, [trained, testMetrics, classroomStore]);

	// Export model (restored)
	const handleExportModel = useCallback(async () => {
		if (!testMetrics) return;
		try {
			if (!JSZipLib) {
				JSZipLib = (await import('jszip')).default;
			}
			const timestamp = new Date()
				.toISOString()
				.replace(/[:.]/g, '-')
				.slice(0, 19);
			const folderName = `model_${timestamp}`;
			const modelData = {
				model_type: 'neural_network_exoplanet_classifier',
				created_at: new Date().toISOString(),
				test_metrics: testMetrics,
				confusion_matrix: confusion,
				roc_curve: roc,
				pr_curve: pr,
				training_completed: trained,
				parameters: { architecture: 'neural_network', layers: [128, 64, 32] },
			};
			const zip = new JSZipLib();
			const folder = zip.folder(folderName);
			folder?.file('model.json', JSON.stringify(modelData, null, 2));
			// Placeholder for potential future weight / metadata files
			// folder?.file('README.txt', 'Model export generated by Exchron');
			const content = await zip.generateAsync({ type: 'blob' });
			const url = URL.createObjectURL(content);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${folderName}.zip`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (e) {
			console.error('Export failed', e);
		}
	}, [testMetrics, confusion, roc, pr, trained]);

	// Confusion matrix heatmap (restored)
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
					<div className="ml-4 flex flex-col items-center select-none" />
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

	// Curve plot (restored)
	const CurvePlot: React.FC<{
		x: number[];
		y: number[];
		xLabel?: string;
		yLabel?: string;
		color?: string;
	}> = ({ x, y, xLabel, yLabel, color = '#111' }) => {
		if (!x || !y || x.length < 2 || y.length !== x.length)
			return <div className="text-xs text-gray-500">No curve</div>;
		const minX = Math.min(...x),
			maxX = Math.max(...x);
		const minY = Math.min(...y),
			maxY = Math.max(...y);
		const rX = maxX - minX || 1;
		const rY = maxY - minY || 1;
		const w = 220,
			h = 160;
		const pts = x
			.map((vx, i) => {
				const vy = y[i];
				const px = ((vx - minX) / rX) * (w - 30) + 25;
				const py = h - 25 - ((vy - minY) / rY) * (h - 35);
				return `${px},${py}`;
			})
			.join(' ');
		return (
			<svg
				width={w}
				height={h}
				className="overflow-visible bg-white border rounded"
			>
				<polyline fill="none" stroke={color} strokeWidth={2} points={pts} />
				<line
					x1={25}
					y1={h - 25}
					x2={w - 5}
					y2={h - 25}
					stroke="#999"
					strokeWidth={1}
				/>
				<line
					x1={25}
					y1={h - 25}
					x2={25}
					y2={10}
					stroke="#999"
					strokeWidth={1}
				/>
				{xLabel && (
					<text
						x={w / 2}
						y={h - 5}
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
						y={h / 2}
						transform={`rotate(-90 10 ${h / 2})`}
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

	// Workflow step (restored)
	const WorkflowStep: React.FC<{
		step: number;
		isActive: boolean;
		isCompleted: boolean;
		label: string;
	}> = ({ step, isActive, isCompleted, label }) => (
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

	// Export button (restored)
	const ExportButton: React.FC<{
		onClick?: () => void;
		icon: ReactNode;
		label: string;
		isPrimary?: boolean;
	}> = ({ onClick, icon, label, isPrimary }) => (
		<button
			onClick={onClick}
			className={isPrimary ? PRIMARY_BUTTON_CLASSES : SECONDARY_BUTTON_CLASSES}
		>
			{icon}
			{label}
		</button>
	);

	return (
		<div>
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

			{/* Test Model and Export Buttons - Only show if model is trained */}
			{trained && (
				<div className="mb-4">
					<div className="flex justify-center gap-4">
						<button
							onClick={handleTestModel}
							disabled={!trained || testMetrics != null}
							className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 ${
								!trained || testMetrics != null
									? 'bg-gray-300 text-gray-600 cursor-not-allowed'
									: 'bg-green-600 text-white hover:bg-green-700'
							}`}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-5 w-5"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fillRule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z"
									clipRule="evenodd"
								/>
							</svg>
							{testMetrics ? 'Model Already Tested' : 'Test Model'}
						</button>
						<button
							onClick={handleExportModel}
							disabled={!testMetrics}
							className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 ${
								!testMetrics
									? 'bg-gray-300 text-gray-600 cursor-not-allowed'
									: 'bg-blue-600 text-white hover:bg-blue-700'
							}`}
						>
							<DownloadIcon />
							Export Trained Model
						</button>
					</div>
				</div>
			)}

			{/* Test Results with All 3 Visualizations */}
			<Card>
				<CardTitle>Test Results</CardTitle>
				<CardContent>
					<p className="text-sm mb-4">
						These metrics show how well your model performs on data it hasn't
						seen during training.
					</p>

					{!trained && (
						<div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700 mb-4">
							No trained model found this session. Train a model first.
						</div>
					)}
					{!testMetrics && trained && (
						<div className="p-6 text-center text-sm text-gray-600">
							No test results yet. Click "Test Model" above to run model
							evaluation.
						</div>
					)}
					{testMetrics && (
						<div className="space-y-6">
							{/* Metrics summary */}
							<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

							{/* All 3 Visualizations */}
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

							{/* Export options removed per updated requirements */}
						</div>
					)}
					{!testMetrics && (
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

			{/* Fixed navigation buttons */}
			<div className="fixed bottom-6 right-6 flex flex-col sm:flex-row gap-3 z-40">
				<Link
					href="/dashboard/classroom/train-validate"
					className="px-5 py-3 rounded-lg border-2 border-black bg-white hover:bg-gray-100 active:translate-y-px active:translate-x-px transition-all text-sm font-semibold"
				>
					Back to Training
				</Link>
				<button
					onClick={() => {
						classroomStore.reset();
						router.push('/dashboard/classroom/data-input');
					}}
					className="px-5 py-3 rounded-lg border-2 border-black bg-black text-white hover:bg-gray-800 active:translate-y-px active:translate-x-px transition-all text-sm font-semibold"
				>
					Train Another Model
				</button>
			</div>
		</div>
	);
}
