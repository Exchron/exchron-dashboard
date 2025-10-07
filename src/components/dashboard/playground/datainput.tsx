'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardTitle, CardContent } from '../../ui/Card';
import { usePrediction } from '../predictioncontext';
import { predictSingle } from '../../../lib/ml/exoplanetClient';

// Simple CSV parser (header row + rows)
function parseCsv(text: string): Record<string, string | number | null>[] {
	const lines = text.split(/\r?\n/).filter((l) => l.trim());
	if (!lines.length) return [];
	const headers = lines[0].split(',').map((h) => h.trim());
	return lines.slice(1).map((line) => {
		const cells = line.split(',');
		const row: Record<string, string | number | null> = {};
		headers.forEach((h, i) => {
			const raw = (cells[i] ?? '').trim();
			if (raw === '') {
				row[h] = null;
				return;
			}
			const num = Number(raw);
			row[h] = isNaN(num) ? raw : num;
		});
		return row;
	});
}

type ViewMode = 'manual' | 'upload' | 'preloaded' | 'batch';
interface SliderConfig {
	id: string;
	label: string;
	min: number;
	max: number;
	step: number;
	defaultValue: number;
}
interface UploadStatus {
	stage: 'idle' | 'validating' | 'uploading' | 'success' | 'error';
	message: string;
}

export default function DataInputTab() {
	const router = useRouter();
	const { setLoading, setError, setResults } = usePrediction();

	// View mode persistence
	const [viewMode, setViewMode] = React.useState<ViewMode | null>('preloaded');
	React.useEffect(() => {
		const first = !sessionStorage.getItem('appInitialized');
		if (first) {
			localStorage.removeItem('selectedDataInput');
			sessionStorage.setItem('appInitialized', 'true');
			setViewMode('preloaded');
			localStorage.setItem('selectedDataInput', 'Preloaded Data');
			return;
		}
		const saved = localStorage.getItem('selectedDataInput');
		const map: Record<string, ViewMode> = {
			'Manual Entry': 'manual',
			'Data Upload': 'upload',
			'Preloaded Data': 'preloaded',
			'Batch Processing': 'batch',
		};
		if (saved && map[saved]) setViewMode(map[saved]);
	}, []);
	const handleViewModeChange = (mode: ViewMode) => {
		if (mode === viewMode) {
			setViewMode(null);
			localStorage.removeItem('selectedDataInput');
			// Dispatch custom event for same-tab updates
			window.dispatchEvent(new Event('localStorageChange'));
		} else {
			setViewMode(mode);
			const display: Record<ViewMode, string> = {
				manual: 'Manual Entry',
				upload: 'Data Upload',
				preloaded: 'Preloaded Data',
				batch: 'Batch Processing',
			};
			localStorage.setItem('selectedDataInput', display[mode]);
			// Dispatch custom event for same-tab updates
			window.dispatchEvent(new Event('localStorageChange'));
		}
	};

	// Model selection / restriction
	const [selectedModel, setSelectedModel] = React.useState<string | null>(null);
	const [isRestrictedModel, setIsRestrictedModel] = React.useState(false);
	React.useEffect(() => {
		const stored = localStorage.getItem('selectedModel');
		setSelectedModel(stored);
		if (stored) {
			try {
				const parsed = JSON.parse(stored);
				const modelId = parsed.id || stored;
				// CNN and DNN models are restricted
				setIsRestrictedModel(modelId.includes('cnn') || modelId.includes('dnn'));
			} catch {
				// Fallback for legacy string format
				setIsRestrictedModel(stored.toLowerCase().includes('cnn') || stored.toLowerCase().includes('dnn'));
			}
		}
	}, []);

	// Single dataset selection (unrestricted preloaded)
	const [selectedDataset, setSelectedDataset] = React.useState<string | null>(
		null,
	);
	const handleDatasetSelect = (id: string) =>
		setSelectedDataset((prev) => (prev === id ? null : id));

	// Restricted model record selection (10 random IDs)
	const [recordIds, setRecordIds] = React.useState<string[]>([]);
	const [selectedRecordId, setSelectedRecordId] = React.useState<string | null>(
		null,
	);
	React.useEffect(() => {
		if (isRestrictedModel && viewMode === 'preloaded') {
			const ids = Array.from({ length: 10 }).map(
				() => 'REC-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
			);
			setRecordIds(ids);
			setSelectedRecordId(null);
		}
	}, [isRestrictedModel, viewMode]);



	// Parameter definitions for manual data entry (SVM/GB models)
	const koiParameters = [
		{ key: 'koi_period', label: 'Orbital Period', unit: 'days', min: 0.242, max: 129995.778, defaultValue: 10.0, step: 0.1, description: 'Time for planet to complete one orbit' },
		{ key: 'koi_time0bk', label: 'Transit Epoch (BKJD)', unit: 'BKJD', min: 120.516, max: 1472.522, defaultValue: 170.0, step: 0.001, description: 'Time of first observed transit in Barycentric Kepler Julian Day' },
		{ key: 'koi_time0', label: 'Transit Epoch (BJD)', unit: 'BJD', min: 2454953.516, max: 2456305.522, defaultValue: 2455000.0, step: 0.001, description: 'Time of first observed transit in Barycentric Julian Day' },
		{ key: 'koi_eccen', label: 'Eccentricity', unit: '', min: 0.0, max: 1.0, defaultValue: 0.0, step: 0.001, description: 'Orbital eccentricity (0 = circular, <1 = elliptical)' },
		{ key: 'koi_impact', label: 'Impact Parameter', unit: '', min: 0.0, max: 100.806, defaultValue: 0.5, step: 0.01, description: 'How centrally the planet transits the star' },
		{ key: 'koi_duration', label: 'Transit Duration', unit: 'hours', min: 0.052, max: 138.540, defaultValue: 3.0, step: 0.01, description: 'Duration of the transit event' },
		{ key: 'koi_depth', label: 'Transit Depth', unit: 'ppm', min: 0.0, max: 1541400.0, defaultValue: 100.0, step: 1.0, description: 'Depth of the transit in parts per million' },
		{ key: 'koi_sma', label: 'Semi-Major Axis', unit: 'au', min: 0.006, max: 44.989, defaultValue: 0.1, step: 0.001, description: 'Semi-major axis of the planetary orbit' },
		{ key: 'koi_incl', label: 'Inclination', unit: 'degrees', min: 2.290, max: 90.0, defaultValue: 89.0, step: 0.1, description: 'Orbital inclination angle' },
		{ key: 'koi_model_snr', label: 'Signal-to-Noise Ratio', unit: '', min: 0.0, max: 9054.7, defaultValue: 50.0, step: 0.1, description: 'Transit signal-to-noise ratio' },
		{ key: 'koi_count', label: 'Planet Count', unit: '', min: 1, max: 7, defaultValue: 1, step: 1, description: 'Number of planets in the system' },
		{ key: 'koi_bin_oedp_sig', label: 'Odd-Even Depth Stat', unit: '', min: -1.0, max: 1.0, defaultValue: 0.0, step: 0.001, description: 'Odd-even depth comparison statistic' },
		{ key: 'koi_steff', label: 'Stellar Temperature', unit: 'K', min: 2661, max: 15896, defaultValue: 5778, step: 1, description: 'Effective temperature of the host star' },
		{ key: 'koi_slogg', label: 'Stellar Surface Gravity', unit: 'log10(cm/s²)', min: 0.047, max: 5.364, defaultValue: 4.44, step: 0.01, description: 'Logarithm of stellar surface gravity' },
		{ key: 'koi_srad', label: 'Stellar Radius', unit: 'R☉', min: 0.109, max: 229.908, defaultValue: 1.0, step: 0.01, description: 'Radius of the host star in solar radii' },
		{ key: 'koi_smass', label: 'Stellar Mass', unit: 'M☉', min: 0.0, max: 3.735, defaultValue: 1.0, step: 0.01, description: 'Mass of the host star in solar masses' },
		{ key: 'koi_kepmag', label: 'Kepler Magnitude', unit: 'mag', min: 6.966, max: 20.003, defaultValue: 12.0, step: 0.01, description: 'Apparent magnitude in Kepler bandpass' }
	];

	// State for KOI parameter values
	const [koiValues, setKoiValues] = React.useState<Record<string, number>>(() => {
		const initial: Record<string, number> = {};
		koiParameters.forEach(param => {
			initial[param.key] = param.defaultValue;
		});
		return initial;
	});

	const handleKoiValueChange = (key: string, value: number) => {
		setKoiValues(prev => ({ ...prev, [key]: value }));
	};

	// Upload state
	const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
	const [uploadStatus, setUploadStatus] = React.useState<UploadStatus>({
		stage: 'idle',
		message: '',
	});
	const fileInputRef = React.useRef<HTMLInputElement>(null);
	const dropRef = React.useRef<HTMLDivElement>(null);
	const resetUploadStatus = () =>
		setUploadStatus({ stage: 'idle', message: '' });
	const validateFile = (file: File): string | null => {
		const maxSizeMB = 5;
		if (!file.name.toLowerCase().endsWith('.csv'))
			return 'Unsupported file type. Please upload a .csv file.';
		if (file.size / (1024 * 1024) > maxSizeMB)
			return `File exceeds ${maxSizeMB}MB size limit.`;
		return null;
	};
	const handleFileSelection = (file: File | null) => {
		if (!file) return;
		resetUploadStatus();
		const err = validateFile(file);
			if (err) {
				setSelectedFile(null);
				setUploadStatus({ stage: 'error', message: err });
				return;
			}
			setSelectedFile(file);
		};
		const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
			const newFile = e.target.files?.[0] || null;
			handleFileSelection(newFile);
		};
		const handleUploadTrigger = () => fileInputRef.current?.click();
		const simulateUpload = () => {
			if (!selectedFile) return;
			setUploadStatus({ stage: 'validating', message: 'Validating file...' });
			setTimeout(() => {
				setUploadStatus({ stage: 'uploading', message: 'Uploading data...' });
				setTimeout(
					() =>
						setUploadStatus({
							stage: 'success',
							message: 'File uploaded and validated successfully.',
						}),
					1200,
				);
			}, 800);
		};
		const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault();
			e.dataTransfer.dropEffect = 'copy';
			dropRef.current?.classList.add('ring-2', 'ring-black/40');
		};
		const handleDragLeave = () => {
			dropRef.current?.classList.remove('ring-2', 'ring-black/40');
		};
		const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault();
			dropRef.current?.classList.remove('ring-2', 'ring-black/40');
			handleFileSelection(e.dataTransfer.files?.[0] || null);
		};

		// Builders for payload meta
		const buildManual = () =>
			koiParameters.map((param) => ({
				id: param.key,
				label: param.label,
				value: koiValues[param.key] || param.defaultValue,
				min: param.min,
				max: param.max,
				type: 'koi-parameter',
				unit: param.unit,
			}));
		const buildUpload = () =>
			selectedFile
				? {
						filename: selectedFile.name,
						size: selectedFile.size,
						status: uploadStatus.stage,
				  }
				: null;
		const buildPreloaded = () => {
			if (isRestrictedModel)
				return selectedRecordId ? [{ recordId: selectedRecordId }] : [];
			return selectedDataset ? [{ datasetId: selectedDataset }] : [];
		};	// Determine if input selection is complete for enabling Evaluate
	const isReady = React.useMemo(() => {
		if (!viewMode) return false;
		if (viewMode === 'manual') return true; // manual always ready once selected
		if (viewMode === 'upload') {
			return uploadStatus.stage === 'success';
		}
		if (viewMode === 'preloaded') {
			if (isRestrictedModel) return !!selectedRecordId; // need a record
			return !!selectedDataset; // need a dataset
		}
		return false;
	}, [
		viewMode,
		uploadStatus.stage,
		isRestrictedModel,
		selectedRecordId,
		selectedDataset,
	]);

	const handleEvaluate = () => {
		if (!isReady) return; // guard
		router.push('/dashboard/playground/results');
	};

	const allDatasetCards = [
		{
			id: 'kepler-validated',
			name: 'Kepler Objects of Interest Test Data',
			description: 'High-confidence transit events from Kepler mission',
			samples: 4892,
			duration: '2009-2017',
		},
		{
			id: 'tess-candidates',
			name: 'TESS Objects of Interest Test Data',
			description: 'Recent candidates identified by TESS survey',
			samples: 2674,
			duration: '2018-2024',
		},
		{
			id: 'synthetic-lightcurves',
			name: 'Synthetic Light Curves',
			description:
				'Computer-generated transit simulations with known parameters',
			samples: 10000,
			duration: 'Simulated',
		},
		{
			id: 'mixed-dataset',
			name: 'Mixed Training Set',
			description: 'Combined real and synthetic data for robust training',
			samples: 15566,
			duration: 'Combined',
		},
	];

	// Filter datasets based on model type
	const datasetCards = React.useMemo(() => {
		if (isRestrictedModel) {
			// CNN/DNN models only show Kepler data
			return allDatasetCards.filter(card => card.id === 'kepler-validated');
		} else {
			// SVM/GB models show Kepler and TESS data
			return allDatasetCards.filter(card => ['kepler-validated', 'tess-candidates'].includes(card.id));
		}
	}, [isRestrictedModel]);

	return (
		<div className="space-y-4">
			{/* Mode selector */}
			<Card className="py-3">
				<div className="flex flex-col gap-3">
					<div className="flex items-center justify-between gap-4 flex-wrap">
						<CardTitle className="mr-3 !mb-0 shrink-0 flex items-center self-center leading-none">
							Data Input Mode
						</CardTitle>
						<div className="flex flex-wrap gap-2">
							{[
								{
									id: 'preloaded',
									label: 'Preloaded Data',
									desc: 'Use existing dataset samples',
								},
								{
									id: 'manual',
									label: 'Manual Data Entry',
									desc: 'Adjust parameters directly',
								},
								{
									id: 'upload',
									label: 'Data Upload',
									desc: 'Upload a prepared CSV',
								},
								{
									id: 'batch',
									label: 'Batch Processing',
									desc: 'Process large batches (coming soon)',
								},
							].map((btn) => {
								const active = viewMode === btn.id;
								return (
									<button
										key={btn.id}
										onClick={() => handleViewModeChange(btn.id as ViewMode)}
										aria-pressed={active}
										className={`px-3 py-2 rounded-md border text-sm flex flex-col items-start min-w-[150px] transition-colors font-medium ${
											active
												? 'bg-black text-white border-black'
												: 'bg-[var(--input-background)] border-[var(--input-border)] hover:bg-[var(--hover-background)]'
										}`}
									>
										<span className="font-semibold leading-tight">
											{btn.label}
										</span>
										<span
											className={`mt-1 text-[10px] ${
												active
													? 'text-gray-300'
													: 'text-[var(--text-secondary)]'
											}`}
										>
											{btn.desc}
										</span>
									</button>
								);
							})}
						</div>
					</div>
				</div>
			</Card>

			{!viewMode && (
				<Card>
					<CardContent className="py-12">
						<div className="text-center">
							<p className="text-lg text-[var(--text-secondary)]">
								Select a data input mode above to get started.
							</p>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Manual Mode */}
			{viewMode === 'manual' && !isRestrictedModel && (
				<>
					<Card>
						<CardTitle>Manual Data Entry</CardTitle>
						<CardContent>
							<p className="text-sm text-[var(--text-secondary)] mb-6 max-w-3xl">
								Enter values for each exoplanet detection parameter. These correspond to standard astronomical measurements used by the model for classification.
							</p>
							
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								{koiParameters.map((param) => {
									const currentValue = koiValues[param.key] || param.defaultValue;
									return (
										<div key={param.key} className="bg-white border border-[var(--input-border)] rounded-lg p-4">
											<div className="mb-3">
												<label className="block text-sm font-semibold text-black mb-1">
													{param.label} {param.unit && `(${param.unit})`}
												</label>
												<p className="text-xs text-[var(--text-secondary)] leading-tight">
													{param.description}
												</p>
											</div>
											
											<div className="space-y-3">
												{/* Slider for visual input */}
												<div className="">
													<input
														type="range"
														min={param.min}
														max={param.max}
														step={param.step}
														value={currentValue}
														onChange={(e) => handleKoiValueChange(param.key, parseFloat(e.target.value))}
														className="w-full h-2 bg-[var(--placeholder-color)] rounded-lg appearance-none cursor-pointer slider"
														style={{
															background: `linear-gradient(to right, #000 0%, #000 ${((currentValue - param.min) / (param.max - param.min)) * 100}%, #d9d9d9 ${((currentValue - param.min) / (param.max - param.min)) * 100}%, #d9d9d9 100%)`
														}}
													/>
												</div>
												
												{/* Precise numeric input */}
												<div className="flex items-center gap-2">
													<input
														type="number"
														min={param.min}
														max={param.max}
														step={param.step}
														value={currentValue}
														onChange={(e) => {
															const val = parseFloat(e.target.value);
															if (!isNaN(val) && val >= param.min && val <= param.max) {
																handleKoiValueChange(param.key, val);
															}
														}}
														className="flex-1 px-3 py-2 text-sm border border-[var(--input-border)] rounded bg-[var(--input-background)] focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black"
														placeholder={param.defaultValue.toString()}
													/>
													<button
														onClick={() => handleKoiValueChange(param.key, param.defaultValue)}
														className="px-2 py-2 text-xs bg-[var(--input-background)] border border-[var(--input-border)] rounded hover:bg-[var(--hover-background)] transition-colors"
														title="Reset to default"
													>
														↻
													</button>
												</div>
												
												{/* Range indicator */}
												<div className="flex justify-between text-xs text-[var(--text-secondary)]">
													<span>{param.min}</span>
													<span>{param.max}</span>
												</div>
											</div>
										</div>
									);
								})}
							</div>

						</CardContent>
					</Card>
					<Card>
						<CardTitle>Data Pre-processing</CardTitle>
						<CardContent>
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
								<p className="leading-relaxed text-sm">
									Our preprocessing pipeline standardizes temporal sampling,
									removes stellar noise, and applies detrending to isolate
									transit signatures. Outliers and missing values are handled
									before inference for stability.
								</p>
								<div className="flex items-center justify-center">
									<div className="bg-[var(--placeholder-color)] h-[240px] w-full rounded-lg border border-[var(--input-border)] flex items-center justify-center">
										<span className="text-[var(--text-secondary)] text-sm">
											Pre-processing Flow
										</span>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</>
			)}

			{viewMode === 'manual' && isRestrictedModel && (
				<Card>
					<CardContent className="py-16">
						<div className="max-w-xl mx-auto text-center space-y-4">
							<h2 className="text-xl font-semibold">
								Manual Data Entry Unavailable
							</h2>
							<p className="text-sm text-[var(--text-secondary)] leading-relaxed">
								For inputting data manually, select another model. The current selected model{' '}
								<span className="font-medium">{selectedModel || 'CNN/DNN'}</span> requires
								preloaded datasets for optimal performance.
							</p>
							<button
								onClick={() => router.push('/dashboard/playground/overview')}
								className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-black text-white text-sm font-medium hover:opacity-90 border border-black"
							>
								<span>Select Another Model</span>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="w-4 h-4"
									fill="none"
									viewBox="0 0 24 24"
									strokeWidth={2}
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M15.75 19.5L8.25 12l7.5-7.5"
									/>
								</svg>
							</button>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Upload Mode */}
			{viewMode === 'upload' && !isRestrictedModel && (
				<div className="space-y-8" data-upload-block>
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
						<Card>
							<CardTitle>Data Upload Guide</CardTitle>
							<CardContent>
								<p className="mb-4 text-sm leading-relaxed text-[var(--text-secondary)]">
									Prepare a CSV file with a header row:{' '}
									<code className="px-1 py-0.5 bg-[var(--input-background)] rounded text-[11px]">
										Parameter,Value
									</code>
									. Values outside the 0–100 range will be flagged. Download the
									template below for reference.
								</p>
								<button
									type="button"
									onClick={() => {
										const csvContent =
											'Parameter,Value\nParameter 1,50\nParameter 2,60';
										const blob = new Blob([csvContent], {
											type: 'text/csv;charset=utf-8;',
										});
										const url = URL.createObjectURL(blob);
										const a = document.createElement('a');
										a.href = url;
										a.download = 'data-template.csv';
										a.click();
										URL.revokeObjectURL(url);
									}}
									className="px-4 py-2 rounded-md border border-black bg-black text-white text-sm font-medium hover:opacity-90"
								>
									Download Template (data-template.csv)
								</button>
							</CardContent>
						</Card>
						<Card className="relative">
							<CardTitle>Upload Data</CardTitle>
							<CardContent>
								<input
									ref={fileInputRef}
									type="file"
									accept=".csv"
									onChange={handleFileInputChange}
									className="hidden"
								/>
								<div
									ref={dropRef}
									onDragOver={handleDragOver}
									onDragLeave={handleDragLeave}
									onDrop={handleDrop}
									onClick={handleUploadTrigger}
									className="border-2 border-dashed border-black/60 rounded-xl p-10 flex flex-col items-center justify-center text-center bg-white transition-colors cursor-pointer"
								>
									<div className="mb-4 text-black">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
											strokeWidth={1.5}
											stroke="currentColor"
											className="w-12 h-12"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
											/>
										</svg>
									</div>
									<h3 className="font-semibold text-lg mb-2">
										{selectedFile
											? selectedFile.name
											: 'Drag & drop CSV or click to select'}
									</h3>
									<p className="text-sm text-[var(--text-secondary)] mb-4">
										Only .csv up to 5MB.
									</p>
									<div className="flex flex-wrap gap-4 justify-center">
										{uploadStatus.stage === 'success' ? (
											<>
												<button
													type="button"
													onClick={handleUploadTrigger}
													className="px-4 py-2 rounded-md border border-black bg-black text-white text-sm font-medium hover:opacity-90"
												>
													Select Another File
												</button>
												<button
													type="button"
													onClick={() => {
														setSelectedFile(null);
														resetUploadStatus();
													}}
													className="px-4 py-2 rounded-md border border-[var(--input-border)] bg-[var(--input-background)] text-sm font-medium hover:bg-[var(--hover-background)]"
												>
													Reset
												</button>
											</>
										) : (
											<>
												<button
													type="button"
													disabled={['uploading', 'validating'].includes(
														uploadStatus.stage,
													)}
													onClick={(e) => {
														e.stopPropagation();
														handleUploadTrigger();
													}}
													className="px-4 py-2 rounded-md border border-black bg-black text-white text-sm font-medium hover:opacity-90"
												>
													{selectedFile ? 'Replace File' : 'Browse'}
												</button>
												<button
													type="button"
													disabled={
														!selectedFile ||
														['uploading', 'validating'].includes(
															uploadStatus.stage,
														)
													}
													onClick={(e) => {
														e.stopPropagation();
														simulateUpload();
													}}
													className={`px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
														!selectedFile ||
														['uploading', 'validating'].includes(
															uploadStatus.stage,
														)
															? 'border-[var(--input-border)] bg-[var(--input-background)] text-[var(--text-secondary)] cursor-not-allowed'
															: 'border-black bg-white hover:bg-[var(--hover-background)]'
													}`}
												>
													Upload
												</button>
											</>
										)}
									</div>
								</div>
								{uploadStatus.stage !== 'idle' && (
									<div className="mt-6 text-sm">
										{uploadStatus.stage === 'error' && (
											<p className="text-red-600 font-medium">
												{uploadStatus.message}
											</p>
										)}
										{uploadStatus.stage !== 'error' &&
											uploadStatus.stage !== 'success' && (
												<p className="text-[var(--text-secondary)]">
													{uploadStatus.message}
												</p>
											)}
										{uploadStatus.stage === 'success' && (
											<p className="text-green-600 font-medium flex items-center gap-1">
												<svg
													xmlns="http://www.w3.org/2000/svg"
													viewBox="0 0 20 20"
													fill="currentColor"
													className="w-5 h-5"
												>
													<path
														fillRule="evenodd"
														d="M16.704 5.29a1 1 0 010 1.415l-7.07 7.07a1 1 0 01-1.415 0L3.296 9.854a1 1 0 011.415-1.415l3.22 3.22 6.363-6.364a1 1 0 011.41-.004z"
														clipRule="evenodd"
													/>
												</svg>
												{uploadStatus.message}
											</p>
										)}
									</div>
								)}
							</CardContent>
						</Card>
					</div>
					<Card>
						<CardTitle>Data Pre-processing</CardTitle>
						<CardContent>
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
								<p className="leading-relaxed text-sm">
									Once uploaded, your CSV is parsed and validated. Columns are
									coerced into numeric ranges, missing values are imputed
									(median strategy), and outliers beyond configurable sigma
									thresholds are flagged. Normalized representations are cached
									for rapid inference.
								</p>
								<div className="flex items-center justify-center">
									<div className="bg-[var(--placeholder-color)] h-[240px] w-full rounded-lg border border-[var(--input-border)] flex items-center justify-center">
										<span className="text-[var(--text-secondary)] text-sm">
											Processing Overview
										</span>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			{viewMode === 'upload' && isRestrictedModel && (
				<Card>
					<CardContent className="py-16">
						<div className="max-w-xl mx-auto text-center space-y-4">
							<h2 className="text-xl font-semibold">
								Upload Disabled for This Model
							</h2>
							<p className="text-sm text-[var(--text-secondary)] leading-relaxed">
								Bulk or file-based data upload is currently not enabled for{' '}
								<span className="font-medium">{selectedModel}</span>. Select
								another model to access the upload workflow.
							</p>
							<button
								onClick={() => router.push('/dashboard/playground/overview')}
								className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-black text-white text-sm font-medium hover:opacity-90 border border-black"
							>
								<span>Choose Different Model</span>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="w-4 h-4"
									fill="none"
									viewBox="0 0 24 24"
									strokeWidth={2}
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M15.75 19.5L8.25 12l7.5-7.5"
									/>
								</svg>
							</button>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Batch placeholder */}
			{viewMode === 'batch' && (
				<Card>
					<CardTitle>Batch Processing</CardTitle>
					<CardContent>
						<div className="h-[260px] flex flex-col items-center justify-center text-center">
							<div className="mb-4 flex items-center justify-center w-20 h-20 rounded-full bg-[var(--input-background)] border border-[var(--input-border)]">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
									className="w-10 h-10 text-[var(--text-secondary)]"
								>
									<path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5a.75.75 0 00.471.696l3.5 1.4a.75.75 0 00.557-1.392L10.75 8.982V4.75z" />
									<path
										fillRule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-1.5A6.5 6.5 0 1010 3.5a6.5 6.5 0 000 13z"
										clipRule="evenodd"
									/>
								</svg>
							</div>
							<h3 className="text-xl font-semibold mb-2">Coming Soon</h3>
							<p className="max-w-md text-sm text-[var(--text-secondary)]">
								High-volume asynchronous ingestion and processing for large
								observational datasets will be available in a future release.
							</p>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Preloaded unrestricted */}
			{viewMode === 'preloaded' && !isRestrictedModel && (
				<>
					<Card>
						<CardTitle>Preloaded Dataset Selection</CardTitle>
						<CardContent>
							<p className="text-sm text-[var(--text-secondary)] mb-4 max-w-3xl">
								{isRestrictedModel 
									? 'Select from available datasets optimized for the current model.'
									: 'Choose from curated exoplanet datasets from Kepler or TESS missions. Selection is single-choice.'}
							</p>
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								{datasetCards.map((ds) => {
									const sel = selectedDataset === ds.id;
									return (
										<button
											key={ds.id}
											onClick={() => handleDatasetSelect(ds.id)}
											aria-pressed={sel}
											className={`border rounded-xl p-4 text-left transition-colors group focus:outline-none focus:ring-2 focus:ring-black/40 ${
												sel
													? 'bg-black border-black text-white'
													: 'bg-white border-[var(--input-border)] hover:bg-[var(--hover-background)]'
											}`}
										>
											<div className="flex items-start justify-between gap-2 mb-2">
												<h3
													className={`font-semibold text-sm ${
														sel ? 'text-white' : 'group-hover:text-black'
													}`}
												>
													{ds.name}
												</h3>
												<span
													className={`mt-0.5 inline-block w-3 h-3 rounded-full border ${
														sel
															? 'bg-white border-white'
															: 'border-[var(--input-border)] group-hover:border-black'
													}`}
												></span>
											</div>
											<p
												className={`text-xs mb-3 leading-relaxed ${
													sel ? 'text-gray-300' : 'text-[var(--text-secondary)]'
												}`}
											>
												{ds.description}
											</p>
											<div className="flex justify-between items-center text-xs">
												<span
													className={
														sel
															? 'text-gray-300'
															: 'text-[var(--text-secondary)]'
													}
												>
													{ds.samples.toLocaleString()} samples
												</span>
												<span
													className={
														sel
															? 'text-gray-300'
															: 'text-[var(--text-secondary)]'
													}
												>
													{ds.duration}
												</span>
											</div>
										</button>
									);
								})}
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardTitle>Dataset Overview</CardTitle>
						<CardContent>
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
								<div>
									<p className="leading-relaxed text-sm mb-4">
										Preloaded datasets are quality-controlled and ready for
										immediate model evaluation. Each dataset includes metadata
										about observation conditions, stellar properties, and
										validated transit parameters.
									</p>
									<div className="space-y-2 text-sm">
										<div className="flex justify-between">
											<span className="text-[var(--text-secondary)]">
												Total Available Samples:
											</span>
											<span className="font-medium">33,132</span>
										</div>
										<div className="flex justify-between">
											<span className="text-[var(--text-secondary)]">
												Data Format:
											</span>
											<span className="font-medium">
												Normalized Light Curves
											</span>
										</div>
										<div className="flex justify-between">
											<span className="text-[var(--text-secondary)]">
												Preprocessing:
											</span>
											<span className="font-medium">Detrended & Filtered</span>
										</div>
									</div>
								</div>
								<div className="flex items-center justify-center">
									<div className="bg-[var(--placeholder-color)] h-[240px] w-full rounded-lg border border-[var(--input-border)] flex items-center justify-center">
										<span className="text-[var(--text-secondary)] text-sm">
											Dataset Distribution
										</span>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</>
			)}

			{/* Preloaded restricted (record ID selection) */}
			{viewMode === 'preloaded' && isRestrictedModel && (
				<>
					<Card>
						<CardTitle>Test Data Selection</CardTitle>
						<CardContent>
							<p className="text-sm text-[var(--text-secondary)] mb-4 max-w-2xl">
								Select a test record from the Kepler Objects of Interest dataset.
								The <span className="font-medium">{selectedModel || 'CNN/DNN'}</span> model
								requires individual processed observations for evaluation.
							</p>
							<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
								{recordIds.map((id) => (
									<label
										key={id}
										className={`border rounded-lg px-3 py-3 text-xs cursor-pointer flex items-center gap-2 transition ${
											selectedRecordId === id
												? 'bg-black text-white border-black'
												: 'bg-white border-[var(--input-border)] hover:bg-[var(--hover-background)]'
										}`}
									>
										<input
											type="radio"
											name="recordId"
											value={id}
											className="hidden"
											onChange={() => setSelectedRecordId(id)}
										/>
										<span className="font-mono tracking-wide">{id}</span>
										{selectedRecordId === id && (
											<svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 20 20"
												fill="currentColor"
												className="w-4 h-4 ml-auto"
											>
												<path
													fillRule="evenodd"
													d="M16.704 5.29a1 1 0 010 1.415l-7.07 7.07a1 1 0 01-1.415 0L3.296 9.854a1 1 0 011.415-1.415l3.22 3.22 6.363-6.364a1 1 0 011.41-.004z"
													clipRule="evenodd"
												/>
											</svg>
										)}
									</label>
								))}
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardTitle>Dataset Overview</CardTitle>
						<CardContent>
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
								<div>
									<p className="leading-relaxed text-sm mb-4">
										Preloaded datasets are quality-controlled and ready for
										immediate model evaluation. Each dataset includes metadata
										about observation conditions, stellar properties, and
										validated transit parameters.
									</p>
									<div className="space-y-2 text-sm">
										<div className="flex justify-between">
											<span className="text-[var(--text-secondary)]">
												Total Available Samples:
											</span>
											<span className="font-medium">33,132</span>
										</div>
										<div className="flex justify-between">
											<span className="text-[var(--text-secondary)]">
												Data Format:
											</span>
											<span className="font-medium">
												Normalized Light Curves
											</span>
										</div>
										<div className="flex justify-between">
											<span className="text-[var(--text-secondary)]">
												Preprocessing:
											</span>
											<span className="font-medium">Detrended & Filtered</span>
										</div>
									</div>
								</div>
								<div className="flex items-center justify-center">
									<div className="bg-[var(--placeholder-color)] h-[240px] w-full rounded-lg border border-[var(--input-border)] flex items-center justify-center">
										<span className="text-[var(--text-secondary)] text-sm">
											Dataset Distribution
										</span>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</>
			)}

			{(viewMode === 'manual' ||
				viewMode === 'upload' ||
				viewMode === 'preloaded') && (
				<div className="fixed bottom-6 right-6 z-20">
					<button
						onClick={handleEvaluate}
						aria-label={isReady ? 'Evaluate Results' : 'Select input source'}
						disabled={!isReady}
						className={`rounded-full px-5 py-3 font-semibold text-sm shadow-[0px_0px_8px_1px_rgba(0,0,0,0.10)] transition flex items-center gap-2 ${
							isReady
								? 'bg-black text-white hover:opacity-90'
								: 'bg-[var(--input-background)] text-[var(--text-secondary)] border border-[var(--input-border)] cursor-not-allowed'
						}`}
					>
						<span>{isReady ? 'Evaluate' : 'Select Input Source'}</span>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							strokeWidth={2}
							stroke="currentColor"
							className="w-4 h-4"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3"
							/>
						</svg>
					</button>
				</div>
			)}
		</div>
	);
}
