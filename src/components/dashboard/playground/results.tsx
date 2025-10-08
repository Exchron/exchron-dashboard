'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardTitle, CardContent } from '../../ui/Card';
import { ActionButton } from '../../ui/ActionButton';
import { usePrediction } from '../predictioncontext';

function formatPercent(v: number | undefined) {
	if (v === undefined || v === null || isNaN(v)) return '—';
	return `${(v * 100).toFixed(1)}%`;
}

export default function ResultsTab() {
	const { predictions, status, error } = usePrediction();
	
	// Check for DL model results and ML model results
	const [dlPredictionResult, setDlPredictionResult] = useState<any>(null);
	const [selectedModel, setSelectedModel] = useState<any>(null);
	const [selectedKeplerId, setSelectedKeplerId] = useState<string | null>(null);
	const [mlModelType, setMlModelType] = useState<string | null>(null);
	const [selectedDataset, setSelectedDataset] = useState<string | null>(null);

	// Load prediction results from session storage
	useEffect(() => {
		const storedResult = sessionStorage.getItem('dlPredictionResult');
		const storedKeplerId = sessionStorage.getItem('selectedKeplerId');
		const storedModel = localStorage.getItem('selectedModel');
		const storedMlModelType = sessionStorage.getItem('mlModelType');
		const storedSelectedDataset = sessionStorage.getItem('selectedDataset');
		
		if (storedResult) {
			try {
				setDlPredictionResult(JSON.parse(storedResult));
			} catch (e) {
				console.error('Failed to parse prediction result:', e);
			}
		}
		
		if (storedKeplerId) {
			setSelectedKeplerId(storedKeplerId);
		}
		
		if (storedModel) {
			try {
				const parsed = JSON.parse(storedModel);
				setSelectedModel(parsed);
			} catch {
				setSelectedModel({ id: storedModel, name: storedModel });
			}
		}
		
		if (storedMlModelType) {
			setMlModelType(storedMlModelType);
		}
		
		if (storedSelectedDataset) {
			setSelectedDataset(storedSelectedDataset);
		}
	}, []);

	const first = predictions[0] as any;
	let prediction;

	// Use DL prediction result if available, otherwise use regular predictions
	if (dlPredictionResult) {
		prediction = {
			exoplanet: dlPredictionResult.candidate_probability,
			not: dlPredictionResult.non_candidate_probability,
			label: dlPredictionResult.model_used,
			confidence: null,
		};
	} else {
		prediction = first
			? {
					exoplanet: first.probability_confirmed,
					not: first.probability_false_positive,
					label: first.backend_label,
					confidence: first.confidence,
			  }
			: { exoplanet: 0, not: 0, label: null, confidence: null };
	}

	const types = [
		{ label: 'Hot Jupiter', pct: 60, tone: 'text-[var(--success-color)]' },
		{ label: 'Neptune-like', pct: 20, tone: 'text-[var(--muted-text)]' },
		{ label: 'Super Earth', pct: 19, tone: 'text-[var(--muted-text)]' },
		{ label: 'Terrestrial', pct: 1, tone: 'text-[var(--text-secondary)]' },
	];

	const [exoplanetTypeLocked, setExoplanetTypeLocked] = useState(true);
	const [habitabilityLocked, setHabitabilityLocked] = useState(true);

	const hasResults = predictions.length > 0 || dlPredictionResult;

	return (
		<div className="flex flex-col space-y-8">
			{/* Show Model Info if prediction result exists */}
			{dlPredictionResult && (
				<Card className="border border-[var(--input-border)]">
					<CardTitle>
						{mlModelType ? `${mlModelType.toUpperCase()} Model Results` : 'Deep Learning Model Results'}
					</CardTitle>
					<CardContent>
						<div className="flex flex-col items-center gap-4">
							{selectedModel && (
								<div className="text-center">
									<p className="text-sm text-[var(--text-secondary)] mb-2">
										Model: <span className="font-medium">{selectedModel.name || selectedModel.id}</span>
									</p>
									{selectedKeplerId && !mlModelType && (
										<p className="text-sm text-[var(--text-secondary)]">
											Kepler ID: <span className="font-mono font-medium">{selectedKeplerId}</span>
										</p>
									)}
									{mlModelType && (
										<p className="text-sm text-[var(--text-secondary)]">
											Data Source: <span className="font-medium">
												{dlPredictionResult.datasource === 'manual' ? 'Manual Entry' : 
												 dlPredictionResult.datasource === 'pre-loaded' ? `Preloaded ${dlPredictionResult.data_type?.charAt(0).toUpperCase()}${dlPredictionResult.data_type?.slice(1)} Dataset` : 
												 'Unknown'}
											</span>
										</p>
									)}
								</div>
							)}
							
							<div className="w-full max-w-2xl">
								<div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
									<p className="text-sm text-green-800 font-medium">
										✓ Prediction completed successfully
									</p>
								</div>
								
								{/* Show features used for ML models */}
								{mlModelType && dlPredictionResult.features_used && (
									<div className="space-y-3 text-sm">
										<p className="font-medium">Input Features Used:</p>
										<div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
											<div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
												{Object.entries(dlPredictionResult.features_used).map(([key, value]) => (
													<div key={key} className="flex justify-between">
														<span className="text-gray-600">{key}:</span>
														<span className="font-mono font-medium">{typeof value === 'number' ? value.toFixed(3) : String(value)}</span>
													</div>
												))}
											</div>
										</div>
									</div>
								)}
								
								{/* Show additional resources for DL models */}
								{!mlModelType && dlPredictionResult.lightcurve_link && (
									<div className="space-y-2 text-sm">
										<p className="font-medium">Additional Resources:</p>
										<div className="space-y-1">
											{dlPredictionResult.lightcurve_link && (
												<a 
													href={dlPredictionResult.lightcurve_link}
													target="_blank"
													rel="noopener noreferrer"
													className="block text-blue-600 hover:underline"
												>
													→ Light Curve Data
												</a>
											)}
											{dlPredictionResult.target_pixel_file_link && (
												<a 
													href={dlPredictionResult.target_pixel_file_link}
													target="_blank"
													rel="noopener noreferrer"
													className="block text-blue-600 hover:underline"
												>
													→ Target Pixel File
												</a>
											)}
											{dlPredictionResult.dv_report_link && (
												<a 
													href={dlPredictionResult.dv_report_link}
													target="_blank"
													rel="noopener noreferrer"
													className="block text-blue-600 hover:underline"
												>
													→ Data Validation Report
												</a>
											)}
										</div>
									</div>
								)}
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* No Results Message */}
			{!hasResults && (
				<Card className="border border-[var(--input-border)]">
					<CardContent className="py-12">
						<div className="text-center">
							<p className="text-lg text-[var(--text-secondary)] mb-4">
								No prediction results available.
							</p>
							<p className="text-sm text-[var(--text-secondary)] mb-6">
								Please go back to the Data Input tab and run an evaluation first.
							</p>
							<ActionButton
								href="/dashboard/playground/data-input"
								icon="arrow-left"
								ariaLabel="Go to Data Input"
							>
								Back to Data Input
							</ActionButton>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Prediction Section */}
			{hasResults && (
				<Card className="border border-[var(--input-border)]">
					<CardTitle>Prediction Results</CardTitle>
					<CardContent>
					<div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
						{/* Centered probability cards */}
						<div className="lg:col-span-12 flex flex-col md:flex-row md:items-stretch gap-5 md:justify-center">
							<div className="bg-white rounded-lg border border-[var(--input-border)] flex flex-col items-center justify-center py-6 w-full md:w-64">
								<p className="font-medium mb-2">Exoplanet Probability</p>
								<p className="text-4xl font-bold text-[var(--success-color)]">
									{formatPercent(prediction.exoplanet)}
								</p>
							</div>
							<div className="bg-white rounded-lg border border-[var(--input-border)] flex flex-col items-center justify-center py-6 w-full md:w-64">
								<p className="font-medium mb-2">Not an Exoplanet</p>
								<p className="text-4xl font-bold text-[var(--muted-text)]">
									{formatPercent(prediction.not)}
								</p>
							</div>
							{prediction.label && (
								<div className="bg-white rounded-lg border border-[var(--input-border)] flex flex-col items-center justify-center py-6 w-full md:w-64">
									<p className="font-medium mb-2">Backend Label</p>
									<p className="text-2xl font-semibold">{prediction.label}</p>
									{prediction.confidence != null && (
										<p className="text-xs mt-2 text-[var(--text-secondary)]">
											Confidence: {formatPercent(prediction.confidence)}
										</p>
									)}
								</div>
							)}
						</div>

						{/* Average prediction note for ML preloaded models */}
						{mlModelType && dlPredictionResult && dlPredictionResult.individual_predictions && (
							<div className="lg:col-span-12 flex justify-center">
								<div className="bg-blue-50 border border-blue-200 rounded-lg p-3 max-w-2xl">
									<div className="flex items-center gap-2">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className="h-4 w-4 text-blue-600 flex-shrink-0"
											fill="none"
											viewBox="0 0 24 24"
											strokeWidth={2}
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
											/>
										</svg>
										<p className="text-sm text-blue-800">
											<span className="font-medium">Average Prediction Results:</span> The probabilities shown above are averaged from 10 individual target predictions from the {dlPredictionResult.data_type} dataset.
										</p>
									</div>
								</div>
							</div>
						)}

						{/* Likely Exoplanet Type (blur overlay) */}
						<div className="lg:col-span-6 relative">
							<div className="bg-white rounded-lg border border-[var(--input-border)] p-5 transition">
								<CardTitle className="!mt-0 !mb-4 text-xs tracking-wide uppercase text-[var(--text-secondary)]">
									Likely Exoplanet Type
								</CardTitle>
								<div
									className={`transition filter ${
										exoplanetTypeLocked ? 'blur-sm' : 'blur-0'
									}`}
								>
									<ul className="space-y-3">
										{types.map((t) => (
											<li
												key={t.label}
												className="flex justify-between items-center text-sm"
											>
												<span className="font-medium">{t.label}</span>
												<span className={`font-semibold ${t.tone}`}>
													{t.pct}%
												</span>
											</li>
										))}
									</ul>
									<p className="text-xs mt-5 text-[var(--text-secondary)] leading-relaxed">
										Classification derived from transit morphology, period
										stability, stellar parameters, and comparative prior
										distributions.
									</p>
								</div>
							</div>
							{exoplanetTypeLocked && (
								<div className="absolute inset-0 m-auto h-12 w-32 bg-black text-white rounded-md font-semibold shadow flex items-center justify-center">
									Coming Soon
								</div>
							)}
						</div>

						{/* Habitability Assessment (blur overlay) */}
						<div className="lg:col-span-6 relative">
							<div className="bg-white rounded-lg border border-[var(--input-border)] p-5 flex flex-col transition">
								<CardTitle className="!mt-0 !mb-4 text-xs tracking-wide uppercase text-[var(--text-secondary)]">
									Habitability Assessment
								</CardTitle>
								<div
									className={`flex flex-col transition filter ${
										habitabilityLocked ? 'blur-sm' : 'blur-0'
									}`}
								>
									<div className="text-center mb-4">
										<div className="text-3xl font-bold text-[var(--success-color)] mb-1">
											7.2/10
										</div>
										<p className="text-[var(--muted-text)] text-sm">
											Habitability Index
										</p>
									</div>
									<div className="space-y-2 text-sm">
										<div className="flex justify-between">
											<span>Temperature Zone:</span>
											<span className="font-medium">Habitable</span>
										</div>
										<div className="flex justify-between">
											<span>Atmospheric Retention:</span>
											<span className="font-medium">Likely</span>
										</div>
										<div className="flex justify-between">
											<span>Water Presence:</span>
											<span className="font-medium">Possible</span>
										</div>
									</div>
									<p className="text-xs mt-4 text-[var(--text-secondary)] leading-relaxed">
										Index estimation synthesizes equilibrium temperature,
										stellar class, insolation flux, and radius constraints.
									</p>
								</div>
							</div>
							{habitabilityLocked && (
								<div className="absolute inset-0 m-auto h-12 w-32 bg-black text-white rounded-md font-semibold shadow flex items-center justify-center">
									Coming Soon
								</div>
							)}
						</div>
					</div>

					{/* Status / errors */}
					<div className="mt-6 space-y-1 text-xs text-[var(--text-secondary)]">
						{status === 'success' && (
							<p>
								{predictions.length} prediction
								{predictions.length !== 1 ? 's' : ''} received.
							</p>
						)}
						{status === 'error' && <p>Prediction failed.</p>}
						{error && <p className="text-red-600 font-medium">{error}</p>}
					</div>
				</CardContent>
			</Card>
			)}

			{/* Individual Predictions for ML Preloaded Models */}
			{dlPredictionResult && mlModelType && dlPredictionResult.individual_predictions && (
				<Card className="border border-[var(--input-border)]">
					<CardTitle>Individual Target Predictions</CardTitle>
					<CardContent>
						<p className="text-sm text-[var(--text-secondary)] mb-6">
							{mlModelType.toUpperCase()} model predictions for 10 individual targets from the {dlPredictionResult.data_type} dataset.
							The overall probability shown above is the average of these individual predictions.
						</p>
						
						<div className="overflow-auto border border-[var(--input-border)] rounded-lg bg-white">
							<table className="min-w-full text-sm">
								<thead className="bg-[var(--hover-background)]">
									<tr>
										<th className="px-4 py-3 text-left font-medium">Target</th>
										<th className="px-4 py-3 text-left font-medium">Kepler ID</th>
										<th className="px-4 py-3 text-left font-medium">Candidate Probability</th>
										<th className="px-4 py-3 text-left font-medium">Non-Candidate Probability</th>
										<th className="px-4 py-3 text-left font-medium">Classification</th>
									</tr>
								</thead>
								<tbody>
									{Object.entries(dlPredictionResult.individual_predictions).map(([key, prediction]: [string, any], idx) => {
										const isCandidate = prediction.candidate_probability > prediction.non_candidate_probability;
										return (
											<tr key={key} className="border-t border-[var(--input-border)] hover:bg-gray-50 transition-colors">
												<td className="px-4 py-3 font-medium capitalize">{key}</td>
												<td className="px-4 py-3 font-mono text-blue-600">{prediction.kepid}</td>
												<td className="px-4 py-3">
													<div className="flex items-center gap-2">
														<span className={`font-medium ${isCandidate ? 'text-green-600' : 'text-gray-600'}`}>
															{formatPercent(prediction.candidate_probability)}
														</span>
														{isCandidate && (
															<div className="w-2 h-2 bg-green-500 rounded-full"></div>
														)}
													</div>
												</td>
												<td className="px-4 py-3">
													<div className="flex items-center gap-2">
														<span className={`font-medium ${!isCandidate ? 'text-red-600' : 'text-gray-600'}`}>
															{formatPercent(prediction.non_candidate_probability)}
														</span>
														{!isCandidate && (
															<div className="w-2 h-2 bg-red-500 rounded-full"></div>
														)}
													</div>
												</td>
												<td className="px-4 py-3">
													<span className={`px-2 py-1 text-xs font-medium rounded-full ${
														isCandidate 
															? 'bg-green-100 text-green-800' 
															: 'bg-red-100 text-red-800'
													}`}>
														{isCandidate ? 'Candidate' : 'Non-Candidate'}
													</span>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>

						<div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
							<div className="flex items-start gap-3">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0"
									fill="none"
									viewBox="0 0 24 24"
									strokeWidth={2}
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
								<div className="flex-1">
									<h4 className="text-sm font-medium text-blue-800 mb-1">Dataset Information</h4>
									<p className="text-sm text-blue-700">
										These predictions are based on 10 randomly selected targets from the {dlPredictionResult.data_type} test dataset. 
										Each target represents a real astronomical observation with its associated Kepler ID for further research.
									</p>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Other Reports & Validation Results - For DL Models and other cases */}
			{(!mlModelType || !dlPredictionResult?.individual_predictions) && (
				<Card className="border border-[var(--input-border)] overflow-hidden">
					<CardTitle>Other Reports & Validation Results</CardTitle>
					<CardContent className="p-4">
						{/* DV Report PDF Embed - Only for DL models */}
						{dlPredictionResult && !mlModelType && dlPredictionResult.dv_report_link && (
							<div className="mb-8">
								<h3 className="font-semibold mb-3 text-sm tracking-wide uppercase text-[var(--text-secondary)]">
									Data Validation Report
								</h3>
								<div className="border border-[var(--input-border)] rounded-lg overflow-hidden bg-white">
									<iframe
										src={dlPredictionResult.dv_report_link}
										className="w-full h-96"
										title="Data Validation Report"
										sandbox="allow-scripts allow-same-origin"
									/>
									<div className="p-3 bg-[var(--hover-background)] border-t border-[var(--input-border)]">
										<div className="flex items-center justify-between">
											<span className="text-sm text-[var(--text-secondary)]">
												Data Validation Report for Kepler ID: {selectedKeplerId}
											</span>
											<a
												href={dlPredictionResult.dv_report_link}
												target="_blank"
												rel="noopener noreferrer"
												className="text-sm text-blue-600 hover:underline flex items-center gap-1"
											>
												Open Full Report
												<svg
													xmlns="http://www.w3.org/2000/svg"
													className="h-3 w-3"
													fill="none"
													viewBox="0 0 24 24"
													strokeWidth={2}
													stroke="currentColor"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
													/>
												</svg>
											</a>
										</div>
									</div>
								</div>
							</div>
						)}

						{/* ML Model Results Summary - Only for manual entry ML models */}
						{dlPredictionResult && mlModelType && dlPredictionResult.features_used && (
							<div className="mb-8">
								<h3 className="font-semibold mb-3 text-sm tracking-wide uppercase text-[var(--text-secondary)]">
									Model Input Summary
								</h3>
								<div className="border border-[var(--input-border)] rounded-lg bg-white p-4">
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<h4 className="font-medium text-sm mb-2">Model Information</h4>
											<div className="space-y-1 text-sm">
												<div className="flex justify-between">
													<span className="text-[var(--text-secondary)]">Algorithm:</span>
													<span className="font-medium">{mlModelType.toUpperCase()}</span>
												</div>
												<div className="flex justify-between">
													<span className="text-[var(--text-secondary)]">Data Source:</span>
													<span className="font-medium">Manual Entry</span>
												</div>
												<div className="flex justify-between">
													<span className="text-[var(--text-secondary)]">Features:</span>
													<span className="font-medium">{Object.keys(dlPredictionResult.features_used).length}</span>
												</div>
											</div>
										</div>
										<div>
											<h4 className="font-medium text-sm mb-2">Key Parameters</h4>
											<div className="space-y-1 text-xs">
												<div className="flex justify-between">
													<span className="text-[var(--text-secondary)]">Period:</span>
													<span className="font-mono">{dlPredictionResult.features_used.koi_period?.toFixed(3)} days</span>
												</div>
												<div className="flex justify-between">
													<span className="text-[var(--text-secondary)]">Depth:</span>
													<span className="font-mono">{dlPredictionResult.features_used.koi_depth?.toFixed(1)} ppm</span>
												</div>
												<div className="flex justify-between">
													<span className="text-[var(--text-secondary)]">Duration:</span>
													<span className="font-mono">{dlPredictionResult.features_used.koi_duration?.toFixed(2)} hrs</span>
												</div>
												<div className="flex justify-between">
													<span className="text-[var(--text-secondary)]">SNR:</span>
													<span className="font-mono">{dlPredictionResult.features_used.koi_model_snr?.toFixed(1)}</span>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						)}

						{predictions.length > 0 && (
							<div className="mb-8">
								<h3 className="font-semibold mb-3 text-sm tracking-wide uppercase text-[var(--text-secondary)]">
									Prediction Results
								</h3>
								<div className="overflow-auto border border-[var(--input-border)] rounded-lg bg-white">
									<table className="min-w-full text-sm">
										<thead className="bg-[var(--hover-background)]">
											<tr>
												<th className="px-3 py-2 text-left font-medium">Row</th>
												<th className="px-3 py-2 text-left font-medium">
													Probability Confirmed
												</th>
												<th className="px-3 py-2 text-left font-medium">
													Probability False Positive
												</th>
											</tr>
										</thead>
										<tbody>
											{predictions.map((p, idx) => (
												<tr
													key={idx}
													className="border-t border-[var(--input-border)]"
												>
													<td className="px-3 py-2">{idx + 1}</td>
													<td className="px-3 py-2 text-[var(--success-color)] font-medium">
														{formatPercent(p.probability_confirmed)}
													</td>
													<td className="px-3 py-2 text-[var(--muted-text)] font-medium">
														{formatPercent(p.probability_false_positive)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			)}
			{/* Open Source / Resources Section */}
			<Card className="border border-[var(--input-border)]">
				<CardTitle>Resources for Follow-up Research</CardTitle>
				<CardContent>
					<div className="text-center mb-8">
						<h3 className="font-bold text-base tracking-tight mb-2">
							Use these resources to find out more about your exoplanet and
							confirm your results
						</h3>
						<p className="text-sm text-[var(--text-secondary)]">
							Access official NASA databases and exoplanet research tools
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<a
							href="https://exoplanetarchive.ipac.caltech.edu/"
							target="_blank"
							rel="noopener noreferrer"
							className="group p-4 border border-[var(--input-border)] rounded-lg hover:border-black transition-colors bg-white"
						>
							<div className="flex items-start gap-3">
								<div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="w-5 h-5 text-blue-600"
										fill="none"
										viewBox="0 0 24 24"
										strokeWidth={2}
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
										/>
									</svg>
								</div>
								<div className="flex-1">
									<h4 className="font-semibold text-sm mb-1 group-hover:text-black transition-colors">
										NASA Exoplanet Archive
									</h4>
									<p className="text-xs text-[var(--text-secondary)] leading-relaxed">
										Comprehensive database of confirmed exoplanets and candidate objects from various surveys
									</p>
								</div>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-black transition-colors"
									fill="none"
									viewBox="0 0 24 24"
									strokeWidth={2}
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
									/>
								</svg>
							</div>
						</a>

						<a
							href="https://eyes.nasa.gov/apps/exo/"
							target="_blank"
							rel="noopener noreferrer"
							className="group p-4 border border-[var(--input-border)] rounded-lg hover:border-black transition-colors bg-white"
						>
							<div className="flex items-start gap-3">
								<div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="w-5 h-5 text-purple-600"
										fill="none"
										viewBox="0 0 24 24"
										strokeWidth={2}
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
										/>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
										/>
									</svg>
								</div>
								<div className="flex-1">
									<h4 className="font-semibold text-sm mb-1 group-hover:text-black transition-colors">
										NASA Eyes on Exoplanets
									</h4>
									<p className="text-xs text-[var(--text-secondary)] leading-relaxed">
										Interactive 3D visualization tool to explore confirmed exoplanets and their characteristics
									</p>
								</div>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-black transition-colors"
									fill="none"
									viewBox="0 0 24 24"
									strokeWidth={2}
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
									/>
								</svg>
							</div>
						</a>

						<a
							href="https://archive.stsci.edu/kepler/"
							target="_blank"
							rel="noopener noreferrer"
							className="group p-4 border border-[var(--input-border)] rounded-lg hover:border-black transition-colors bg-white"
						>
							<div className="flex items-start gap-3">
								<div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="w-5 h-5 text-green-600"
										fill="none"
										viewBox="0 0 24 24"
										strokeWidth={2}
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
										/>
									</svg>
								</div>
								<div className="flex-1">
									<h4 className="font-semibold text-sm mb-1 group-hover:text-black transition-colors">
										Kepler Data Archive
									</h4>
									<p className="text-xs text-[var(--text-secondary)] leading-relaxed">
										Access original Kepler mission data including light curves and target pixel files
									</p>
								</div>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-black transition-colors"
									fill="none"
									viewBox="0 0 24 24"
									strokeWidth={2}
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
									/>
								</svg>
							</div>
						</a>

						<a
							href="https://science.nasa.gov/exoplanets/"
							target="_blank"
							rel="noopener noreferrer"
							className="group p-4 border border-[var(--input-border)] rounded-lg hover:border-black transition-colors bg-white"
						>
							<div className="flex items-start gap-3">
								<div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="w-5 h-5 text-red-600"
										fill="none"
										viewBox="0 0 24 24"
										strokeWidth={2}
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
										/>
									</svg>
								</div>
								<div className="flex-1">
									<h4 className="font-semibold text-sm mb-1 group-hover:text-black transition-colors">
										NASA Exoplanet Exploration
									</h4>
									<p className="text-xs text-[var(--text-secondary)] leading-relaxed">
										Latest news, discoveries, and educational resources about exoplanet science
									</p>
								</div>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-black transition-colors"
									fill="none"
									viewBox="0 0 24 24"
									strokeWidth={2}
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
									/>
								</svg>
							</div>
						</a>
					</div>
				</CardContent>
			</Card>

			{/* Bottom right action buttons */}
			<div className="fixed bottom-8 right-8 z-20 flex gap-4">
				<ActionButton
					href="/dashboard/playground/overview"
					icon="arrow-left"
					variant="secondary"
					ariaLabel="Go back to Overview"
				>
					Classify Another
				</ActionButton>
				<ActionButton
					href="/dashboard/playground/enhance"
					icon="arrow-right"
					ariaLabel="Go to Enhance"
				>
					Enhance
				</ActionButton>
			</div>
		</div>
	);
}
