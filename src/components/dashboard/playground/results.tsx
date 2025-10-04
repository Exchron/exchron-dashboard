'use client';

import React from 'react';
import { Card, CardTitle, CardContent } from '../../ui/Card';
import Link from 'next/link';
import { ActionButton } from '../../ui/ActionButton';
import { usePrediction } from '../predictioncontext';

function formatPercent(v: number | undefined) {
	if (v === undefined || v === null || isNaN(v)) return '—';
	return `${(v * 100).toFixed(1)}%`;
}

// Server component (no client interactivity needed for static/example results data)
export default function ResultsTab() {
	const { predictions, inputRecords, status, error } = usePrediction();
	// Derive aggregate metrics from first prediction (assuming per-row predictions)
	const first = predictions[0] as any;
	const prediction = first
		? {
				exoplanet: first.probability_confirmed,
				not: first.probability_false_positive,
				followUp: first.probability_confirmed > 0.5 ? 'High' : 'Low',
				label: first.backend_label,
				confidence: first.confidence,
				threshold: first.threshold,
		  }
		: {
				exoplanet: 0,
				not: 0,
				followUp: '—',
				label: null,
				confidence: null,
				threshold: 0.5,
		  };
	const types = [
		{ label: 'Hot Jupiter', pct: 60, tone: 'text-[var(--success-color)]' },
		{ label: 'Neptune-like', pct: 20, tone: 'text-[var(--muted-text)]' },
		{ label: 'Super Earth', pct: 19, tone: 'text-[var(--muted-text)]' },
		{ label: 'Terrestrial', pct: 1, tone: 'text-[var(--text-secondary)]' },
	];

	return (
		<div className="flex flex-col space-y-8">
			<Card className="border border-[var(--input-border)]">
				<CardContent>
					<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
						<div>
							<h3 className="font-semibold mb-1">Prediction Status</h3>
							<p className="text-sm text-[var(--text-secondary)]">
								{status === 'idle' && 'Awaiting evaluation.'}
								{status === 'loading' && 'Running prediction...'}
								{status === 'success' &&
									`${predictions.length} prediction${
										predictions.length !== 1 ? 's' : ''
									} received.`}
								{status === 'error' && 'Prediction failed.'}
							</p>
						</div>
						{error && (
							<div className="text-sm text-red-600 font-medium">{error}</div>
						)}
					</div>
				</CardContent>
			</Card>
			{/* Combined Prediction Section */}
			<div>
				<h2 className="text-lg font-semibold mb-4 tracking-tight text-[var(--text-neutral)]">
					Prediction
				</h2>
				<Card className="border border-[var(--input-border)]">
					<CardContent>
						<div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
							{/* Top probabilities + follow-up (span full width on small screens) */}
							<div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:col-span-12">
								<div className="bg-white rounded-lg border border-[var(--input-border)] flex flex-col items-center justify-center py-6">
									<p className="font-medium mb-2">Exoplanet Probability</p>
									<p className="text-4xl font-bold text-[var(--success-color)]">
										{formatPercent(prediction.exoplanet)}
									</p>
								</div>
								<div className="bg-white rounded-lg border border-[var(--input-border)] flex flex-col items-center justify-center py-6">
									<p className="font-medium mb-2">Not an Exoplanet</p>
									<p className="text-4xl font-bold text-[var(--muted-text)]">
										{formatPercent(prediction.not)}
									</p>
								</div>
								<div className="bg-white rounded-lg border border-[var(--input-border)] flex flex-col items-center justify-center py-6">
									<p className="font-medium mb-2">Follow-up Priority</p>
									<p className="text-4xl font-bold text-[var(--accent-color)]">
										{prediction.followUp}
									</p>
								</div>
								{prediction.label && (
									<div className="bg-white rounded-lg border border-[var(--input-border)] flex flex-col items-center justify-center py-6 md:col-span-3 lg:col-span-3">
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

							{/* Exoplanet Type Distribution */}
							<div className="lg:col-span-6">
								<h3 className="font-semibold mb-4 text-xs tracking-wide uppercase text-[var(--text-secondary)]">
									Likely Exoplanet Type
								</h3>
								<div className="bg-white rounded-lg border border-[var(--input-border)] p-5">
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

							{/* Habitability Assessment */}
							<div className="lg:col-span-6">
								<h3 className="font-semibold mb-4 text-xs tracking-wide uppercase text-[var(--text-secondary)]">
									Habitability Assessment
								</h3>
								<div className="bg-white rounded-lg border border-[var(--input-border)] p-5 flex flex-col">
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
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Other Reports & Validation Results */}
			<div>
				<h2 className="text-lg font-semibold mb-4 tracking-tight text-[var(--text-neutral)]">
					Other Reports & Validation Results
				</h2>
				<Card className="border border-[var(--input-border)] overflow-hidden">
					<CardContent className="p-4">
						{/* Dynamic Predictions Table */}
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
							{/* Column 1 */}
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
							{/* Column 2 */}
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
							{/* Column 3 */}
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
							{/* Column 4 */}
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
			</div>

			{/* Resources Section */}
			<div>
				<h2 className="text-xl font-bold mb-4">More Resources</h2>
				<Card className="border border-[var(--input-border)]">
					<CardContent>
						<div className="space-y-5">
							<div>
								<h4 className="font-semibold mb-2">
									Research Papers & References
								</h4>
								<ul className="text-sm space-y-1 text-[var(--text-neutral)]">
									<li>
										• "Exoplanet Detection Using Deep Learning" - Nature
										Astronomy (2023)
									</li>
									<li>• "TESS Transit Survey Analysis" - ApJ Letters (2022)</li>
									<li>
										• "Machine Learning in Astronomy" - Annual Review (2024)
									</li>
								</ul>
							</div>
							<div>
								<h4 className="font-semibold mb-2">Datasets & Tools</h4>
								<ul className="text-sm space-y-1 text-[var(--text-neutral)]">
									<li>• NASA Exoplanet Archive</li>
									<li>• MAST Data Portal</li>
									<li>• ExoFOP Target Assessment</li>
								</ul>
							</div>
							<div>
								<h4 className="font-semibold mb-2">Documentation</h4>
								<ul className="text-sm space-y-1 text-[var(--text-neutral)]">
									<li>• Model Training Guidelines</li>
									<li>• Data Processing Pipeline</li>
									<li>• API Reference</li>
								</ul>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

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
