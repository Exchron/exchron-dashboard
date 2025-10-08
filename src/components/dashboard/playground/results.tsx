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
	
	// Check for DL model results
	const [dlPredictionResult, setDlPredictionResult] = useState<any>(null);
	const [selectedModel, setSelectedModel] = useState<any>(null);
	const [selectedKeplerId, setSelectedKeplerId] = useState<string | null>(null);

	// Load DL prediction result from session storage
	useEffect(() => {
		const storedResult = sessionStorage.getItem('dlPredictionResult');
		const storedKeplerId = sessionStorage.getItem('selectedKeplerId');
		const storedModel = localStorage.getItem('selectedModel');
		
		if (storedResult) {
			try {
				setDlPredictionResult(JSON.parse(storedResult));
			} catch (e) {
				console.error('Failed to parse DL prediction result:', e);
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
			{/* Show DL Model Info if DL prediction result exists */}
			{dlPredictionResult && (
				<Card className="border border-[var(--input-border)]">
					<CardTitle>Deep Learning Model Results</CardTitle>
					<CardContent>
						<div className="flex flex-col items-center gap-4">
							{selectedModel && (
								<div className="text-center">
									<p className="text-sm text-[var(--text-secondary)] mb-2">
										Model: <span className="font-medium">{selectedModel.name || selectedModel.id}</span>
									</p>
									{selectedKeplerId && (
										<p className="text-sm text-[var(--text-secondary)]">
											Kepler ID: <span className="font-mono font-medium">{selectedKeplerId}</span>
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
								
								{dlPredictionResult.lightcurve_link && (
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

			{/* Other Reports & Validation Results */}
			<Card className="border border-[var(--input-border)] overflow-hidden">
				<CardTitle>Other Reports & Validation Results</CardTitle>
				<CardContent className="p-4">
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
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						<div className="bg-[var(--placeholder-color)] h-[240px] w-full rounded-lg flex items-center justify-center border border-[var(--input-border)]">
							<div className="text-sm p-4 h-full w-full overflow-auto">
								<div className="mb-4">
									<h4 className="font-bold">Signal Quality</h4>
									<p>Stellar Noise: Good</p>
									<p>SNR: 7.4</p>
									<p>Duration: 6h 42m</p>
									<p>False Positive Probability: &lt; 1%</p>
								</div>
								<div className="mb-4">
									<h4 className="font-bold">Parameter Uncertainties</h4>
									<p>Orbital Period: ±0.02 days</p>
									<p>Planet Radius: ±0.12 R⊕</p>
								</div>
								<div>
									<h4 className="font-bold">Statistical Metrics</h4>
									<p>F1 Score: 0.92</p>
									<p>Precision: 0.94</p>
									<p>Recall: 0.89</p>
								</div>
							</div>
						</div>
						<div className="bg-[var(--placeholder-color)] h-[240px] w-full rounded-lg flex items-center justify-center border border-[var(--input-border)]">
							<div className="text-sm p-4 h-full w-full overflow-auto">
								<div className="mb-4">
									<h4 className="font-bold">Estimation Results</h4>
									<p>Orbital Period: 9.7 days</p>
									<p>Planet Radius: 2.1 R⊕</p>
									<p>Stellar Radius: 0.8 R☉</p>
									<p>Transit Depth: 0.17%</p>
								</div>
								<div className="mb-4">
									<h4 className="font-bold">Model Confidence</h4>
									<p>Overall: High</p>
									<p>
										Feature Importance: Transit Shape (45%), Period (30%),
										Stellar (25%)
									</p>
								</div>
								<div>
									<h4 className="font-bold">Follow-up</h4>
									<p>RV Confirmation: High Priority</p>
									<p>Atmospheric Characterization: Medium Priority</p>
								</div>
							</div>
						</div>
						<div className="bg-[var(--placeholder-color)] h-[240px] w-full rounded-lg flex items-center justify-center border border-[var(--input-border)]">
							<div className="text-xs p-4 h-full w-full overflow-auto">
								<div className="mb-4">
									<h4 className="font-bold">Spectra Analysis</h4>
									<p>H2O (3.2σ), CH4 (2.1σ)</p>
									<p>Temperature: 280K ± 40K</p>
									<p>Model: ATMO v2.1</p>
								</div>
								<div className="mb-4">
									<h4 className="font-bold">Imaging Analysis</h4>
									<p>Source: TESS Sector 14</p>
									<p>Background Contamination: Low</p>
									<p>Nearest Neighbor: 4.2"</p>
								</div>
								<div>
									<h4 className="font-bold">Binary Checks</h4>
									<p>Eclipsing Binary: Passed</p>
									<p>Centroid: Clean</p>
								</div>
							</div>
						</div>
						<div className="bg-[var(--placeholder-color)] h-[240px] w-full rounded-lg flex items-center justify-center border border-[var(--input-border)]">
							<div className="text-xs p-4 h-full w-full overflow-auto">
								<div className="mb-4">
									<h4 className="font-bold">Transit Parameters</h4>
									<p>Duration: 3.2 h</p>
									<p>Impact Parameter: 0.4 ± 0.1</p>
									<p>Limb Darkening: u1=0.3, u2=0.2</p>
								</div>
								<div className="mb-4">
									<h4 className="font-bold">Derived Parameters</h4>
									<p>Insolation: 1.2 S⊕</p>
									<p>Semi-major Axis: 0.08 AU</p>
									<p>Equilibrium Temp: 290K</p>
								</div>
								<div>
									<h4 className="font-bold">System Architecture</h4>
									<p>Other Known Planets: 0</p>
									<p>System Age: 2.1 ± 0.8 Gyr</p>
								</div>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Open Source / Resources Section */}
			<Card className="border border-[var(--input-border)]">
				<CardTitle>Resources for Follow-up Research</CardTitle>
				<CardContent>
					<div className="flex flex-col items-center justify-center text-center py-10 gap-6">
						<h3 className="font-bold text-base tracking-tight">
							use these resources to find out more about your exoplanet and
							confirm your results
						</h3>
					</div>
				</CardContent>
			</Card>

			{/* Bottom right action buttons */}
			<div className="fixed bottom-8 right-8 z-20 flex gap-4">
				<ActionButton
					onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
					icon="arrow-left"
					variant="secondary"
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
