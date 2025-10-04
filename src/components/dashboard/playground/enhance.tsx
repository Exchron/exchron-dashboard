'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ActionButton } from '../../ui/ActionButton';
import { Card, CardTitle, CardContent } from '../../ui/Card';

// Define CSS for animations
const fadeInKeyframes = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const slideUpKeyframes = `
  @keyframes slideUp {
    from { 
      opacity: 0;
      transform: translateY(20px); 
    }
    to { 
      opacity: 1;
      transform: translateY(0); 
    }
  }
`;

export default function EnhanceTab() {
	// Model tuning sliders
	const initialSliderValues = [50, 50, 50, 50];
	const [sliderValues, setSliderValues] =
		useState<number[]>(initialSliderValues);
	const [activeDragIndex, setActiveDragIndex] = useState<number | null>(null);
	const [isDragging, setIsDragging] = useState(false);

	// Upload states
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [uploadStage, setUploadStage] = useState<
		'idle' | 'selected' | 'uploading' | 'success' | 'error'
	>('idle');
	const [uploadProgress, setUploadProgress] = useState(0);

	// Tuning suggestion states
	const [tuningDescription, setTuningDescription] = useState('');
	const [tuningSaved, setTuningSaved] = useState(false);
	const [saving, setSaving] = useState(false);

	// Modal state (for final submission acknowledgement)
	const [showModal, setShowModal] = useState(false);

	// Inject the CSS animations
	useEffect(() => {
		// Create style element
		const style = document.createElement('style');
		style.type = 'text/css';
		style.innerHTML = fadeInKeyframes + slideUpKeyframes;

		// Append to head
		document.head.appendChild(style);

		// Cleanup
		return () => {
			document.head.removeChild(style);
		};
	}, []);

	// Calculate value from mouse position
	const calculateSliderValue = (
		event: React.MouseEvent<HTMLDivElement> | MouseEvent,
		sliderRect: DOMRect,
	) => {
		// For horizontal sliders, calculate percentage from left
		const offsetX = event.clientX - sliderRect.left;
		const percentage = Math.min(
			Math.max((offsetX / sliderRect.width) * 100, 0),
			100,
		);

		// Round to nearest integer
		return Math.round(percentage);
	};

	// Handle slider click/drag start
	const handleSliderMouseDown = (
		index: number,
		event: React.MouseEvent<HTMLDivElement>,
	) => {
		event.preventDefault();
		setActiveDragIndex(index);
		setIsDragging(true);

		const slider = event.currentTarget;
		const rect = slider.getBoundingClientRect();

		// Update value based on initial click position
		const value = calculateSliderValue(event, rect);
		const newSliderValues = [...sliderValues];
		newSliderValues[index] = value;
		setSliderValues(newSliderValues);
	};

	// Handle mouse move during drag
	const handleMouseMove = (event: MouseEvent) => {
		if (!isDragging || activeDragIndex === null) return;

		const sliders = document.querySelectorAll('.horizontal-slider-container');
		if (!sliders[activeDragIndex]) return;

		const slider = sliders[activeDragIndex];
		const rect = slider.getBoundingClientRect();

		const value = calculateSliderValue(event, rect);

		// Update slider value
		const newSliderValues = [...sliderValues];
		newSliderValues[activeDragIndex] = value;
		setSliderValues(newSliderValues);
	};

	// Handle drag end
	const handleMouseUp = () => {
		if (isDragging) {
			setIsDragging(false);
			setActiveDragIndex(null);
		}
	};

	// Add/remove event listeners for dragging
	useEffect(() => {
		if (isDragging) {
			window.addEventListener('mousemove', handleMouseMove);
			window.addEventListener('mouseup', handleMouseUp);
		}

		// Cleanup
		return () => {
			window.removeEventListener('mousemove', handleMouseMove);
			window.removeEventListener('mouseup', handleMouseUp);
		};
	}, [isDragging, activeDragIndex, sliderValues]);

	// File selection
	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0] || null;
		setSelectedFile(file);
		if (file) {
			setUploadStage('selected');
			setUploadProgress(0);
		} else {
			setUploadStage('idle');
		}
	};

	const triggerBrowse = () => fileInputRef.current?.click();

	const startUpload = () => {
		if (!selectedFile) return;
		setUploadStage('uploading');
		setUploadProgress(0);
		// simulate incremental progress
		const start = Date.now();
		const timer = setInterval(() => {
			setUploadProgress((prev) => {
				const next = Math.min(prev + Math.random() * 18, 100);
				if (next >= 100) {
					clearInterval(timer);
					setUploadStage('success');
				}
				return next;
			});
		}, 300);
	};

	const resetUpload = () => {
		setSelectedFile(null);
		setUploadStage('idle');
		setUploadProgress(0);
	};

	// Derived flags
	const tuningDirty =
		sliderValues.some((v, i) => v !== initialSliderValues[i]) ||
		tuningDescription.trim() !== '';

	const handleSaveTuning = () => {
		setSaving(true);
		setTimeout(() => {
			setSaving(false);
			setTuningSaved(true);
			setTimeout(() => setTuningSaved(false), 2500);
		}, 900);
	};

	const handleResetTuning = () => {
		setSliderValues(initialSliderValues);
		setTuningDescription('');
	};

	const handleFinalSubmit = () => {
		// Combine submission actions – placeholder
		setShowModal(true);
	};

	return (
		<div className="flex flex-col space-y-10">
			{/* Top Grid: Upload + Model Tuning */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				{/* Upload Card */}
				<Card className="border border-[var(--input-border)]">
					<CardTitle>Upload Unique Dataset</CardTitle>
					<CardContent>
						<input
							type="file"
							ref={fileInputRef}
							accept=".csv,.xlsx,.xls"
							onChange={handleFileUpload}
							className="hidden"
						/>
						<div className="space-y-6">
							<div
								className="border-2 border-dashed border-black/50 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-white cursor-pointer"
								onClick={triggerBrowse}
							>
								<div className="w-12 h-12 mb-4 text-black">
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
											d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
										/>
									</svg>
								</div>
								<h3 className="font-semibold text-lg mb-1">
									{selectedFile
										? selectedFile.name
										: 'Drag & drop or click to select'}
								</h3>
								<p className="text-sm text-[var(--text-secondary)]">
									CSV / XLSX up to 10MB
								</p>
							</div>

							{uploadStage !== 'idle' && (
								<div className="space-y-3 transition-all">
									{uploadStage === 'selected' && (
										<div className="flex gap-3">
											<button
												onClick={startUpload}
												className="px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:opacity-90"
											>
												Upload
											</button>
											<button
												onClick={resetUpload}
												className="px-4 py-2 bg-[var(--input-background)] border border-[var(--input-border)] rounded-md text-sm hover:bg-[var(--hover-background)]"
											>
												Remove
											</button>
										</div>
									)}
									{uploadStage === 'uploading' && (
										<div className="space-y-2">
											<div className="h-3 w-full bg-[var(--input-background)] rounded overflow-hidden">
												<div
													className="h-full bg-black transition-all"
													style={{ width: `${uploadProgress}%` }}
												/>
											</div>
											<p className="text-xs text-[var(--text-secondary)]">
												Uploading… {Math.round(uploadProgress)}%
											</p>
										</div>
									)}
									{uploadStage === 'success' && (
										<div className="flex items-center gap-3 text-green-600 text-sm font-medium">
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
											File uploaded successfully
										</div>
									)}
								</div>
							)}

							<div className="flex items-center justify-between bg-[var(--input-background)] rounded-xl border border-[var(--input-border)] p-4">
								<input
									type="email"
									placeholder="info.exchron@gmail.com"
									className="bg-transparent border-none outline-none w-3/5 placeholder-[var(--text-secondary)]"
								/>
								<span className="font-medium text-[var(--text-neutral)] text-sm">
									Contact Email
								</span>
							</div>
						</div>
					</CardContent>

					{/* Button placed at bottom-right of the card, match Submit Tuning sizing */}
					<div className="mt-4 pt-4 border-t border-[var(--input-border)] flex justify-end">
						<button
							disabled={uploadStage !== 'success'}
							onClick={handleFinalSubmit}
							className={`px-5 py-3 rounded-xl text-sm font-semibold transition-colors ${
								uploadStage === 'success'
									? 'bg-black text-white'
									: 'bg-[var(--input-background)] text-[var(--text-secondary)] cursor-not-allowed border border-[var(--input-border)]'
							}`}
						>
							Submit Dataset
						</button>
					</div>
				</Card>

				{/* Model Tuning Card */}
				<Card className="border border-[var(--input-border)]">
					<CardTitle>Model Tuning Suggestions</CardTitle>
					<CardContent>
						<div className="space-y-6">
							{[1, 2, 3, 4].map((param, index) => (
								<div key={param} className="flex flex-col">
									<div className="flex justify-between text-xs font-medium mb-1">
										<span>Parameter {param}</span>
										<span>{sliderValues[index]} mm</span>
									</div>
									<div
										className="relative h-3 w-full bg-[var(--placeholder-color)] rounded-lg cursor-pointer horizontal-slider-container"
										onMouseDown={(e) => handleSliderMouseDown(index, e)}
									>
										<div
											className="absolute left-0 h-3 bg-white rounded-lg border border-[var(--input-border)]"
											style={{ width: `${sliderValues[index]}%` }}
										/>
										<div
											className="absolute top-1/2 -translate-y-1/2 w-[18px] h-[18px] bg-white rounded-[4px] border border-[var(--input-border)] shadow-sm"
											style={{
												left: `${sliderValues[index]}%`,
												marginLeft: '-9px',
											}}
										/>
									</div>
									<div className="mt-2 text-[10px] text-center text-[#8d8d8d]">
										0–100 mm
									</div>
								</div>
							))}

							<div>
								<label className="font-medium block mb-2 text-sm">
									Improvement Rationale
								</label>
								<textarea
									value={tuningDescription}
									onChange={(e) => setTuningDescription(e.target.value)}
									placeholder="Describe your adjustments and expected impact..."
									className="w-full h-28 bg-[var(--light-selected)] border border-[var(--input-border)] rounded-lg p-3 outline-none focus:ring-2 focus:ring-black/20 text-sm"
								/>
								<p className="text-xs mt-3 text-[var(--text-secondary)] leading-relaxed">
									Submissions are reviewed; accepted suggestions may appear in
									the next model iteration (24–48h retrain latency).
								</p>
							</div>

							<div className="flex flex-wrap gap-3 items-center">
								{tuningDirty && (
									<>
										<button
											onClick={handleSaveTuning}
											disabled={saving}
											className={`px-4 py-2 rounded-md text-sm font-medium ${
												saving
													? 'bg-[var(--input-background)] text-[var(--text-secondary)] border border-[var(--input-border)]'
													: 'bg-black text-white'
											} transition-colors`}
										>
											{saving ? 'Saving…' : 'Save Suggestion'}
										</button>
										<button
											onClick={handleResetTuning}
											className="px-4 py-2 rounded-md text-sm font-medium bg-[var(--input-background)] border border-[var(--input-border)] hover:bg-[var(--hover-background)]"
										>
											Reset
										</button>
									</>
								)}
								{!tuningDirty && tuningSaved && (
									<div className="flex items-center gap-2 text-green-600 text-sm font-medium">
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
										Saved
									</div>
								)}
								<div className="ml-auto">
									<button
										disabled={!tuningSaved && !tuningDirty}
										onClick={handleFinalSubmit}
										className={`px-5 py-3 rounded-xl text-sm font-semibold transition-colors ${
											tuningDirty || tuningSaved
												? 'bg-black text-white'
												: 'bg-[var(--input-background)] text-[var(--text-secondary)] cursor-not-allowed border border-[var(--input-border)]'
										}`}
									>
										Submit Tuning
									</button>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Help Us Improve moved to bottom */}
			<Card className="border border-[var(--input-border)]">
				<CardTitle>Help Us Improve Our Predictions</CardTitle>
				<CardContent>
					<p className="mb-4 text-sm leading-relaxed">
						Provide context, edge-case examples, or domain notes that can guide
						future model refinement. Datasets and parameter rationales help us
						prioritize high-impact adjustments.
					</p>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
						<div className="space-y-4 text-sm">
							<p>
								• Contribute unique transit light curves or labeled validation
								sets.
							</p>
							<p>
								• Highlight false positives / negatives and why they matter.
							</p>
							<p>• Suggest additional engineered features for evaluation.</p>
						</div>
						<div className="space-y-4 text-sm">
							<p className="font-medium">Want to contribute directly?</p>
							<p>
								Visit the project repository or contact the Exchron team to
								request collaboration access and extended tooling.
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Floating unified submission removed as requested */}

			{/* Success Modal Popup with very subtle background blur and transition effects */}
			{showModal && (
				<div
					className="fixed inset-0 bg-transparent backdrop-blur-[2px] flex items-center justify-center z-50"
					style={{
						animation: 'fadeIn 0.3s ease-out forwards',
					}}
				>
					<div
						className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-xl"
						style={{
							animation: 'slideUp 0.4s ease-out forwards',
						}}
					>
						<div className="flex flex-col items-center text-center">
							<div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-10 w-10 text-green-600"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M5 13l4 4L19 7"
									/>
								</svg>
							</div>
							<h3 className="text-2xl font-bold mb-2">Submission Received</h3>
							<p className="text-gray-600 mb-4 text-sm leading-relaxed">
								Your dataset and/or tuning suggestions were recorded. If
								approved, updates will be reflected after the next training
								cycle.
							</p>
							<button
								onClick={() => setShowModal(false)}
								className="bg-black text-white rounded-xl py-3 px-8 font-semibold text-lg hover:bg-gray-800 transition-colors"
							>
								Done
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
