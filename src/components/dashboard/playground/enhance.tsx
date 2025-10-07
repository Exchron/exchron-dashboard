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

	// Email states
	const [email, setEmail] = useState('');
	const [emailError, setEmailError] = useState('');

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

	// Email validation
	const validateEmail = (email: string) => {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	};

	const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setEmail(value);
		
		if (value && !validateEmail(value)) {
			setEmailError('Please enter a valid email address');
		} else {
			setEmailError('');
		}
	};

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

	const handleSaveTuning = () => {
		setSaving(true);
		setTimeout(() => {
			setSaving(false);
			setTuningSaved(true);
			setTimeout(() => setTuningSaved(false), 2500);
		}, 900);
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

							<div className="space-y-2">
								<div className="flex items-center justify-between bg-[var(--input-background)] rounded-xl border border-[var(--input-border)] p-4">
									<input
										type="email"
										value={email}
										onChange={handleEmailChange}
										placeholder="your.email@example.com"
										className="bg-transparent border-none outline-none w-3/5 placeholder-[var(--text-secondary)]"
										required
									/>
									<span className="font-medium text-[var(--text-neutral)] text-sm">
										Contact Email *
									</span>
								</div>
								{emailError && (
									<p className="text-red-500 text-xs">{emailError}</p>
								)}
							</div>
						</div>
					</CardContent>

					{/* Button placed at bottom-right of the card, match Submit Tuning sizing */}
					<div className="mt-4 pt-4 border-t border-[var(--input-border)] flex justify-end">
						<button
							disabled={uploadStage !== 'success' || !email || !validateEmail(email)}
							onClick={handleFinalSubmit}
							className={`px-5 py-3 rounded-xl text-sm font-semibold transition-colors ${
								uploadStage === 'success' && email && validateEmail(email)
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
							<div className="space-y-2">
								<div className="flex items-center justify-between bg-[var(--input-background)] rounded-xl border border-[var(--input-border)] p-4">
									<input
										type="email"
										value={email}
										onChange={handleEmailChange}
										placeholder="your.email@example.com"
										className="bg-transparent border-none outline-none w-3/5 placeholder-[var(--text-secondary)]"
										required
									/>
									<span className="font-medium text-[var(--text-neutral)] text-sm">
										Contact Email *
									</span>
								</div>
								{emailError && (
									<p className="text-red-500 text-xs">{emailError}</p>
								)}
							</div>

							<div>
								<label className="font-medium block mb-2 text-sm">
									Improvement Rationale *
								</label>
								<textarea
									value={tuningDescription}
									onChange={(e) => setTuningDescription(e.target.value)}
									placeholder="Describe your suggestions for model improvements, parameter adjustments, and expected impact..."
									className="w-full h-32 bg-[var(--light-selected)] border border-[var(--input-border)] rounded-lg p-3 outline-none focus:ring-2 focus:ring-black/20 text-sm"
									required
								/>
								<p className="text-xs mt-3 text-[var(--text-secondary)] leading-relaxed">
									Submissions are reviewed; accepted suggestions may appear in
									the next model iteration (24–48h retrain latency).
								</p>
							</div>

							<div className="flex flex-wrap gap-3 items-center">
								{tuningDescription.trim() !== '' && (
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
											onClick={() => setTuningDescription('')}
											className="px-4 py-2 rounded-md text-sm font-medium bg-[var(--input-background)] border border-[var(--input-border)] hover:bg-[var(--hover-background)]"
										>
											Clear
										</button>
									</>
								)}
								{tuningDescription.trim() === '' && tuningSaved && (
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
										disabled={!email || !validateEmail(email) || tuningDescription.trim() === ''}
										onClick={handleFinalSubmit}
										className={`px-5 py-3 rounded-xl text-sm font-semibold transition-colors ${
											email && validateEmail(email) && tuningDescription.trim() !== ''
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
					<div className="space-y-6 text-sm leading-relaxed">
						<p>
							We're building the future of exoplanet discovery through machine learning, and your contributions make our models better. Whether you're a researcher, student, or enthusiast, there are multiple ways to help improve our prediction accuracy and expand our capabilities.
						</p>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div className="space-y-4">
								<h4 className="font-semibold text-base">Contribute to Development</h4>
								<p>
									If you have improvement suggestions, feature requests, or want to contribute code, visit our official GitHub repository. You can create pull requests, start discussions, or report issues to help us build better tools.
								</p>
								<div className="flex items-center gap-3">
									<span className="font-medium">GitHub:</span>
									<a
										href="https://github.com/Exchron"
										target="_blank"
										rel="noopener noreferrer"
										className="text-blue-600 hover:text-blue-800 underline transition-colors"
									>
										https://github.com/Exchron
									</a>
								</div>
							</div>

							<div className="space-y-4">
								<h4 className="font-semibold text-base">Get Support & Documentation</h4>
								<p>
									Need help with the interface, API integration, or understanding our models? Our comprehensive documentation covers everything from getting started to advanced usage patterns and best practices.
								</p>
								<div className="flex items-center gap-3">
									<span className="font-medium">Docs:</span>
									<a
										href="https://docs.exchronai.earth"
										target="_blank"
										rel="noopener noreferrer"
										className="text-blue-600 hover:text-blue-800 underline transition-colors"
									>
										docs.exchronai.earth
									</a>
								</div>
							</div>
						</div>

						<div className="bg-[var(--input-background)] rounded-lg p-4 space-y-3">
							<h4 className="font-semibold text-base">Direct Contact & Data Privacy</h4>
							<p>
								Have questions about how your data is processed, stored, or used in our model training? Want to understand our fine-tuning methodology or discuss collaboration opportunities? We're committed to transparency and responsible AI practices.
							</p>
							<div className="flex items-center gap-3">
								<span className="font-medium">Contact:</span>
								<a
									href="mailto:info.exchron@gmail.com"
									className="text-blue-600 hover:text-blue-800 underline transition-colors"
								>
									info.exchron@gmail.com
								</a>
							</div>
						</div>

						<div className="text-xs text-[var(--text-secondary)] border-t border-[var(--input-border)] pt-4">
							<p>
								<strong>Ways to contribute:</strong> Submit unique datasets • Report false positives/negatives • Suggest feature engineering improvements • Share domain expertise • Contribute validation sets • Provide model feedback
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
