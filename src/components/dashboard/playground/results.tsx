'use client';

import React, { useState } from 'react';
import { Card, CardTitle, CardContent } from '../../ui/Card';
import { ActionButton } from '../../ui/ActionButton';
import { usePrediction } from '../predictioncontext';

function formatPercent(v: number | undefined) {
	if (v === undefined || v === null || isNaN(v)) return '—';
	return `${(v * 100).toFixed(1)}%`;
}

export default function ResultsTab() {
	const { predictions, status, error } = usePrediction();
	const first = predictions[0] as any;
	const prediction = first
		? {
				exoplanet: first.probability_confirmed,
				not: first.probability_false_positive,
				label: first.backend_label,
				confidence: first.confidence,
		  }
		: { exoplanet: 0, not: 0, label: null, confidence: null };

	const types = [
		{ label: 'Hot Jupiter', pct: 60, tone: 'text-[var(--success-color)]' },
		{ label: 'Neptune-like', pct: 20, tone: 'text-[var(--muted-text)]' },
		{ label: 'Super Earth', pct: 19, tone: 'text-[var(--muted-text)]' },
		{ label: 'Terrestrial', pct: 1, tone: 'text-[var(--text-secondary)]' },
	];

	const [exoplanetTypeLocked, setExoplanetTypeLocked] = useState(true);
	const [habitabilityLocked, setHabitabilityLocked] = useState(true);

	return (
		<div className="flex flex-col space-y-8">
			{/* Prediction Section */}
			<Card className="border border-[var(--input-border)]">
				<CardTitle>Prediction</CardTitle>
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
								<button
									onClick={() => setExoplanetTypeLocked(false)}
									className="absolute inset-0 m-auto h-12 w-32 bg-black text-white rounded-md font-semibold shadow flex items-center justify-center"
								>
									Predict
								</button>
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
								<button
									onClick={() => setHabitabilityLocked(false)}
									className="absolute inset-0 m-auto h-12 w-32 bg-black text-white rounded-md font-semibold shadow flex items-center justify-center"
								>
									Predict
								</button>
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
				<CardTitle>Open Source Project</CardTitle>
				<CardContent>
					<div className="flex flex-col items-center justify-center text-center py-10 gap-6">
						<h3 className="font-bold text-base tracking-tight">
							This dashboard is an open source project.
						</h3>
						<a
							href="https://github.com/"
							target="_blank"
							rel="noopener noreferrer"
							className="group inline-flex items-center gap-3 px-5 py-3 rounded-lg bg-black text-white font-semibold shadow transition transform hover:scale-[1.04] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-black"
							aria-label="View source on GitHub"
						>
							<svg
								className="w-6 h-6"
								viewBox="0 0 24 24"
								fill="currentColor"
								aria-hidden="true"
							>
								<path d="M12 .5C5.648.5.5 5.648.5 12c0 5.087 3.292 9.387 7.868 10.907.575.107.785-.248.785-.553 0-.273-.01-.995-.015-1.953-3.201.696-3.877-1.543-3.877-1.543-.523-1.33-1.278-1.685-1.278-1.685-1.044-.714.08-.699.08-.699 1.155.081 1.763 1.187 1.763 1.187 1.027 1.76 2.695 1.252 3.35.957.104-.744.402-1.252.732-1.54-2.556-.291-5.244-1.278-5.244-5.69 0-1.257.448-2.285 1.182-3.09-.119-.29-.513-1.462.112-3.047 0 0 .965-.309 3.164 1.181a10.92 10.92 0 0 1 2.882-.388c.978.004 1.964.132 2.883.388 2.197-1.49 3.161-1.181 3.161-1.181.626 1.585.232 2.757.114 3.047.737.805 1.181 1.833 1.181 3.09 0 4.423-2.694 5.395-5.258 5.68.413.353.779 1.047.779 2.112 0 1.526-.014 2.756-.014 3.132 0 .308.207.667.79.552C20.213 21.383 23.5 17.084 23.5 12 23.5 5.648 18.352.5 12 .5Z" />
							</svg>
							<span className="text-sm">GitHub</span>
						</a>
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
