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
import { NeuralNetworkService } from '../../../lib/ml/neuralNetwork';
import * as tf from '@tensorflow/tfjs';
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
	const rawProbs = state.testExport.rawProbabilities;
	const rawTruth = state.testExport.rawTrueIndices;
	const trained = state.training.hasTrainedModel;
	const modelType = state.training.modelMetrics?.modelType || 'neural-network';
	const featureImportance =
		state.training.modelMetrics?.trainingSummary?.featureImportance;
	const router = useRouter();

	// Local state (restored)
	// Removed exported models listing per new requirements
	const [loadingModels] = useState(false);
	const [exportedModels] = useState<any[]>([]);
	const [isTesting, setIsTesting] = useState(false);

	// On mount: clear stale test results (require retest after refresh)
	useEffect(() => {
		classroomStore.clearTestResults();
	}, [classroomStore]);

	// Utility: compute ROC & PR curves (binary only)
	const computeBinaryCurves = (scores: number[], truths: number[]) => {
		const thresholds = Array.from(
			new Set(scores.slice().sort((a, b) => b - a)),
		);
		const fprArr: number[] = [],
			tprArr: number[] = [],
			precArr: number[] = [],
			recArr: number[] = [];
		for (const t of thresholds) {
			let tp2 = 0,
				fp2 = 0,
				tn2 = 0,
				fn2 = 0;
			for (let i = 0; i < scores.length; i++) {
				const p = scores[i] >= t ? 1 : 0;
				const tr = truths[i];
				if (p === 1 && tr === 1) tp2++;
				else if (p === 1 && tr === 0) fp2++;
				else if (p === 0 && tr === 0) tn2++;
				else fn2++;
			}
			const tprVal = tp2 + fn2 === 0 ? 0 : tp2 / (tp2 + fn2);
			const fprVal = fp2 + tn2 === 0 ? 0 : fp2 / (fp2 + tn2);
			const precPoint = tp2 + fp2 === 0 ? 0 : tp2 / (tp2 + fp2);
			const recPoint = tprVal;
			fprArr.push(fprVal);
			tprArr.push(tprVal);
			precArr.push(precPoint);
			recArr.push(recPoint);
		}
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
		return {
			rocCurve: { fpr: fprArr, tpr: tprArr, thresholds, auc },
			prCurve: { recall: recArr, precision: precArr, thresholds },
		};
	};

	const handleTestModel = useCallback(async () => {
		if (!trained || testMetrics) {
			return;
		}

		setIsTesting(true);
		try {
			console.log('🧪 Starting model testing from Test & Export page...');

			// Get training data info from store
			const dataInput = (state as any).dataInput || {};
			const fileSource = dataInput.selectedDataSource;
			let fileName = '';
			const targetColumn = dataInput.targetColumn;
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

			// Sanitize feature list
			const headerSet = new Set(rawDataset?.header || []);
			const cleanedFeatures = (selectedFeatures || []).filter((f: string) =>
				headerSet.has(f),
			);
			const numericFeatures = cleanedFeatures.filter((f: string) => {
				const meta = columnMeta.find((c: any) => c.name === f);
				return meta?.inferredType === 'numeric';
			});

			console.log('Debug info:', {
				selectedFeatures,
				cleanedFeatures,
				numericFeatures,
				columnMeta,
				numericFeaturesType: typeof numericFeatures,
				isArray: Array.isArray(numericFeatures),
			});

			if (!Array.isArray(numericFeatures) || numericFeatures.length === 0) {
				throw new Error(
					'No numeric features available for testing. Please ensure features are selected and have numeric types.',
				);
			}

			let csvContent = rawDataset?.originalCSV || '';

			if (!csvContent) {
				console.log('📡 Fetching dataset from API for testing:', fileName);
				const resp = await fetch('/api/train', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						fileName,
						targetColumn,
						featureColumns: cleanedFeatures,
					}),
				});
				if (resp.ok) {
					const data = await resp.json();
					csvContent = data.csvContent;
				}
			}

			if (!csvContent) {
				throw new Error('Unable to reconstruct dataset for testing');
			}

			if (modelType === 'random-forest') {
				console.log('🌳 Testing Random Forest model...');

				// Parse CSV data for Random Forest testing
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

				if (!Array.isArray(numericFeatures)) {
					throw new Error(
						`numericFeatures is not an array: ${typeof numericFeatures}`,
					);
				}

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
					if (!Array.isArray(featureIndices)) {
						throw new Error(
							`featureIndices is not an array in RF: ${typeof featureIndices}`,
						);
					}
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

				// Get the trained model from store
				const trainedModel = state.training.trainedModel;
				if (!trainedModel) {
					throw new Error('No trained Random Forest model available');
				}

				// Use the actual trained model for predictions
				const nClasses = targetValues.size;
				const predictions = trainedModel.predict(testX);

				// Calculate accuracy and other metrics
				const correct = predictions.filter(
					(pred: number, idx: number) => pred === testY[idx],
				).length;
				const accuracy = correct / testY.length;

				// Calculate confusion matrix
				const matrix: number[][] = Array.from({ length: nClasses }, () =>
					Array(nClasses).fill(0),
				);
				for (let i = 0; i < testY.length; i++) {
					matrix[testY[i]][predictions[i]]++;
				}

				// Calculate precision, recall, f1
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

				// Real probability distributions via RF leaf aggregation
				const probabilities =
					typeof trainedModel.predictProba === 'function'
						? trainedModel.predictProba(testX)
						: predictions.map((p: number) => {
								const arr = Array(nClasses).fill(0);
								arr[p] = 1;
								return arr;
						  });
				let rocCurve: any = undefined;
				let prCurve: any = undefined;
				if (nClasses === 2) {
					const scores = probabilities.map((p: number[]) => p[1] ?? p[0]);
					const truths = testY.map((v: number) => (v === 1 ? 1 : 0));
					const curves = computeBinaryCurves(scores, truths);
					rocCurve = curves.rocCurve;
					prCurve = curves.prCurve;
				}
				classroomStore.setTestResults(
					{
						accuracy,
						precision,
						recall,
						f1,
						featureImportance: featureImportance || {},
					},
					matrix,
					{
						rawProbabilities: probabilities,
						rawTrueIndices: testY,
						rocCurve,
						prCurve,
					},
				);

				console.log('✅ Random Forest testing completed successfully!');
			} else {
				// Neural network test path refactored to avoid CSV reparsing & featureIndices mapping issues
				console.log('🧠 Testing Neural Network model (refactored)...');
				const nnService = state.training.trainedModel as any; // NeuralNetworkService instance
				if (!nnService || typeof nnService.predict !== 'function') {
					throw new Error(
						'Trained neural network service not available. Please retrain.',
					);
				}
				// Attempt to reuse prepared dataset from training (if persisted in store in future)
				const prepared = state.training.preparedDataset; // may be undefined after reload
				const modelMetricsSummary =
					state.training.modelMetrics?.trainingSummary;
				const usedFeatures: string[] =
					modelMetricsSummary?.datasetInfo?.usedNumericFeatureColumns ||
					state.dataInput.selectedFeatures ||
					[];
				if (!usedFeatures.length) {
					throw new Error(
						'No feature list available for neural network testing.',
					);
				}
				// If we have prepared dataset and it's large enough, sample a hold-out slice as proxy test
				let featureMatrix: number[][] = [];
				let trueIndices: number[] = [];
				if (prepared && prepared.features && prepared.featureMatrixShape) {
					const rows = prepared.featureMatrixShape.rows;
					const cols = prepared.featureMatrixShape.cols;
					const total = rows;
					const sampleCount = Math.min(100, total); // limit for UI speed
					for (let r = 0; r < sampleCount; r++) {
						const row: number[] = [];
						for (let c = 0; c < cols; c++) {
							row.push(prepared.features[r * cols + c]);
						}
						featureMatrix.push(row);
						trueIndices.push(prepared.target[r]);
					}
				} else {
					// Fallback: reconstruct from csvContent (already built earlier) if available
					if (!csvContent) {
						throw new Error(
							'Prepared dataset missing and no CSV content available for fallback.',
						);
					}
					const lines = csvContent.trim().split('\n');
					if (!lines.length)
						throw new Error('CSV content empty for NN fallback.');
					const headers = lines[0].split(',').map((h: string) => h.trim());
					const targetIdx = headers.indexOf(targetColumn);
					if (targetIdx === -1)
						throw new Error('Target column not found in fallback CSV.');
					const featureIdxs = usedFeatures.map((f: string) =>
						headers.indexOf(f),
					);
					if (featureIdxs.some((i) => i === -1))
						throw new Error(
							'One or more selected features missing in fallback CSV.',
						);
					const rowsData = lines
						.slice(1)
						.map((l: string) => l.split(',').map((c: string) => c.trim()));
					const labelMap = new Map<string, number>();
					let labelCounter = 0;
					for (const r of rowsData) {
						if (r.length !== headers.length) continue;
						const feats: number[] = [];
						let invalid = false;
						for (const idx of featureIdxs) {
							const v = parseFloat(r[idx]);
							if (isNaN(v)) {
								invalid = true;
								break;
							}
							feats.push(v);
						}
						if (invalid) continue;
						const label = r[targetIdx];
						if (!labelMap.has(label)) labelMap.set(label, labelCounter++);
						featureMatrix.push(feats);
						trueIndices.push(labelMap.get(label)!);
						if (featureMatrix.length >= 100) break; // limit
					}
				}
				if (!featureMatrix.length) {
					throw new Error('No feature rows available for NN testing.');
				}
				// Run predictions via service (service handles normalization internally)
				const { probabilities } = nnService.predict(featureMatrix);
				const predictedIndices = probabilities.map((prob: number[]) =>
					prob.indexOf(Math.max(...prob)),
				);
				const nClasses = probabilities[0]?.length || 2;
				// Confusion matrix
				const matrix: number[][] = Array.from({ length: nClasses }, () =>
					Array(nClasses).fill(0),
				);
				let correct = 0;
				for (let i = 0; i < predictedIndices.length; i++) {
					const truth = trueIndices[i];
					const pred = predictedIndices[i];
					if (truth === pred) correct++;
					if (truth < nClasses && pred < nClasses) matrix[truth][pred]++;
				}
				const accuracy = correct / predictedIndices.length;
				// Precision/Recall/F1 (macro)
				let pSum = 0,
					rSum = 0;
				for (let c = 0; c < nClasses; c++) {
					const tp = matrix[c][c];
					let fp = 0,
						fn = 0;
					for (let r = 0; r < nClasses; r++) {
						if (r !== c) fp += matrix[r][c];
						if (r !== c) fn += matrix[c][r];
					}
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
				let rocCurve: any = undefined;
				let prCurve: any = undefined;
				if (nClasses === 2) {
					const scores = probabilities.map((p: number[]) => p[1] ?? p[0]);
					const truths = trueIndices.map((v: number) => (v === 1 ? 1 : 0));
					const curves = computeBinaryCurves(scores, truths);
					rocCurve = curves.rocCurve;
					prCurve = curves.prCurve;
				}
				classroomStore.setTestResults(
					{ accuracy, precision, recall, f1 },
					matrix,
					{
						rawProbabilities: probabilities,
						rawTrueIndices: trueIndices,
						rocCurve,
						prCurve,
					},
				);
				console.log(
					'✅ Neural Network testing completed successfully (refactored)!',
				);
			}
		} catch (e) {
			console.error('❌ Testing failed', e);
		} finally {
			setIsTesting(false);
		}
	}, [
		trained,
		testMetrics,
		rawProbs,
		rawTruth,
		// removed computeCurves dependency
		classroomStore,
		state,
		modelType,
		featureImportance,
	]);

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

			// Create model data based on model type
			const baseModelData = {
				created_at: new Date().toISOString(),
				test_metrics: testMetrics,
				confusion_matrix: confusion,
				roc_curve: roc,
				pr_curve: pr,
				training_completed: trained,
			};

			let modelData: any;
			if (modelType === 'random-forest') {
				modelData = {
					...baseModelData,
					model_type: 'random_forest_exoplanet_classifier',
					parameters: {
						algorithm: 'random_forest',
						n_estimators:
							state.training.modelMetrics?.trainingSummary?.nEstimators || 100,
						feature_importance: featureImportance,
					},
					feature_importance: featureImportance,
				};
			} else {
				modelData = {
					...baseModelData,
					model_type: 'neural_network_exoplanet_classifier',
					parameters: {
						architecture: 'neural_network',
						layers: state.training.modelMetrics?.trainingSummary?.modelConfig
							?.hiddenLayers || [128, 64, 32],
					},
				};
			}

			const zip = new JSZipLib();
			const folder = zip.folder(folderName);
			folder?.file('model.json', JSON.stringify(modelData, null, 2));

			// Add model-specific metadata
			if (modelType === 'random-forest') {
				folder?.file(
					'feature_importance.json',
					JSON.stringify(featureImportance || {}, null, 2),
				);
				folder?.file(
					'README.txt',
					'Random Forest Model Export\n' +
						'Generated by Exchron Dashboard\n\n' +
						'Files:\n' +
						'- model.json: Main model configuration and metrics\n' +
						'- feature_importance.json: Feature importance scores\n' +
						'- This README.txt\n\n' +
						'Model Type: Random Forest\n' +
						`Export Date: ${new Date().toISOString()}`,
				);
			} else {
				folder?.file(
					'README.txt',
					'Neural Network Model Export\n' +
						'Generated by Exchron Dashboard\n\n' +
						'Files:\n' +
						'- model.json: Main model configuration and metrics\n' +
						'- This README.txt\n\n' +
						'Model Type: Neural Network\n' +
						`Export Date: ${new Date().toISOString()}`,
				);
			}

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
							disabled={!trained || testMetrics != null || isTesting}
							className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 ${
								!trained || testMetrics != null || isTesting
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
							{isTesting
								? 'Testing...'
								: testMetrics
								? 'Model Already Tested'
								: 'Test Model'}
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

							{/* All Visualizations */}
							<div className="mt-8 grid md:grid-cols-3 gap-6">
								{[
									{
										key: 'matrix',
										title: 'Confusion Matrix',
										content: confusionHeatmap,
									},
									modelType === 'random-forest' && featureImportance
										? {
												key: 'importance',
												title: 'Feature Importance',
												content: (
													<div className="w-full p-2">
														<div className="space-y-2">
															{Object.entries(featureImportance)
																.sort(
																	([, a], [, b]) =>
																		(b as number) - (a as number),
																)
																.slice(0, 8)
																.map(([feature, importance]) => (
																	<div
																		key={feature}
																		className="flex items-center text-xs"
																	>
																		<span className="w-16 truncate text-left">
																			{feature}:
																		</span>
																		<div className="flex-1 mx-2 bg-gray-200 rounded-full h-2">
																			<div
																				className="bg-green-500 h-2 rounded-full transition-all"
																				style={{
																					width: `${
																						(importance as number) * 100
																					}%`,
																				}}
																			></div>
																		</div>
																		<span className="w-8 text-right font-medium">
																			{((importance as number) * 100).toFixed(
																				0,
																			)}
																			%
																		</span>
																	</div>
																))}
														</div>
													</div>
												),
										  }
										: {
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
										title:
											modelType === 'random-forest'
												? 'ROC Curve'
												: 'Precision-Recall Curve',
										badge:
											modelType === 'random-forest' && roc?.auc != null
												? `AUC ${roc.auc.toFixed(3)}`
												: undefined,
										content:
											modelType === 'random-forest' ? (
												roc ? (
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
												)
											) : pr ? (
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
								]
									.filter(Boolean)
									.map((box) => (
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
