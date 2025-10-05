'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardTitle, CardContent } from '../../ui/Card';
import Link from 'next/link';
import Image from 'next/image';
import {
	getFeatureDescription,
	getFeatureCategory,
} from '../../../lib/keplerFeatureDescriptions';

// IMPLEMENTATION UPDATE: Import enhanced CSV parser and types
import { CSVParser } from '../../../lib/ml/parsing/csv';
import type {
	ColumnType,
	InferredColumnMeta,
	RawDataset,
} from '../../../types/ml';
import { useClassroomStore } from '../../../lib/ml/state/classroomStore';

export default function ClassroomDataInputTab() {
	const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
	const [isUploading, setIsUploading] = useState(false);
	const [isParsing, setIsParsing] = useState(false);
	const [parseError, setParseError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// IMPLEMENTATION UPDATE: Use classroom store for state management
	const [classroomState, classroomStore] = useClassroomStore();

	// Local UI state
	const [showDataPreview, setShowDataPreview] = useState(false);
	// New popup state for data upload guide & upload UI
	const [showUploadPopup, setShowUploadPopup] = useState(false);

	// Extract state from store
	const {
		selectedDataSource,
		rawDataset,
		columnMeta,
		targetColumn,
		selectedFeatures,
		missingValueStrategy,
		normalization,
	} = classroomState.dataInput;

	// IMPLEMENTATION UPDATE: Enhanced CSV parsing with validation and store integration
	const parseCSV = async (
		csvContent: string,
		filename: string,
	): Promise<void> => {
		try {
			// Use enhanced CSV parser with validation
			const { rawDataset, columnMeta } = await CSVParser.parseCSV(
				csvContent,
				filename,
				1000, // Limit for performance
			);

			// Store the parsed data
			classroomStore.setRawDataset(rawDataset, columnMeta);
			setShowDataPreview(true);
			setParseError(null);
		} catch (error) {
			console.error('Enhanced CSV parsing error:', error);
			setParseError(
				error instanceof Error ? error.message : 'Unknown parsing error',
			);
			throw error;
		}
	};

	const inferColumnType = (values: string[]): ColumnType => {
		if (values.length === 0) return 'text';

		// Boolean detection
		const booleanValues = new Set(['true', 'false', '1', '0', 'yes', 'no']);
		const lowercaseValues = values.map((v) => v.toLowerCase());
		if (lowercaseValues.every((v) => booleanValues.has(v))) {
			return 'boolean';
		}

		// Numeric detection
		const numericCount = values.filter((v) => {
			const num = parseFloat(v);
			return !isNaN(num) && isFinite(num);
		}).length;

		if (numericCount / values.length >= 0.8) {
			return 'numeric';
		}

		// Categorical detection
		const uniqueValues = new Set(values);
		if (uniqueValues.size <= 30 && uniqueValues.size < values.length * 0.5) {
			return 'categorical';
		}

		return 'text';
	};

	const analyzeDataset = (
		header: string[],
		rows: string[][],
	): InferredColumnMeta[] => {
		return header.map((name, index) => {
			const values = rows
				.map((row) => row[index] || '')
				.filter((v) => v.trim() !== '');
			const inferredType = inferColumnType(values);

			const meta: InferredColumnMeta = {
				name,
				index,
				inferredType,
				missingCount: rows.length - values.length,
			};

			if (inferredType === 'numeric') {
				const numericValues = values
					.map((v) => parseFloat(v))
					.filter((v) => !isNaN(v));
				if (numericValues.length > 0) {
					meta.min = Math.min(...numericValues);
					meta.max = Math.max(...numericValues);
					meta.mean =
						numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
				}
			} else if (inferredType === 'categorical') {
				meta.uniqueValues = Array.from(new Set(values)).slice(0, 20);
			}

			return meta;
		});
	};

	// Track latest dataset load to avoid race conditions
	const activeLoadIdRef = useRef(0);

	// IMPLEMENTATION UPDATE: Load real Kepler dataset with enhanced parsing (version-aware)
	const loadKeplerDataset = async (loadId: number) => {
		try {
			setIsParsing(true);
			// Fetch KOI classroom CSV through API (ensures server-side file access & future preprocessing)
			const response = await fetch('/api/classroom/koi');
			if (!response.ok) {
				throw new Error('Failed to load KOI classroom dataset');
			}

			const csvContent = await response.text();
			// If a newer selection happened while fetching, abort applying
			if (loadId !== activeLoadIdRef.current) return;
			await parseCSV(csvContent, 'KOI-Classroom-Data.csv');

			// Auto-select target and features for Kepler dataset
			// Attempt to detect a suitable target column - fall back to first categorical/boolean
			const metaAfter = classroomStore.getState().dataInput.columnMeta;
			let targetCol = 'koi_disposition';
			if (!metaAfter?.some((m) => m.name === targetCol)) {
				const candidate = metaAfter?.find(
					(m) =>
						m.inferredType === 'categorical' || m.inferredType === 'boolean',
				);
				if (candidate) targetCol = candidate.name;
			}
			const features = [
				'koi_period',
				'koi_impact',
				'koi_duration',
				'koi_depth',
				'koi_prad',
				'koi_teq',
				'koi_insol',
				'koi_model_snr',
				'koi_steff',
				'koi_slogg',
				'koi_srad',
				'koi_kepmag',
				'ra',
				'dec',
			];

			if (loadId === activeLoadIdRef.current) {
				classroomStore.setTargetColumn(targetCol);
				classroomStore.setSelectedFeatures(features);
			}
		} catch (error) {
			console.error('Kepler dataset loading error:', error);
			setParseError(
				'Failed to load Kepler dataset. Please try uploading your own data.',
			);
		} finally {
			if (loadId === activeLoadIdRef.current) setIsParsing(false);
		}
	};

	// NEW: Load K2 dataset (version-aware)
	const loadK2Dataset = async (loadId: number) => {
		try {
			setIsParsing(true);
			const response = await fetch('/api/classroom/k2');
			if (!response.ok) {
				throw new Error('Failed to load K2 classroom dataset');
			}
			const csvContent = await response.text();
			if (loadId !== activeLoadIdRef.current) return;
			await parseCSV(csvContent, 'K2-Classroom-Data.csv');

			// Infer sensible target (reuse koi_disposition fallback logic style)
			const metaAfter = classroomStore.getState().dataInput.columnMeta;
			let targetCol = 'k2_disposition';
			if (!metaAfter?.some((m) => m.name === targetCol)) {
				const candidate = metaAfter?.find(
					(m) =>
						m.inferredType === 'categorical' || m.inferredType === 'boolean',
				);
				if (candidate) targetCol = candidate.name;
			}

			// Select numeric/categorical features excluding target
			const features =
				metaAfter
					?.filter(
						(m) =>
							m.name !== targetCol &&
							(m.inferredType === 'numeric' ||
								m.inferredType === 'categorical'),
					)
					.map((m) => m.name) || [];

			if (loadId === activeLoadIdRef.current) {
				classroomStore.setTargetColumn(targetCol);
				classroomStore.setSelectedFeatures(features);
			}
		} catch (error) {
			console.error('K2 dataset loading error:', error);
			setParseError('Failed to load K2 dataset.');
		} finally {
			if (loadId === activeLoadIdRef.current) setIsParsing(false);
		}
	};

	// NEW: Load TESS dataset (version-aware)
	const loadTessDataset = async (loadId: number) => {
		try {
			setIsParsing(true);
			const response = await fetch('/api/classroom/tess');
			if (!response.ok) {
				throw new Error('Failed to load TESS classroom dataset');
			}
			const csvContent = await response.text();
			if (loadId !== activeLoadIdRef.current) return;
			await parseCSV(csvContent, 'TESS-Classroom-Data.csv');
			const metaAfter = classroomStore.getState().dataInput.columnMeta;
			let targetCol = 'tess_disposition';
			if (!metaAfter?.some((m) => m.name === targetCol)) {
				const candidate = metaAfter?.find(
					(m) =>
						m.inferredType === 'categorical' || m.inferredType === 'boolean',
				);
				if (candidate) targetCol = candidate.name;
			}
			const features =
				metaAfter
					?.filter(
						(m) =>
							m.name !== targetCol &&
							(m.inferredType === 'numeric' ||
								m.inferredType === 'categorical'),
					)
					.map((m) => m.name) || [];
			if (loadId === activeLoadIdRef.current) {
				classroomStore.setTargetColumn(targetCol);
				classroomStore.setSelectedFeatures(features);
			}
		} catch (error) {
			console.error('TESS dataset loading error:', error);
			setParseError('Failed to load TESS dataset.');
		} finally {
			if (loadId === activeLoadIdRef.current) setIsParsing(false);
		}
	};

	// IMPLEMENTATION UPDATE: Load sample dataset with enhanced parsing (version-aware)
	const loadSampleDataset = async (source: string, loadId: number) => {
		const sampleCSV = `planet_name,radius,mass,t_eff,logg,disposition
KEPLER-1088.01,8,1.8,6129.0,4.24,CONFIRMED
KEPLER-1089.01,5,0.9,5270.0,4.54,CANDIDATE
KEPLER-108.01,3,0.6,4652.0,4.59,CONFIRMED
KEPLER-110.01,7,1.5,5880.0,4.48,FALSE_POSITIVE
KEPLER-111.01,4,0.8,5456.0,4.61,CONFIRMED
KEPLER-112.01,6,1.2,6045.0,4.38,FALSE_POSITIVE
KEPLER-113.01,3.5,0.7,5123.0,4.55,CONFIRMED
KEPLER-114.01,9,2.1,6234.0,4.21,CANDIDATE
KEPLER-115.01,5.5,1.1,5678.0,4.47,CONFIRMED
KEPLER-116.01,2.8,0.5,4890.0,4.62,FALSE_POSITIVE`;

		try {
			// If a newer selection already happened, bail early before heavy work
			if (loadId !== activeLoadIdRef.current) return;
			await parseCSV(sampleCSV, `${source}-sample.csv`);

			// Auto-select target and features for sample data
			const targetCol = 'disposition';
			const currentMeta = classroomStore.getState().dataInput.columnMeta;
			const features =
				currentMeta
					?.filter(
						(col) =>
							col.name !== targetCol &&
							(col.inferredType === 'numeric' ||
								col.inferredType === 'categorical'),
					)
					.map((col) => col.name) || [];

			if (loadId === activeLoadIdRef.current) {
				classroomStore.setTargetColumn(targetCol);
				classroomStore.setSelectedFeatures(features);
			}
		} catch (error) {
			console.error('Sample dataset loading error:', error);
		}
	};

	// Load real Kepler data on component mount
	useEffect(() => {
		const initialLoadId = ++activeLoadIdRef.current;
		if (selectedDataSource === 'kepler' && !rawDataset) {
			loadKeplerDataset(initialLoadId);
		} else if (selectedDataSource === 'k2' && !rawDataset) {
			loadK2Dataset(initialLoadId);
		} else if (selectedDataSource === 'tess' && !rawDataset) {
			loadTessDataset(initialLoadId);
		} else if (
			selectedDataSource !== 'own' &&
			selectedDataSource !== 'kepler' &&
			selectedDataSource !== 'k2' &&
			selectedDataSource !== 'tess' &&
			!rawDataset
		) {
			loadSampleDataset(selectedDataSource, initialLoadId);
		}
		if (selectedDataSource === 'own') {
			setShowUploadPopup(true);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// IMPLEMENTATION UPDATE: Handle data source selection with store integration
	const handleDataSourceChange = (source: string) => {
		// Increment load version
		const loadId = ++activeLoadIdRef.current;
		classroomStore.setDataSource(source as any);
		setParseError(null);
		if (source === 'kepler') {
			loadKeplerDataset(loadId);
			setShowUploadPopup(false);
		} else if (source === 'k2') {
			loadK2Dataset(loadId);
			setShowUploadPopup(false);
		} else if (source === 'tess') {
			loadTessDataset(loadId);
			setShowUploadPopup(false);
		} else if (source === 'own') {
			// Reset for own data upload
			classroomStore.setRawDataset(undefined as any, []);
			classroomStore.setTargetColumn('');
			classroomStore.setSelectedFeatures([]);
			setShowDataPreview(false);
			setIsParsing(false);
			setShowUploadPopup(true); // auto open popup
		} else {
			loadSampleDataset(source, loadId);
			setShowUploadPopup(false);
		}
	};

	// IMPLEMENTATION UPDATE: Handle target column selection with store integration
	const handleTargetColumnChange = (columnName: string) => {
		classroomStore.setTargetColumn(columnName);

		// Remove target from features if selected
		const currentFeatures = selectedFeatures || [];
		const newFeatures = currentFeatures.filter((f) => f !== columnName);
		classroomStore.setSelectedFeatures(newFeatures);
	};

	// IMPLEMENTATION UPDATE: Handle feature selection with store integration
	const handleFeatureToggle = (columnName: string) => {
		const currentFeatures = selectedFeatures || [];
		const newFeatures = currentFeatures.includes(columnName)
			? currentFeatures.filter((f) => f !== columnName)
			: [...currentFeatures, columnName];

		classroomStore.setSelectedFeatures(newFeatures);
	};

	// IMPLEMENTATION UPDATE: Handle column type override (not implemented in store yet)
	const handleColumnTypeChange = (columnIndex: number, newType: ColumnType) => {
		if (!columnMeta) return;

		const updatedMeta = [...columnMeta];
		updatedMeta[columnIndex] = {
			...updatedMeta[columnIndex],
			inferredType: newType,
		};
		// Note: Store doesn't have a method for this yet, would need to be added
		console.warn('Column type override not yet implemented in store');
	};

	// Handle logging data when Select Model button is clicked
	const handleSelectModelClick = () => {
		const dataInputSummary = {
			selectedDataSource,
			targetColumn,
			selectedFeatures,
			missingValueStrategy,
			normalization,
			datasetInfo: rawDataset
				? {
						name: rawDataset.name,
						totalRows: rawDataset.rows.length,
						totalColumns: rawDataset.header.length,
						header: rawDataset.header,
						sampleData: rawDataset.rows.slice(0, 3), // First 3 rows as sample
				  }
				: null,
			columnMetadata: columnMeta?.map((col) => ({
				name: col.name,
				type: col.inferredType,
				missingCount: col.missingCount,
				...(col.inferredType === 'numeric' && {
					statistics: {
						min: col.min,
						max: col.max,
						mean: col.mean,
					},
				}),
				...(col.inferredType === 'categorical' && {
					uniqueValues: col.uniqueValues,
				}),
			})),
			readinessCheck: {
				hasDataset: !!rawDataset,
				hasTargetColumn: !!targetColumn,
				hasFeatures: (selectedFeatures?.length || 0) > 0,
				featureCount: selectedFeatures?.length || 0,
				isReadyForTraining: !!(
					rawDataset &&
					targetColumn &&
					(selectedFeatures?.length || 0) > 0
				),
			},
			timestamp: new Date().toISOString(),
		};

		console.group('🔍 Data Input Summary - Before Model Selection');
		console.log('📊 Dataset Information:', {
			source: dataInputSummary.selectedDataSource,
			name: dataInputSummary.datasetInfo?.name,
			rows: dataInputSummary.datasetInfo?.totalRows,
			columns: dataInputSummary.datasetInfo?.totalColumns,
		});
		console.log('🎯 Target Column:', dataInputSummary.targetColumn);
		console.log('🔧 Selected Features:', dataInputSummary.selectedFeatures);
		console.log('📈 Column Metadata:', dataInputSummary.columnMetadata);
		console.log('⚙️ Configuration:', {
			missingValueStrategy: dataInputSummary.missingValueStrategy,
			normalization: dataInputSummary.normalization,
		});
		console.log('✅ Readiness Check:', dataInputSummary.readinessCheck);
		console.log('📋 Complete Data Summary:', dataInputSummary);
		console.groupEnd();
	};

	// Handle download template
	const handleDownloadTemplate = () => {
		// Create CSV content for Kepler-style exoplanet data template
		const csvContent =
			'koi_disposition,koi_period,koi_impact,koi_duration,koi_depth,koi_prad,koi_teq,koi_insol,koi_steff,koi_slogg,koi_srad,koi_kepmag\n' +
			'CONFIRMED,9.488,0.146,2.958,615.8,2.26,793.0,93.59,5455.0,4.467,0.927,15.347\n' +
			'CANDIDATE,19.899,0.969,1.782,10829.0,14.6,638.0,39.3,5853.0,4.544,0.868,15.436\n' +
			'FALSE POSITIVE,1.737,1.276,2.406,8079.2,33.46,1395.0,891.96,5805.0,4.564,0.791,15.597\n' +
			'CONFIRMED,2.526,0.701,1.655,603.3,2.75,1406.0,926.16,6031.0,4.438,1.046,15.509\n' +
			'CANDIDATE,11.094,0.538,4.595,1517.5,3.9,835.0,114.81,6046.0,4.486,0.972,15.714\n';

		// Create a Blob and download link
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.setAttribute('href', url);
		link.setAttribute('download', 'kepler-template.csv');
		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	// Handle file upload trigger
	const handleUploadTrigger = () => {
		fileInputRef.current?.click();
	};

	// IMPLEMENTATION UPDATE: Handle file upload with enhanced CSV parsing
	const handleFileUpload = async (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = event.target.files?.[0];
		if (!file) return;

		// Validate file type
		if (!file.name.toLowerCase().endsWith('.csv')) {
			setParseError('Please upload a CSV file');
			return;
		}

		setIsUploading(true);
		setIsParsing(true);
		setUploadedFileName(file.name);
		setParseError(null);

		try {
			// Read file content
			const csvContent = await file.text();

			// Use enhanced CSV parser
			await parseCSV(csvContent, file.name);

			// Auto-select features (numeric and categorical columns)
			const currentMeta = classroomStore.getState().dataInput.columnMeta;
			const features =
				currentMeta
					?.filter(
						(col) =>
							col.inferredType === 'numeric' ||
							col.inferredType === 'categorical',
					)
					.map((col) => col.name) || [];

			classroomStore.setSelectedFeatures(features);
			classroomStore.setDataSource('own');
		} catch (error) {
			console.error('CSV parsing error:', error);
			setParseError(
				`Failed to parse CSV: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`,
			);
		} finally {
			setIsUploading(false);
			setIsParsing(false);
		}
	};

	return (
		<div className="grid grid-cols-1 gap-6 relative">
			{/* Workflow Navigation */}
			<div className="flex items-center justify-center w-full mb-2">
				<div className="flex items-center space-x-2 md:space-x-4 bg-white px-6 py-3 rounded-xl shadow-sm">
					{/* Data Input - Active */}
					<div className="flex items-center">
						<div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center">
							<span className="text-sm font-bold">1</span>
						</div>
						<span className="ml-2 text-sm font-medium">Data Input</span>
					</div>

					{/* Connector Line */}
					<div className="w-8 h-0.5 bg-[#E6E7E9]"></div>

					{/* Model Selection - Upcoming */}
					<div className="flex items-center">
						<div className="w-8 h-8 rounded-full bg-[#E6E7E9] text-gray-500 flex items-center justify-center">
							<span className="text-sm font-bold">2</span>
						</div>
						<span className="ml-2 text-sm font-medium text-gray-500">
							Model Selection
						</span>
					</div>

					{/* Connector Line */}
					<div className="w-8 h-0.5 bg-[#E6E7E9]"></div>

					{/* Train & Validate - Upcoming (now final step) */}
					<div className="flex items-center">
						<div className="w-8 h-8 rounded-full bg-[#E6E7E9] text-gray-500 flex items-center justify-center">
							<span className="text-sm font-bold">3</span>
						</div>
						<span className="ml-2 text-sm font-medium text-gray-500">
							Train & Validate
						</span>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-4">
				{/* Data Source Card (expanded width) */}
				<Card className="w-full">
					<CardTitle className="flex items-center justify-between">
						<span>Select a Data Source</span>
					</CardTitle>
					<CardContent>
						<p className="mb-4">
							Select a data source to create your custom model. We've
							pre-processed several datasets as starting points for your
							training. Visit our documentation for detailed information about
							each dataset and their characteristics.
						</p>

						<div className="space-y-3 mt-6 max-w-3xl">
							<fieldset
								className="space-y-3"
								aria-label="Dataset Source"
								onKeyDown={(e) => {
									const order = ['kepler', 'k2', 'tess', 'own'] as const;
									const idx = order.indexOf(selectedDataSource as any);
									if (['ArrowDown', 'ArrowRight'].includes(e.key)) {
										e.preventDefault();
										const next = order[(idx + 1) % order.length];
										handleDataSourceChange(next);
									} else if (['ArrowUp', 'ArrowLeft'].includes(e.key)) {
										e.preventDefault();
										const prev = order[(idx - 1 + order.length) % order.length];
										handleDataSourceChange(prev);
									}
								}}
							>
								{[
									{
										value: 'kepler',
										label: 'Kepler Database (9,566 exoplanet candidates)',
										desc: 'Real NASA data with 28 astronomical features',
										accent: 'black',
									},
									{
										value: 'k2',
										label: 'K2 Database',
										desc: 'Extended Kepler mission data',
										accent: 'black',
									},
									{
										value: 'tess',
										label: 'TESS Database',
										desc: 'Transiting Exoplanet Survey Satellite data',
										accent: 'black',
									},
									{
										value: 'own',
										label: 'Upload your own Data',
										desc: '🎯 Custom data upload mode activated',
										accent: 'blue',
									},
								].map((opt) => {
									const active = selectedDataSource === opt.value;
									const accentColor =
										opt.accent === 'blue' ? 'blue-500' : 'black';
									return (
										<label
											key={opt.value}
											className={`flex items-center p-3 rounded-lg border transition-all cursor-pointer select-none ${
												active
													? opt.accent === 'blue'
														? 'border-blue-500 bg-blue-50 shadow-sm'
														: 'border-black bg-gray-50 shadow-sm'
													: 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
											}`}
										>
											<input
												type="radio"
												name="dataset-source"
												value={opt.value}
												checked={active}
												onChange={() => handleDataSourceChange(opt.value)}
												className="sr-only"
											/>
											<div
												className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
													active
														? opt.accent === 'blue'
															? 'border-blue-500'
															: 'border-black'
														: ''
												}`}
											>
												{active && (
													<div
														className={`w-3 h-3 rounded-full ${
															opt.accent === 'blue' ? 'bg-blue-500' : 'bg-black'
														}`}
													></div>
												)}
											</div>
											<div className="ml-3 flex-1">
												<span
													className={`text-sm font-medium ${
														active && opt.accent === 'blue'
															? 'text-blue-700'
															: ''
													}`}
												>
													{opt.label}
												</span>
												{active && (
													<p
														className={`text-xs mt-1 ${
															opt.accent === 'blue'
																? 'text-blue-600'
																: 'text-gray-600'
														}`}
													>
														{opt.desc}
													</p>
												)}
											</div>
										</label>
									);
								})}
							</fieldset>
						</div>
					</CardContent>
				</Card>

				{/* Popup Modal for Upload & Guide */}
				{showUploadPopup && (
					<div className="fixed inset-0 z-40 flex items-center justify-center">
						<div
							className="absolute inset-0 bg-black/40 backdrop-blur-sm"
							onClick={() => setShowUploadPopup(false)}
						></div>
						<div className="relative z-50 w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-gray-300 max-h-[90vh] overflow-y-auto p-6">
							<div className="flex items-start justify-between mb-4">
								<h2 className="text-lg font-semibold">
									Data Upload Guide & Upload Your Own Data
								</h2>
								<button
									aria-label="Close"
									onClick={() => setShowUploadPopup(false)}
									className="w-8 h-8 rounded-md border border-gray-300 flex items-center justify-center hover:bg-gray-100"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth={1.5}
										className="w-5 h-5"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
								</button>
							</div>
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
								<div>
									<p className="text-sm mb-4">
										{selectedDataSource === 'own'
											? 'Follow this format to prepare your data. Download the template below for the exact structure required.'
											: 'Your data should be uploaded in the following format. Download the sample .csv file to get an idea or visit documentation for more information.'}
									</p>
									<button
										onClick={handleDownloadTemplate}
										className="border rounded-xl p-4 flex items-center w-full transition-colors bg-[#f9f9f9] border-[#afafaf] hover:bg-gray-100"
									>
										<div className="w-10 h-10 mr-4 text-gray-600">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												fill="none"
												viewBox="0 0 24 24"
												strokeWidth={1.5}
												stroke="currentColor"
												className="w-full h-full"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
												/>
											</svg>
										</div>
										<div>
											<p className="font-semibold text-base text-left">
												Download template file
											</p>
											<p className="text-left text-neutral-500">
												kepler-template.csv
											</p>
										</div>
									</button>
									<div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
										<h4 className="text-sm font-medium text-blue-800 mb-2">
											📋 Upload Requirements:
										</h4>
										<ul className="text-xs text-blue-700 space-y-1">
											<li>• CSV format with header row</li>
											<li>• At least 5 rows of data for training</li>
											<li>• Include both features and target column</li>
											<li>• Use numeric values where possible</li>
										</ul>
									</div>
								</div>
								<div className="flex flex-col">
									<input
										type="file"
										ref={fileInputRef}
										accept=".csv,.xlsx,.xls"
										onChange={handleFileUpload}
										className="hidden"
									/>
									<button
										onClick={handleUploadTrigger}
										style={{
											border: '2px solid #000',
											borderRadius: '0.75rem',
										}}
										className="flex flex-col items-center justify-center w-full h-64 bg-white transition-colors"
										disabled={isUploading}
									>
										{isUploading ? (
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
										) : (
											<svg
												className="w-10 h-10 mb-4"
												xmlns="http://www.w3.org/2000/svg"
												fill="none"
												viewBox="0 0 24 24"
												strokeWidth={1.5}
												stroke="currentColor"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
												/>
											</svg>
										)}
										<h3 className="font-semibold text-lg mb-2">
											{uploadedFileName
												? `File: ${uploadedFileName}`
												: 'Upload your data'}
										</h3>
										<p className="text-sm text-center">
											See documentation for data format requirements.
										</p>
									</button>
									<div className="mt-4 flex justify-end">
										<button
											onClick={() => setShowUploadPopup(false)}
											className="text-sm px-4 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-100"
										>
											Done
										</button>
									</div>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Third row - Overview */}
				<div className="lg:col-span-6">
					<Card>
						<CardTitle>Dataset Overview</CardTitle>
						<CardContent>
							{isParsing ? (
								<div className="flex flex-col items-center justify-center py-8">
									<svg
										className="animate-spin h-8 w-8 text-black mb-4"
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
									<p className="text-sm text-gray-600">
										Loading and analyzing dataset...
									</p>
								</div>
							) : parseError ? (
								<div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
									<p className="text-red-700 text-sm">{parseError}</p>
									<button
										onClick={() => {
											setParseError(null);
											if (selectedDataSource === 'kepler') {
												const retryLoadId = ++activeLoadIdRef.current;
												loadKeplerDataset(retryLoadId);
											}
										}}
										className="mt-2 text-sm text-red-600 underline hover:text-red-800"
									>
										Try again
									</button>
								</div>
							) : rawDataset ? (
								<div>
									{selectedDataSource === 'kepler' && (
										<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
											<h5 className="text-sm font-medium text-blue-800 mb-2">
												About the Kepler Dataset
											</h5>
											<p className="text-xs text-blue-700">
												This dataset contains exoplanet candidates discovered by
												NASA's Kepler Space Telescope. Each row represents a
												potential planet with 28 features including orbital
												period, stellar temperature, planet radius, and
												disposition (CONFIRMED, CANDIDATE, or FALSE POSITIVE).
												This is real astronomical data used for machine learning
												research.
											</p>
										</div>
									)}
									{selectedDataSource === 'k2' && (
										<div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
											<h5 className="text-sm font-medium text-indigo-800 mb-2">
												About the K2 Dataset
											</h5>
											<p className="text-xs text-indigo-700">
												This dataset contains observations from the extended K2
												mission, providing additional exoplanet candidates and
												stellar measurements across different fields of view.
												Feature availability may differ from the original Kepler
												dataset; automatic inference has been applied.
											</p>
										</div>
									)}
									{selectedDataSource === 'tess' && (
										<div className="bg-pink-50 border border-pink-200 rounded-lg p-4 mb-4">
											<h5 className="text-sm font-medium text-pink-800 mb-2">
												About the TESS Dataset
											</h5>
											<p className="text-xs text-pink-700">
												This dataset includes candidates from the Transiting
												Exoplanet Survey Satellite (TESS) mission, covering
												nearly the entire sky to identify planets around bright
												nearby stars. Feature composition differs from
												Kepler/K2; the system has inferred datatypes and
												suggested features automatically.
											</p>
										</div>
									)}

									{/* Target column selection - Moved to top and highlighted */}
									<div className="mb-6 p-4 bg-[#F9F9F9] border-2 border-[#E6E7E9] rounded-lg shadow-sm">
										<h4 className="text-base font-semibold mb-3 text-black flex items-center">
											<svg
												className="w-5 h-5 mr-2"
												fill="currentColor"
												viewBox="0 0 20 20"
											>
												<path
													fillRule="evenodd"
													d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
													clipRule="evenodd"
												/>
											</svg>
											Target Column (what to predict):
										</h4>
										<select
											value={targetColumn}
											onChange={(e) => handleTargetColumnChange(e.target.value)}
											className="w-full p-3 border-2 border-[#AFAFAF] rounded-lg text-sm bg-white focus:border-black focus:ring-2 focus:ring-[#E6E7E9]"
										>
											<option value="">Select target column...</option>
											{columnMeta
												?.filter(
													(col) =>
														col.inferredType === 'categorical' ||
														col.inferredType === 'boolean',
												)
												.map((col) => (
													<option key={col.name} value={col.name}>
														{col.name} ({col.uniqueValues?.length || 0} unique
														values)
													</option>
												))}
										</select>
										{targetColumn && (
											<div className="mt-3 p-3 bg-white rounded border border-[#E6E7E9]">
												<h5 className="text-sm font-medium mb-2 text-black">
													Target Variable Analysis:
												</h5>
												<div className="grid grid-cols-2 gap-4">
													<div>
														<h6 className="text-xs font-medium mb-1 text-gray-700">
															Target Column
														</h6>
														<p className="text-xs text-gray-600">
															{targetColumn}
														</p>
													</div>
													<div>
														<h6 className="text-xs font-medium mb-1 text-gray-700">
															Unique Values
														</h6>
														<p className="text-xs text-gray-600">
															{columnMeta
																?.find((c) => c.name === targetColumn)
																?.uniqueValues?.join(', ') || 'N/A'}
														</p>
													</div>
												</div>
											</div>
										)}
									</div>

									<p className="mb-4">
										Dataset "{rawDataset.name}" contains{' '}
										{rawDataset.rows.length} samples with{' '}
										{columnMeta?.length || 0} columns. The data has been
										automatically analyzed for column types and missing values.
										{selectedDataSource === 'kepler' &&
											rawDataset.rows.length === 1000 && (
												<span className="block text-sm text-blue-600 mt-2">
													📊 Showing first 1,000 rows of 9,566 total for
													performance. Full dataset will be used for training.
												</span>
											)}
									</p>
									{/* Column type summary */}
									<div className="mb-4">
										<h4 className="text-sm font-medium mb-2">Column Types:</h4>
										<div className="grid grid-cols-2 gap-2 text-xs">
											<div>
												Numeric:{' '}
												{columnMeta?.filter((c) => c.inferredType === 'numeric')
													.length || 0}
											</div>
											<div>
												Categorical:{' '}
												{columnMeta?.filter(
													(c) => c.inferredType === 'categorical',
												).length || 0}
											</div>
											<div>
												Boolean:{' '}
												{columnMeta?.filter((c) => c.inferredType === 'boolean')
													.length || 0}
											</div>
											<div>
												Text:{' '}
												{columnMeta?.filter((c) => c.inferredType === 'text')
													.length || 0}
											</div>
										</div>
									</div>
									{/* Dataset preview section */}
									<div className="mt-6">
										<h4 className="text-sm font-medium mb-2">
											Dataset Preview (first 5 rows):
										</h4>
										<div className="overflow-x-auto border border-gray-300 rounded">
											<table className="w-full text-xs">
												<thead>
													<tr className="bg-gray-100">
														{rawDataset.header.map((header, index) => (
															<th
																key={index}
																className="p-2 border-r border-b border-gray-300 text-left min-w-[80px]"
															>
																<div className="font-medium">{header}</div>
																<div className="text-gray-500 font-normal">
																	{columnMeta?.[index]?.inferredType}
																</div>
															</th>
														))}
													</tr>
												</thead>
												<tbody className="text-xs">
													{rawDataset.rows.slice(0, 5).map((row, rowIndex) => (
														<tr key={rowIndex}>
															{row.map((cell, cellIndex) => (
																<td
																	key={cellIndex}
																	className="p-2 border-r border-b border-gray-300 max-w-[100px] truncate"
																>
																	{cell}
																</td>
															))}
														</tr>
													))}
												</tbody>
											</table>
										</div>
									</div>
								</div>
							) : (
								<p className="mb-4">
									Select a data source to see dataset information. Our
									preprocessing pipeline automatically analyzes data structure,
									infers column types, and validates format compatibility for
									machine learning.
								</p>
							)}
						</CardContent>
					</Card>
				</div>

				{/* Third row - Data Configuration */}
				<div className="lg:col-span-6">
					<Card>
						<CardTitle>Feature Selection & Data Configuration</CardTitle>
						<CardContent>
							{isParsing ? (
								<div className="flex items-center justify-center py-8">
									<p className="text-sm text-gray-600">Processing dataset...</p>
								</div>
							) : rawDataset ? (
								<div>
									<p className="mb-4">
										Select which columns to use as features for training your
										model. Features should be numeric or categorical data that
										helps predict your target variable.
									</p>

									{/* Feature selection */}
									<div className="mb-4">
										<h4 className="text-sm font-medium mb-3">
											Features to include in training (
											{selectedFeatures?.length || 0} selected):
										</h4>

										{/* Simple list of all columns with checkboxes */}
										<div className="space-y-2 max-h-80 overflow-y-auto">
											{columnMeta
												?.filter((col) => col.name !== targetColumn)
												.map((col) => (
													<div
														key={col.name}
														className="flex items-center p-3 border border-gray-200 rounded hover:bg-gray-50"
													>
														<input
															type="checkbox"
															checked={(selectedFeatures || []).includes(
																col.name,
															)}
															onChange={() => handleFeatureToggle(col.name)}
															className="mr-3"
														/>
														<div className="flex-1">
															<span className="text-sm font-medium">
																{col.name}
															</span>
															<span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
																{col.inferredType}
															</span>
														</div>
														<div className="text-xs text-gray-500">
															{col.inferredType === 'numeric' &&
																col.mean !== undefined && (
																	<div>μ={col.mean.toFixed(2)}</div>
																)}
															{col.inferredType === 'categorical' && (
																<div>
																	{col.uniqueValues?.length || 0} values
																</div>
															)}
															{col.missingCount > 0 && (
																<div className="text-orange-600">
																	{col.missingCount} missing
																</div>
															)}
														</div>
													</div>
												))}
										</div>
									</div>

									{/* Data summary */}
									<div className="mt-4 p-3 bg-gray-50 rounded">
										<h4 className="text-sm font-medium mb-1">
											Ready for Training:
										</h4>
										<div className="text-xs text-gray-600">
											{selectedFeatures?.length || 0} features ×{' '}
											{rawDataset.rows.length} samples
											{targetColumn && ` → ${targetColumn}`}
										</div>
										{(selectedFeatures?.length || 0) === 0 && (
											<div className="text-xs text-red-600 mt-1">
												⚠️ Please select at least one feature to proceed
											</div>
										)}
										{!targetColumn && (
											<div className="text-xs text-red-600 mt-1">
												⚠️ Please select a target column to proceed
											</div>
										)}
									</div>
								</div>
							) : (
								<div>
									<p className="mb-4">
										Feature selection and data configuration options will appear
										here once you load a dataset.
									</p>

									<div className="bg-[var(--placeholder-color)] h-[200px] flex items-center justify-center rounded-lg border border-[var(--input-border)]">
										<p className="text-[var(--text-secondary)]">
											Feature Selection Interface
										</p>
									</div>
								</div>
							)}
						</CardContent>
					</Card>
				</div>

				{/* Select Model Button */}
				<div className="fixed bottom-8 right-8 z-10">
					{(selectedFeatures?.length || 0) > 0 && targetColumn ? (
						<Link
							href="/dashboard/classroom/model-selection"
							onClick={handleSelectModelClick}
							className="bg-black text-white rounded-xl py-4 px-8 font-semibold text-xl flex items-center shadow-lg hover:bg-gray-800 transition-colors"
						>
							Select Model
							<svg
								className="w-7 h-7 ml-2"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fillRule="evenodd"
									d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
									clipRule="evenodd"
								/>
							</svg>
						</Link>
					) : (
						<div className="bg-gray-400 text-white rounded-xl py-4 px-8 font-semibold text-xl flex items-center shadow-lg cursor-not-allowed">
							<span>
								{!rawDataset
									? 'Load Data First'
									: !targetColumn
									? 'Select Target Column'
									: 'Select Features'}
							</span>
							<svg
								className="w-7 h-7 ml-2 opacity-50"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fillRule="evenodd"
									d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
									clipRule="evenodd"
								/>
							</svg>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
