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
	const { setLoading, setError, clearError, setResults, status, error } = usePrediction();

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

	// Kepler ID input for CNN/DNN models
	const [keplerIdInput, setKeplerIdInput] = React.useState<string>('');
	const [keplerIdValid, setKeplerIdValid] = React.useState<boolean | null>(null);
	const [allowedKeplerIds, setAllowedKeplerIds] = React.useState<Set<string>>(new Set());
	const [loadingKeplerIds, setLoadingKeplerIds] = React.useState<boolean>(false);
	
	// Load allowed Kepler IDs from CSV file
	React.useEffect(() => {
		if (isRestrictedModel) {
			setLoadingKeplerIds(true);
			fetch('/CNN-DNN-allowed.csv')
				.then(response => {
					if (!response.ok) {
						throw new Error(`HTTP error! status: ${response.status}`);
					}
					return response.text();
				})
				.then(csvText => {
					const lines = csvText.trim().split('\n');
					const ids = new Set<string>();
					// Skip header row
					for (let i = 1; i < lines.length; i++) {
						const kepid = lines[i].split(',')[0]?.trim();
						if (kepid) {
							ids.add(kepid);
						}
					}
					setAllowedKeplerIds(ids);
					console.log(`Loaded ${ids.size} allowed Kepler IDs`);
				})
				.catch(err => {
					console.error('Failed to load allowed Kepler IDs:', err);
				})
				.finally(() => {
					setLoadingKeplerIds(false);
				});
		}
	}, [isRestrictedModel]);
	
	// Validate Kepler ID input
	const handleKeplerIdChange = (value: string) => {
		setKeplerIdInput(value);
		if (value.trim() === '') {
			setKeplerIdValid(null);
			return;
		}
		
		const isValid = allowedKeplerIds.has(value.trim());
		setKeplerIdValid(isValid);
	};
	
	// Legacy record IDs for backward compatibility (if needed)
	const [recordIds, setRecordIds] = React.useState<string[]>([]);
	const [selectedRecordId, setSelectedRecordId] = React.useState<string | null>(
		null,
	);



	// Parameter definitions for manual data entry (SVM/GB models)
	// KOI parameters matching the CSV template structure for GB/SVM models
	const koiParameters = [
		{ key: 'koi_period', label: 'Orbital Period', unit: 'days', min: 0.242, max: 129995.778, defaultValue: 10.0, step: 0.1, description: 'Time for planet to complete one orbit' },
		{ key: 'koi_time0bk', label: 'Transit Epoch (BKJD)', unit: 'BKJD', min: 120.516, max: 1472.522, defaultValue: 170.0, step: 0.001, description: 'Time of first observed transit in Barycentric Kepler Julian Day' },
		{ key: 'koi_impact', label: 'Impact Parameter', unit: '', min: 0.0, max: 100.806, defaultValue: 0.5, step: 0.01, description: 'How centrally the planet transits the star' },
		{ key: 'koi_duration', label: 'Transit Duration', unit: 'hours', min: 0.052, max: 138.540, defaultValue: 3.0, step: 0.01, description: 'Duration of the transit event' },
		{ key: 'koi_depth', label: 'Transit Depth', unit: 'ppm', min: 0.0, max: 1541400.0, defaultValue: 100.0, step: 1.0, description: 'Depth of the transit in parts per million' },
		{ key: 'koi_incl', label: 'Inclination', unit: 'degrees', min: 2.290, max: 90.0, defaultValue: 89.0, step: 0.1, description: 'Orbital inclination angle' },
		{ key: 'koi_model_snr', label: 'Signal-to-Noise Ratio', unit: '', min: 0.0, max: 9054.7, defaultValue: 50.0, step: 0.1, description: 'Transit signal-to-noise ratio' },
		{ key: 'koi_count', label: 'Transit Count', unit: '', min: 1, max: 500, defaultValue: 50, step: 1, description: 'Number of observed transits' },
		{ key: 'koi_bin_oedp_sig', label: 'Odd-Even Depth Significance', unit: '', min: -10.0, max: 10.0, defaultValue: 0.0, step: 0.001, description: 'Statistical significance of odd-even depth difference' },
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

		// CSV validation and parsing function for KOI data format
		const validateAndParseCSV = (content: string): { isValid: boolean; data?: any[]; error?: string } => {
			try {
				const parsed = parseCsv(content);
				if (!parsed || parsed.length === 0) {
					return { isValid: false, error: 'File appears to be empty or invalid' };
				}

				// Required KOI parameters for the API
				const requiredColumns = [
					'koi_period', 'koi_time0bk', 'koi_impact', 'koi_duration', 'koi_depth',
					'koi_incl', 'koi_model_snr', 'koi_count', 'koi_bin_oedp_sig', 'koi_steff',
					'koi_slogg', 'koi_srad', 'koi_smass', 'koi_kepmag'
				];

				// Get the headers from the parsed data
				const headers = Object.keys(parsed[0] || {});
				
				// Check which required columns are missing
				const missingColumns = requiredColumns.filter(col => !headers.includes(col));
				
				if (missingColumns.length > 0) {
					return { 
						isValid: false, 
						error: `Missing required columns: ${missingColumns.join(', ')}. Please ensure your CSV includes all KOI parameters.` 
					};
				}

				// Validate data rows
				const validRows = [];
				const errors = [];

				for (let i = 0; i < Math.min(parsed.length, 1000); i++) { // Limit to 1000 rows for processing
					const row = parsed[i];
					const validatedRow: Record<string, number> = {};
					let hasErrors = false;

					for (const col of requiredColumns) {
						const value = row[col];
						if (value === null || value === undefined || value === '') {
							errors.push(`Row ${i + 1}: Missing value for ${col}`);
							hasErrors = true;
							continue;
						}

						const numValue = typeof value === 'number' ? value : parseFloat(String(value));
						if (isNaN(numValue) || !isFinite(numValue)) {
							errors.push(`Row ${i + 1}: Invalid numeric value for ${col}: ${value}`);
							hasErrors = true;
							continue;
						}

						validatedRow[col] = numValue;
					}

					if (!hasErrors) {
						validRows.push(validatedRow);
					}
				}

				if (validRows.length === 0) {
					return { 
						isValid: false, 
						error: `No valid data rows found. Errors: ${errors.slice(0, 5).join('; ')}${errors.length > 5 ? '...' : ''}` 
					};
				}

				if (errors.length > 0 && errors.length >= parsed.length * 0.5) {
					return { 
						isValid: false, 
						error: `Too many invalid rows (${errors.length}/${parsed.length}). Please check your data format.` 
					};
				}

				return { 
					isValid: true, 
					data: validRows.slice(0, 100), // Limit to 100 rows for API processing
					...(errors.length > 0 && { error: `Processed ${validRows.length} valid rows, skipped ${errors.length} invalid rows.` })
				};

			} catch (err) {
				return { 
					isValid: false, 
					error: `Failed to parse CSV: ${err instanceof Error ? err.message : 'Unknown error'}` 
				};
			}
		};

		const processUpload = async () => {
			if (!selectedFile) return;
			
			setUploadStatus({ stage: 'validating', message: 'Validating file format...' });
			
			try {
				const fileContent = await selectedFile.text();
				const { isValid, data, error } = validateAndParseCSV(fileContent);
				
				if (!isValid || !data) {
					setUploadStatus({ stage: 'error', message: error || 'Invalid file format' });
					return;
				}
				
				// Store the parsed data for later use
				sessionStorage.setItem('uploadedCSVData', JSON.stringify(data));
				setUploadStatus({ 
					stage: 'success', 
					message: `File validated successfully. Found ${data.length} valid samples.${error ? ` Note: ${error}` : ''}` 
				});
				
			} catch (err) {
				console.error('File processing error:', err);
				setUploadStatus({ 
					stage: 'error', 
					message: err instanceof Error ? err.message : 'Failed to process file' 
				});
			}
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
				return keplerIdValid === true ? [{ keplerId: keplerIdInput.trim() }] : [];
			return selectedDataset ? [{ datasetId: selectedDataset }] : [];
		};	// Determine if input selection is complete for enabling Evaluate
	const isReady = React.useMemo(() => {
		if (!viewMode) return false;
		if (viewMode === 'manual') return true; // manual always ready once selected
		if (viewMode === 'upload') {
			return uploadStatus.stage === 'success';
		}
		if (viewMode === 'preloaded') {
			if (isRestrictedModel) return keplerIdValid === true; // need a valid Kepler ID
			return !!selectedDataset; // need a dataset
		}
		return false;
	}, [
		viewMode,
		uploadStatus.stage,
		isRestrictedModel,
		keplerIdValid,
		selectedDataset,
	]);

	const handleEvaluate = async () => {
		if (!isReady) return; // guard
		
		// For DL models (CNN/DNN), make API request here
		if (isRestrictedModel && keplerIdValid && keplerIdInput.trim()) {
			setLoading();
			
			try {
				// Extract model type from selected model
				let modelType = 'cnn'; // default
				const storedModel = localStorage.getItem('selectedModel');
				if (storedModel) {
					try {
						const parsed = JSON.parse(storedModel);
						const modelId = parsed.id || storedModel;
						if (modelId.includes('dnn')) {
							modelType = 'dnn';
						} else if (modelId.includes('cnn')) {
							modelType = 'cnn';
						}
					} catch {
						// Legacy string format
						if (storedModel.toLowerCase().includes('dnn')) {
							modelType = 'dnn';
						}
					}
				}

				const payload = {
					model: modelType,
					kepid: keplerIdInput.trim(),
					predict: true
				};

				console.log('Making DL prediction request with payload:', payload);

				const response = await fetch('/api/dl-predict', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(payload),
				});

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.error || `API request failed with status ${response.status}`);
				}

				const result = await response.json();
				console.log('DL prediction result:', result);
				
				// Store the result for the results page
				sessionStorage.setItem('dlPredictionResult', JSON.stringify(result));
				sessionStorage.setItem('selectedKeplerId', keplerIdInput.trim());
				
				// Navigate to results
				router.push('/dashboard/playground/results');

			} catch (err) {
				console.error('DL prediction error:', err);
				const errorMessage = err instanceof Error ? err.message : 'Failed to get DL prediction';
				
				// Check if it's a connection/uptime issue or if API returned uptime message
				if (errorMessage.includes('fetch') || 
					errorMessage.includes('network') || 
					errorMessage.includes('timeout') ||
					errorMessage.includes('uptime isn\'t 100% guaranteed') ||
					errorMessage.includes('free services')) {
					setError('Sorry, we are using free services therefore uptime isn\'t 100% guaranteed. Please check back later.');
				} else {
					setError(errorMessage);
				}
			}
		} else if (viewMode === 'manual' && !isRestrictedModel) {
			// For GB/SVM models with manual data entry
			setLoading();
			
			try {
				// Extract model type from selected model
				let modelType = 'gb'; // default
				const storedModel = localStorage.getItem('selectedModel');
				if (storedModel) {
					try {
						const parsed = JSON.parse(storedModel);
						const modelId = parsed.id || storedModel;
						if (modelId.toLowerCase().includes('svm')) {
							modelType = 'svm';
						} else if (modelId.toLowerCase().includes('gb') || modelId.toLowerCase().includes('gradient')) {
							modelType = 'gb';
						}
					} catch {
						// Legacy string format
						if (storedModel.toLowerCase().includes('svm')) {
							modelType = 'svm';
						} else if (storedModel.toLowerCase().includes('gb') || storedModel.toLowerCase().includes('gradient')) {
							modelType = 'gb';
						}
					}
				}

				// Build the prediction payload from slider values
				const payload = {
					model: modelType,
					datasource: 'manual',
					features: {
						koi_period: koiValues.koi_period || koiParameters.find(p => p.key === 'koi_period')?.defaultValue || 10.0,
						koi_time0bk: koiValues.koi_time0bk || koiParameters.find(p => p.key === 'koi_time0bk')?.defaultValue || 170.0,
						koi_impact: koiValues.koi_impact || koiParameters.find(p => p.key === 'koi_impact')?.defaultValue || 0.5,
						koi_duration: koiValues.koi_duration || koiParameters.find(p => p.key === 'koi_duration')?.defaultValue || 3.0,
						koi_depth: koiValues.koi_depth || koiParameters.find(p => p.key === 'koi_depth')?.defaultValue || 100.0,
						koi_incl: koiValues.koi_incl || koiParameters.find(p => p.key === 'koi_incl')?.defaultValue || 89.0,
						koi_model_snr: koiValues.koi_model_snr || koiParameters.find(p => p.key === 'koi_model_snr')?.defaultValue || 50.0,
						koi_count: koiValues.koi_count || koiParameters.find(p => p.key === 'koi_count')?.defaultValue || 50,
						koi_bin_oedp_sig: koiValues.koi_bin_oedp_sig || koiParameters.find(p => p.key === 'koi_bin_oedp_sig')?.defaultValue || 0.0,
						koi_steff: koiValues.koi_steff || koiParameters.find(p => p.key === 'koi_steff')?.defaultValue || 5778,
						koi_slogg: koiValues.koi_slogg || koiParameters.find(p => p.key === 'koi_slogg')?.defaultValue || 4.44,
						koi_srad: koiValues.koi_srad || koiParameters.find(p => p.key === 'koi_srad')?.defaultValue || 1.0,
						koi_smass: koiValues.koi_smass || koiParameters.find(p => p.key === 'koi_smass')?.defaultValue || 1.0,
						koi_kepmag: koiValues.koi_kepmag || koiParameters.find(p => p.key === 'koi_kepmag')?.defaultValue || 12.0
					},
					predict: true
				};

				console.log('Making ML prediction request with payload:', payload);

				const response = await fetch('/api/ml-predict', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(payload),
				});

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.error || errorData.details || `API request failed with status ${response.status}`);
				}

				const result = await response.json();
				console.log('ML prediction result:', result);
				
				// Store the result for the results page (similar format to DL results)
				const mlResult = {
					candidate_probability: result.candidate_probability,
					non_candidate_probability: result.non_candidate_probability,
					model_used: modelType.toUpperCase(),
					datasource: 'manual',
					features_used: payload.features
				};
				
				sessionStorage.setItem('dlPredictionResult', JSON.stringify(mlResult));
				sessionStorage.setItem('mlModelType', modelType);
				
				// Navigate to results
				router.push('/dashboard/playground/results');

			} catch (err) {
				console.error('ML prediction error:', err);
				const errorMessage = err instanceof Error ? err.message : 'Failed to get ML prediction';
				
				// Check if it's a connection issue
				if (errorMessage.includes('Cannot connect') || 
					errorMessage.includes('ECONNREFUSED') ||
					errorMessage.includes('fetch') || 
					errorMessage.includes('network')) {
					setError('Cannot connect to ML prediction service. Please ensure the service is running on localhost:8000');
				} else if (errorMessage.includes('timeout')) {
					setError('Prediction request timed out. Please try again.');
				} else {
					setError(errorMessage);
				}
			}
		} else if (viewMode === 'upload' && !isRestrictedModel && uploadStatus.stage === 'success') {
			// For GB/SVM models with uploaded CSV data
			setLoading();
			
			try {
				// Extract model type from selected model
				let modelType = 'gb'; // default
				const storedModel = localStorage.getItem('selectedModel');
				if (storedModel) {
					try {
						const parsed = JSON.parse(storedModel);
						const modelId = parsed.id || storedModel;
						if (modelId.toLowerCase().includes('svm')) {
							modelType = 'svm';
						} else if (modelId.toLowerCase().includes('gb') || modelId.toLowerCase().includes('gradient')) {
							modelType = 'gb';
						}
					} catch {
						// Legacy string format
						if (storedModel.toLowerCase().includes('svm')) {
							modelType = 'svm';
						} else if (storedModel.toLowerCase().includes('gb') || storedModel.toLowerCase().includes('gradient')) {
							modelType = 'gb';
						}
					}
				}

				// Get the uploaded CSV data from session storage
				const uploadedDataStr = sessionStorage.getItem('uploadedCSVData');
				if (!uploadedDataStr) {
					throw new Error('No uploaded data found. Please upload a file first.');
				}

				const uploadedData = JSON.parse(uploadedDataStr);
				if (!Array.isArray(uploadedData) || uploadedData.length === 0) {
					throw new Error('Invalid uploaded data format.');
				}

				// Build the prediction payload in the required API format
				const features: Record<string, any> = {};
				
				// Process up to 3 samples and create features-target-X format
				const maxSamples = Math.min(uploadedData.length, 3);
				for (let i = 0; i < maxSamples; i++) {
					const sample = uploadedData[i];
					features[`features-target-${i + 1}`] = {
						koi_period: sample.koi_period,
						koi_time0bk: sample.koi_time0bk,
						koi_impact: sample.koi_impact,
						koi_duration: sample.koi_duration,
						koi_depth: sample.koi_depth,
						koi_incl: sample.koi_incl,
						koi_model_snr: sample.koi_model_snr,
						koi_count: sample.koi_count,
						koi_bin_oedp_sig: sample.koi_bin_oedp_sig,
						koi_steff: sample.koi_steff,
						koi_slogg: sample.koi_slogg,
						koi_srad: sample.koi_srad,
						koi_smass: sample.koi_smass,
						koi_kepmag: sample.koi_kepmag
					};
				}

				const payload = {
					model: modelType,
					datasource: 'upload',
					...features,
					predict: true
				};

				console.log('Making ML prediction request with uploaded CSV data:', payload);

				const response = await fetch('/api/ml-predict', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(payload),
				});

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.error || errorData.details || `API request failed with status ${response.status}`);
				}

				const result = await response.json();
				console.log('ML prediction result for uploaded data:', result);
				
				// Store the result for the results page
				const mlResult = {
					candidate_probability: result.candidate_probability,
					non_candidate_probability: result.non_candidate_probability,
					model_used: modelType.toUpperCase(),
					datasource: 'upload',
					samples_processed: maxSamples,
					predictions: result.predictions || {},
					features_used: uploadedData.slice(0, maxSamples)
				};
				
				sessionStorage.setItem('dlPredictionResult', JSON.stringify(mlResult));
				sessionStorage.setItem('mlModelType', modelType);
				sessionStorage.setItem('uploadSampleCount', maxSamples.toString());
				
				// Navigate to results
				router.push('/dashboard/playground/results');

			} catch (err) {
				console.error('ML prediction error with uploaded data:', err);
				const errorMessage = err instanceof Error ? err.message : 'Failed to get ML prediction';
				
				// Check if it's a connection issue
				if (errorMessage.includes('Cannot connect') || 
					errorMessage.includes('ECONNREFUSED') ||
					errorMessage.includes('fetch') || 
					errorMessage.includes('network')) {
					setError('Cannot connect to ML prediction service. Please ensure the service is running on localhost:8000');
				} else if (errorMessage.includes('timeout')) {
					setError('Prediction request timed out. Please try again.');
				} else {
					setError(errorMessage);
				}
			}
		} else if (viewMode === 'preloaded' && !isRestrictedModel && selectedDataset) {
			// For GB/SVM models with preloaded data
			setLoading();
			
			try {
				// Extract model type from selected model
				let modelType = 'gb'; // default
				const storedModel = localStorage.getItem('selectedModel');
				if (storedModel) {
					try {
						const parsed = JSON.parse(storedModel);
						const modelId = parsed.id || storedModel;
						if (modelId.toLowerCase().includes('svm')) {
							modelType = 'svm';
						} else if (modelId.toLowerCase().includes('gb') || modelId.toLowerCase().includes('gradient')) {
							modelType = 'gb';
						}
					} catch {
						// Legacy string format
						if (storedModel.toLowerCase().includes('svm')) {
							modelType = 'svm';
						} else if (storedModel.toLowerCase().includes('gb') || storedModel.toLowerCase().includes('gradient')) {
							modelType = 'gb';
						}
					}
				}

				// Map dataset selection to API data parameter
				let dataType = 'kepler'; // default
				if (selectedDataset === 'tess-candidates') {
					dataType = 'tess';
				} else if (selectedDataset === 'kepler-validated') {
					dataType = 'kepler';
				}

				// Build the prediction payload for preloaded data
				const payload = {
					model: modelType,
					datasource: 'pre-loaded',
					data: dataType,
					predict: true
				};

				console.log('Making ML preloaded prediction request with payload:', payload);

				const response = await fetch('/api/ml-predict', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(payload),
				});

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.error || errorData.details || `API request failed with status ${response.status}`);
				}

				const result = await response.json();
				console.log('ML preloaded prediction result:', result);
				
				// Store the result for the results page
				const mlResult = {
					candidate_probability: result.candidate_probability,
					non_candidate_probability: result.non_candidate_probability,
					model_used: modelType.toUpperCase(),
					datasource: 'pre-loaded',
					data_type: dataType,
					individual_predictions: {
						first: result.first,
						second: result.second,
						third: result.third,
						fourth: result.fourth,
						fifth: result.fifth,
						sixth: result.sixth,
						seventh: result.seventh,
						eighth: result.eighth,
						ninth: result.ninth,
						tenth: result.tenth
					}
				};
				
				sessionStorage.setItem('dlPredictionResult', JSON.stringify(mlResult));
				sessionStorage.setItem('mlModelType', modelType);
				sessionStorage.setItem('selectedDataset', selectedDataset);
				
				// Navigate to results
				router.push('/dashboard/playground/results');

			} catch (err) {
				console.error('ML preloaded prediction error:', err);
				const errorMessage = err instanceof Error ? err.message : 'Failed to get ML prediction';
				
				// Check if it's a connection issue
				if (errorMessage.includes('Cannot connect') || 
					errorMessage.includes('ECONNREFUSED') ||
					errorMessage.includes('fetch') || 
					errorMessage.includes('network')) {
					setError('Cannot connect to ML prediction service. Please ensure the service is running on localhost:8000');
				} else if (errorMessage.includes('timeout')) {
					setError('Prediction request timed out. Please try again.');
				} else {
					setError(errorMessage);
				}
			}
		} else {
			// For other modes, proceed normally
			router.push('/dashboard/playground/results');
		}
	};

	const allDatasetCards = [
		{
			id: 'kepler-validated',
			name: 'Kepler Objects of Interest Test Data',
			description: 'This includes test data that the model has not seen during training',
			samples: 4892,
			duration: '2009-2017',
		},
		{
			id: 'tess-candidates',
			name: 'TESS Objects of Interest Test Data',
			description: 'This includes test data that the model has not seen during training',
			samples: 2674,
			duration: '2018-2024',
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
									Prepare a CSV file with the 14 required KOI parameters including{' '}
									<code className="px-1 py-0.5 bg-[var(--input-background)] rounded text-[11px]">
										koi_period, koi_time0bk, koi_impact, koi_duration, koi_depth
									</code>
									{' '}and other astronomical measurements. Each row represents one exoplanet candidate. Download the
									template below for the complete format and example data.
								</p>
								<button
									type="button"
									onClick={() => {
										const csvContent = 'koi_period,koi_time0bk,koi_impact,koi_duration,koi_depth,koi_incl,koi_model_snr,koi_count,koi_bin_oedp_sig,koi_steff,koi_slogg,koi_srad,koi_smass,koi_kepmag\n10.0051,136.8303,0.148,3.481,143.3,89.61,11.4,2,0.4606,5912,4.453,0.924,0.884,14.634\n9.7423,122.2839,0.251,4.125,289.7,87.34,18.7,3,0.812,6142,4.298,1.087,1.156,13.891\n15.3741,145.762,0.089,2.847,78.9,91.23,9.8,1,0.234,5634,4.567,0.789,0.723,15.123';
										const blob = new Blob([csvContent], {
											type: 'text/csv;charset=utf-8;',
										});
										const url = URL.createObjectURL(blob);
										const a = document.createElement('a');
										a.href = url;
										a.download = 'koi-parameters-template.csv';
										a.click();
										URL.revokeObjectURL(url);
									}}
									className="px-4 py-2 rounded-md border border-black bg-black text-white text-sm font-medium hover:opacity-90"
								>
									Download Template (koi-parameters-template.csv)
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
														processUpload();
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
													Validate & Process
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
										For the Gradient Boosting and Support Vector Machine models, data obtained from the NASA Exoplanet Archive was used. The K2 dataset wasn't used - only Kepler Objects of Interest (KOI) and TESS Objects of Interest (TOI) were utilized for model development.
									</p>
									
									<div className="mb-6">
										<h4 className="text-sm font-semibold mb-3 text-black">Selected Features for Model Development:</h4>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs">
											{[
												'koi_period',
												'koi_time0bk', 
												'koi_impact',
												'koi_duration',
												'koi_depth',
												'koi_incl',
												'koi_model_snr',
												'koi_count',
												'koi_bin_oedp_sig',
												'koi_steff',
												'koi_slogg',
												'koi_srad',
												'koi_smass',
												'koi_kepmag'
											].map((feature) => (
												<div key={feature} className="flex items-center gap-2 p-1.5 bg-[var(--input-background)] rounded border border-[var(--input-border)]">
													<span className="font-mono text-[11px]">{feature}</span>
												</div>
											))}
										</div>
									</div>

									<div className="space-y-2 text-sm">
										<div className="flex justify-between">
											<span className="text-[var(--text-secondary)]">
												KOI Dataset Records:
											</span>
											<span className="font-medium">~7,000</span>
										</div>
										<div className="flex justify-between">
											<span className="text-[var(--text-secondary)]">
												TOI Dataset Records:
											</span>
											<span className="font-medium">~5,000</span>
										</div>
										<div className="flex justify-between">
											<span className="text-[var(--text-secondary)]">
												Data Source:
											</span>
											<span className="font-medium">NASA Exoplanet Archive</span>
										</div>
										<div className="flex justify-between">
											<span className="text-[var(--text-secondary)]">
												Features Used:
											</span>
											<span className="font-medium">14 Selected Parameters</span>
										</div>
									</div>
								</div>
								<div className="flex items-center justify-center">
									<div className="bg-[var(--placeholder-color)] h-[240px] w-full rounded-lg border border-[var(--input-border)] flex items-center justify-center">
										<span className="text-[var(--text-secondary)] text-sm">
											Feature Distribution
										</span>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</>
			)}

			{/* Preloaded restricted (Kepler ID input) */}
			{viewMode === 'preloaded' && isRestrictedModel && (
				<>
					<Card>
						<CardTitle>Kepler ID Input</CardTitle>
						<CardContent>
							<p className="text-sm text-[var(--text-secondary)] mb-4 max-w-2xl">
								Enter a Kepler ID from the test database to analyze with the{' '}
								<span className="font-medium">{selectedModel || 'CNN/DNN'}</span> model.
								The model requires individual processed observations for evaluation.
							</p>
							
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
								{/* Left side - Input form */}
								<div className="space-y-3">
									<div className="space-y-2">
										<label className="block text-sm font-medium text-gray-700">
											Kepler ID
										</label>
										<div className="relative">
											<input
												type="text"
												value={keplerIdInput}
												onChange={(e) => handleKeplerIdChange(e.target.value)}
												placeholder={loadingKeplerIds ? "Loading allowed IDs..." : "Enter Kepler ID (e.g., 10904857)"}
												disabled={loadingKeplerIds}
												className={`w-full p-3 border rounded-lg font-mono text-sm transition-colors ${
													loadingKeplerIds
														? 'border-gray-300 bg-gray-100 text-gray-500'
														: keplerIdValid === true
														? 'border-green-500 bg-green-50'
														: keplerIdValid === false
														? 'border-red-500 bg-red-50'
														: 'border-[var(--input-border)] bg-[var(--input-background)]'
												}`}
											/>
											{keplerIdValid === true && (
												<div className="absolute right-3 top-1/2 -translate-y-1/2">
													<svg
														xmlns="http://www.w3.org/2000/svg"
														viewBox="0 0 20 20"
														fill="currentColor"
														className="w-5 h-5 text-green-600"
													>
														<path
															fillRule="evenodd"
															d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
															clipRule="evenodd"
														/>
													</svg>
												</div>
											)}
											{keplerIdValid === false && (
												<div className="absolute right-3 top-1/2 -translate-y-1/2">
													<svg
														xmlns="http://www.w3.org/2000/svg"
														viewBox="0 0 20 20"
														fill="currentColor"
														className="w-5 h-5 text-red-600"
													>
														<path
															fillRule="evenodd"
															d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
															clipRule="evenodd"
														/>
													</svg>
												</div>
											)}
										</div>
									</div>
									
									{keplerIdValid === false && keplerIdInput.trim() !== '' && (
										<p className="text-sm text-red-600">
											Kepler ID not found in test database. Please enter a valid ID from the allowed list.
										</p>
									)}
									
									{keplerIdValid === true && (
										<p className="text-sm text-green-600 flex items-center gap-2">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 20 20"
												fill="currentColor"
												className="w-4 h-4"
											>
												<path
													fillRule="evenodd"
													d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
													clipRule="evenodd"
												/>
											</svg>
											Valid Kepler ID found in test database
										</p>
									)}
									
									{loadingKeplerIds ? (
										<div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
											<svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
												<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
												<path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
											</svg>
											Loading allowed Kepler IDs from database...
										</div>
									) : (
										<div className="text-xs text-[var(--text-secondary)] space-y-1">
											<p className="font-medium">Available Kepler IDs: {allowedKeplerIds.size} total</p>
											<p>Click any ID from the list on the right to select it</p>
										</div>
									)}
								</div>

								{/* Right side - Scrollable list of Kepler IDs */}
								<div className="space-y-2">
									<label className="block text-sm font-medium text-gray-700">
										Available Kepler IDs ({allowedKeplerIds.size} total)
									</label>
									{loadingKeplerIds ? (
										<div className="flex items-center justify-center h-64 bg-[var(--input-background)] border border-[var(--input-border)] rounded-lg">
											<div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
												<svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
													<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
													<path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
												</svg>
												Loading Kepler IDs...
											</div>
										</div>
									) : (
										<div className="h-64 bg-white border border-[var(--input-border)] rounded-lg overflow-hidden">
											<div className="h-full overflow-y-auto p-2 space-y-1">
												{Array.from(allowedKeplerIds)
													.sort((a, b) => parseInt(a) - parseInt(b))
													.map((keplerId) => (
													<button
														key={keplerId}
														onClick={() => handleKeplerIdChange(keplerId)}
														className={`w-full text-left px-3 py-2 text-xs font-mono rounded transition-colors ${
															keplerIdInput.trim() === keplerId
																? 'bg-black text-white'
																: 'hover:bg-[var(--hover-background)] bg-[var(--input-background)]'
														}`}
													>
														{keplerId}
													</button>
												))}
											</div>
										</div>
									)}
									<p className="text-xs text-[var(--text-secondary)]">
										Scroll through the list and click any ID to select it
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardTitle>Dataset Overview</CardTitle>
						<CardContent>
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
								<div>
									<p className="leading-relaxed text-sm mb-4">
										For training and validation, a selected set of KOI were taken due to time constraints and larger training times required for both CNNs & DNNs. The randomly selected 2,000 targets were chosen by looking at data quality, ensuring 1,000 are exoplanets and 1,000 are not exoplanets.
									</p>
									
									<p className="leading-relaxed text-sm mb-4">
										For the selected 2,000 data records, extracted features were downloaded using NASA Exoplanet Archive, and then using the LightKurve package for Python, all the light curve FITS files were obtained. From these light curve files, a set of unique features were extracted.
									</p>
									
									<div className="mb-6">
										<h4 className="text-sm font-semibold mb-3 text-black">Data Components Used:</h4>
										<div className="space-y-1 text-xs">
											{[
												'Raw light curves',
												'Light curve extracted features', 
												'Kepler extracted features',
												'Stellar properties'
											].map((component) => (
												<div key={component} className="flex items-center gap-2 p-1.5 bg-[var(--input-background)] rounded border border-[var(--input-border)]">
													<div className="w-2 h-2 bg-black rounded-full flex-shrink-0"></div>
													<span className="text-[11px]">{component}</span>
												</div>
											))}
										</div>
									</div>

									<div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
										<p className="text-xs text-blue-800 leading-relaxed">
											<strong>Note:</strong> Both for training and predictions, the raw light curve data and extracted features are used. This is why manual uploading is disabled for these models.
										</p>
									</div>

									<div className="space-y-2 text-sm">
										<div className="flex justify-between">
											<span className="text-[var(--text-secondary)]">
												Total Available Samples:
											</span>
											<span className="font-medium">2,000</span>
										</div>
										<div className="flex justify-between">
											<span className="text-[var(--text-secondary)]">
												Class Balance:
											</span>
											<span className="font-medium">1,000 each (50/50)</span>
										</div>
										<div className="flex justify-between">
											<span className="text-[var(--text-secondary)]">
												Data Source:
											</span>
											<span className="font-medium">NASA Exoplanet Archive</span>
										</div>
										<div className="flex justify-between">
											<span className="text-[var(--text-secondary)]">
												Preprocessing:
											</span>
											<span className="font-medium">LightKurve Package</span>
										</div>
									</div>
									
									<div className="mt-4 text-xs text-[var(--text-secondary)]">
										<p>
											<strong>Preprocessing:</strong> A separate light curve preprocessing was concluded during the extraction. For more information, see the original GitHub repository.
										</p>
									</div>
								</div>
								<div className="flex items-center justify-center">
									<div className="bg-[var(--placeholder-color)] h-[240px] w-full rounded-lg border border-[var(--input-border)] flex items-center justify-center">
										<span className="text-[var(--text-secondary)] text-sm">
											Light Curve Distribution
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
				<>
					{/* Error display */}
					{error && (
						<div className="fixed bottom-24 right-6 z-20 max-w-md">
							<div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
								<div className="flex items-start gap-3">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0"
										fill="none"
										viewBox="0 0 24 24"
										strokeWidth={2}
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
										/>
									</svg>
									<div className="flex-1">
										<p className="text-sm text-red-800 font-medium mb-1">
											Prediction Failed
										</p>
										<p className="text-sm text-red-700">{error}</p>
									</div>
									<button
										onClick={clearError}
										className="text-red-400 hover:text-red-600 transition-colors"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className="h-4 w-4"
											fill="none"
											viewBox="0 0 24 24"
											strokeWidth={2}
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												d="M6 18L18 6M6 6l12 12"
											/>
										</svg>
									</button>
								</div>
							</div>
						</div>
					)}

					{/* Action button */}
					<div className="fixed bottom-6 right-6 z-20">
						<button
							onClick={handleEvaluate}
							aria-label={
								status === 'loading' 
									? 'Processing...' 
									: isReady 
									? 'Evaluate Results' 
									: 'Select input source'
							}
							disabled={!isReady || status === 'loading'}
							className={`rounded-full px-5 py-3 font-semibold text-sm shadow-[0px_0px_8px_1px_rgba(0,0,0,0.10)] transition flex items-center gap-2 ${
								status === 'loading'
									? 'bg-gray-300 text-gray-500 cursor-not-allowed'
									: isReady
									? 'bg-black text-white hover:opacity-90'
									: 'bg-[var(--input-background)] text-[var(--text-secondary)] border border-[var(--input-border)] cursor-not-allowed'
							}`}
						>
							{status === 'loading' ? (
								<>
									<svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
										<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
										<path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
									</svg>
									<span>Processing...</span>
								</>
							) : (
								<>
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
								</>
							)}
						</button>
					</div>
				</>
			)}
		</div>
	);
}
