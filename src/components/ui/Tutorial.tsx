'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardTitle, CardContent } from './Card';

interface TutorialProps {
	isOpen: boolean;
	onClose: () => void;
}

interface TutorialStep {
	id: number;
	title: string;
	content: React.ReactNode;
}

export function Tutorial({ isOpen, onClose }: TutorialProps) {
	const [currentStep, setCurrentStep] = useState(0);

	// Reset to first step when tutorial is opened
	useEffect(() => {
		if (isOpen) {
			setCurrentStep(0);
		}
	}, [isOpen]);

	// Prevent body scroll when tutorial is open
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = 'unset';
		}
		
		return () => {
			document.body.style.overflow = 'unset';
		};
	}, [isOpen]);

	const tutorialSteps: TutorialStep[] = [
		{
			id: 1,
			title: "Welcome to Exchron Dashboard",
			content: (
				<div className="space-y-5">
					<p className="text-base text-[var(--text-neutral)] leading-relaxed">
						Welcome! This is your gateway to exploring and understanding exoplanets through machine learning.
					</p>
					
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="bg-[var(--input-background)] border border-[var(--input-border)] rounded-lg p-4">
							<h4 className="font-semibold text-black mb-2">🔬 Playground Mode</h4>
							<p className="text-sm text-[var(--text-neutral)]">
								Experiment with pre-built machine learning models to classify exoplanets using real astronomical data.
							</p>
						</div>
						
						<div className="bg-[var(--input-background)] border border-[var(--input-border)] rounded-lg p-4">
							<h4 className="font-semibold text-black mb-2">🎓 Classroom Mode</h4>
							<p className="text-sm text-[var(--text-neutral)]">
								Build and train your own custom machine learning models from scratch. Perfect for learning and experimentation.
							</p>
						</div>
					</div>

					<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
						<p className="text-sm text-blue-800">
							<strong>New to exoplanets?</strong> 
							<a 
								href="https://learn.exchronai.earth" 
								target="_blank" 
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1 text-blue-600 underline hover:text-blue-800 transition-colors ml-1"
							>
								Want to learn about exoplanets first? Visit our learning platform
								<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
									<path fillRule="evenodd" d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z" clipRule="evenodd" />
								</svg>
							</a>
						</p>
					</div>

					<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
						<p className="text-sm text-yellow-800">
							<strong>⚠️ Important Notice:</strong> In Classroom mode, all machine learning training and evaluation runs directly in your browser. Please ensure JavaScript is enabled.
						</p>
					</div>
				</div>
			)
		},
		{
			id: 2,
			title: "Playground Mode Workflow",
			content: (
				<div className="space-y-5">
					<p className="text-base text-[var(--text-neutral)] leading-relaxed">
						In Playground mode, you'll work with pre-trained models to analyze real exoplanet data. Here's what you can do:
					</p>
					
					<div className="space-y-4">
						<div className="flex items-start gap-4">
							<div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
								1
							</div>
							<div>
								<h4 className="font-semibold text-black mb-1">Overview Tab</h4>
								<p className="text-sm text-[var(--text-neutral)]">
									Explore model architecture and performance metrics. See how different machine learning models (CNN, DNN, SVM, etc.) perform on exoplanet classification tasks.
								</p>
							</div>
						</div>
						
						<div className="flex items-start gap-4">
							<div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
								2
							</div>
							<div>
								<h4 className="font-semibold text-black mb-1">Data Input Tab</h4>
								<p className="text-sm text-[var(--text-neutral)]">
									Input your data manually or upload CSV files. The system accepts various astronomical parameters like stellar properties, orbital characteristics, and light curve data.
								</p>
							</div>
						</div>
						
						<div className="flex items-start gap-4">
							<div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
								3
							</div>
							<div>
								<h4 className="font-semibold text-black mb-1">Results Tab</h4>
								<p className="text-sm text-[var(--text-neutral)]">
									View model predictions, confidence scores, and detailed analysis of your exoplanet candidates with interactive visualizations.
								</p>
							</div>
						</div>

						<div className="flex items-start gap-4">
							<div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
								4
							</div>
							<div>
								<h4 className="font-semibold text-black mb-1">Enhance Tab</h4>
								<p className="text-sm text-[var(--text-neutral)]">
									Fine-tune parameters, compare different models, and export your results for further analysis.
								</p>
							</div>
						</div>
					</div>

					<div className="bg-green-50 border border-green-200 rounded-lg p-4">
						<p className="text-sm text-green-800">
							<strong>🚀 Quick Start:</strong> Try uploading the sample data file or use the manual input form to test different models immediately!
						</p>
					</div>
				</div>
			)
		},
		{
			id: 3,
			title: "Classroom Mode Workflow",
			content: (
				<div className="space-y-5">
					<p className="text-base text-[var(--text-neutral)] leading-relaxed">
						Classroom mode lets you build and train custom machine learning models from scratch. Perfect for learning and experimentation:
					</p>
					
					<div className="space-y-4">
						<div className="flex items-start gap-4">
							<div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
								1
							</div>
							<div>
								<h4 className="font-semibold text-black mb-1">Data Input & Preparation</h4>
								<p className="text-sm text-[var(--text-neutral)]">
									Upload your dataset (KOI, TESS, or K2 data), explore data distributions, handle missing values, and prepare features for training.
								</p>
							</div>
						</div>
						
						<div className="flex items-start gap-4">
							<div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
								2
							</div>
							<div>
								<h4 className="font-semibold text-black mb-1">Model Selection</h4>
								<p className="text-sm text-[var(--text-neutral)]">
									Choose from various ML algorithms (Neural Networks, Random Forest, SVM, etc.), configure hyperparameters, and set up your training pipeline.
								</p>
							</div>
						</div>
						
						<div className="flex items-start gap-4">
							<div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
								3
							</div>
							<div>
								<h4 className="font-semibold text-black mb-1">Train & Validate</h4>
								<p className="text-sm text-[var(--text-neutral)]">
									Train your model in real-time within your browser. Watch training progress, validation metrics, and learning curves as your model improves.
								</p>
							</div>
						</div>

						<div className="flex items-start gap-4">
							<div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
								4
							</div>
							<div>
								<h4 className="font-semibold text-black mb-1">Test & Export</h4>
								<p className="text-sm text-[var(--text-neutral)]">
									Evaluate your trained model on test data, analyze performance metrics, and export your model for future use or sharing.
								</p>
							</div>
						</div>
					</div>

					<div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
						<p className="text-sm text-purple-800">
							<strong>💻 Browser-Based Training:</strong> All computations happen locally in your browser using WebGL acceleration. No data leaves your device!
						</p>
					</div>
				</div>
			)
		},
		{
			id: 4,
			title: "Understanding the Data",
			content: (
				<div className="space-y-5">
					<p className="text-base text-[var(--text-neutral)] leading-relaxed">
						Exchron works with real astronomical data to identify and classify exoplanets. Here's what you'll be analyzing:
					</p>
					
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="bg-[var(--input-background)] border border-[var(--input-border)] rounded-lg p-4">
							<h4 className="font-semibold text-black mb-2">🌟 Stellar Properties</h4>
							<ul className="text-sm text-[var(--text-neutral)] space-y-1">
								<li>• Temperature and luminosity</li>
								<li>• Stellar radius and mass</li>
								<li>• Metallicity and age</li>
								<li>• Surface gravity</li>
							</ul>
						</div>
						
						<div className="bg-[var(--input-background)] border border-[var(--input-border)] rounded-lg p-4">
							<h4 className="font-semibold text-black mb-2">🪐 Planetary Signals</h4>
							<ul className="text-sm text-[var(--text-neutral)] space-y-1">
								<li>• Transit depth and duration</li>
								<li>• Orbital period</li>
								<li>• Planet-to-star radius ratio</li>
								<li>• Signal-to-noise ratio</li>
							</ul>
						</div>

						<div className="bg-[var(--input-background)] border border-[var(--input-border)] rounded-lg p-4">
							<h4 className="font-semibold text-black mb-2">📊 Light Curves</h4>
							<ul className="text-sm text-[var(--text-neutral)] space-y-1">
								<li>• Time-series brightness data</li>
								<li>• Transit detection algorithms</li>
								<li>• Noise characterization</li>
								<li>• False positive filtering</li>
							</ul>
						</div>

						<div className="bg-[var(--input-background)] border border-[var(--input-border)] rounded-lg p-4">
							<h4 className="font-semibold text-black mb-2">🎯 Classification</h4>
							<ul className="text-sm text-[var(--text-neutral)] space-y-1">
								<li>• Confirmed planets</li>
								<li>• Planet candidates</li>
								<li>• False positives</li>
								<li>• Confidence scoring</li>
							</ul>
						</div>
					</div>

					<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
						<p className="text-sm text-blue-800">
							<strong>🔬 Data Sources:</strong> We use data from NASA's Kepler, TESS, and K2 missions, processed and curated for machine learning applications.
						</p>
					</div>
				</div>
			)
		},
		{
			id: 5,
			title: "Dashboard Navigation",
			content: (
				<div className="space-y-5">
					<p className="text-base text-[var(--text-neutral)] leading-relaxed">
						Let's explore the main components of your dashboard interface:
					</p>
					
					<div className="space-y-4">
						<div className="flex items-start gap-4">
							<div className="w-8 h-8 bg-gray-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
								1
							</div>
							<div>
								<h4 className="font-semibold text-black mb-1">Mode Selector (Top Left)</h4>
								<p className="text-sm text-[var(--text-neutral)]">
									Switch between Playground and Classroom modes. Your selection is saved and persists across sessions.
								</p>
							</div>
						</div>
						
						<div className="flex items-start gap-4">
							<div className="w-8 h-8 bg-gray-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
								2
							</div>
							<div>
								<h4 className="font-semibold text-black mb-1">Tab Navigation (Left Sidebar)</h4>
								<p className="text-sm text-[var(--text-neutral)]">
									Progress through your workflow using the sidebar tabs. Each mode has a different set of tabs optimized for that workflow.
								</p>
							</div>
						</div>
						
						<div className="flex items-start gap-4">
							<div className="w-8 h-8 bg-gray-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
								3
							</div>
							<div>
								<h4 className="font-semibold text-black mb-1">Progress Indicator (Top Center)</h4>
								<p className="text-sm text-[var(--text-neutral)]">
									In Classroom mode, track your progress through the 4-step process. In Playground mode, see your current model and data selections.
								</p>
							</div>
						</div>
						
						<div className="flex items-start gap-4">
							<div className="w-8 h-8 bg-gray-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
								4
							</div>
							<div>
								<h4 className="font-semibold text-black mb-1">Help & Documentation (Top Right)</h4>
								<p className="text-sm text-[var(--text-neutral)]">
									Access comprehensive documentation and get AI-powered assistance for any questions about the platform.
								</p>
							</div>
						</div>
					</div>

					<div className="bg-green-50 border border-green-200 rounded-lg p-4">
						<p className="text-sm text-green-800">
							<strong>💡 Pro Tip:</strong> Use the sidebar to access exoplanet learning resources and contact support whenever you need help!
						</p>
					</div>

					<div className="text-center">
						<p className="text-sm text-[var(--text-neutral)]">
							Ready to start exploring? 
							<a 
								href="https://docs.exchronai.earth" 
								target="_blank" 
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1 text-blue-600 underline hover:text-blue-800 transition-colors ml-1"
							>
								Check out our full documentation
								<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
									<path fillRule="evenodd" d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z" clipRule="evenodd" />
								</svg>
							</a>
						</p>
					</div>
				</div>
			)
		}
	];

	const handleFinish = () => {
		// Mark tutorial as completed in localStorage
		localStorage.setItem('tutorialCompleted', 'true');
		onClose();
	};

	const handleSkip = () => {
		// Mark tutorial as completed in localStorage
		localStorage.setItem('tutorialCompleted', 'true');
		onClose();
	};

	const handleNext = () => {
		if (currentStep < tutorialSteps.length - 1) {
			setCurrentStep(currentStep + 1);
		} else {
			handleFinish();
		}
	};

	const handlePrevious = () => {
		if (currentStep > 0) {
			setCurrentStep(currentStep - 1);
		}
	};

	// Handle keyboard navigation
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				handleSkip();
			} else if (e.key === 'ArrowRight' || e.key === 'Enter') {
				handleNext();
			} else if (e.key === 'ArrowLeft') {
				handlePrevious();
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [isOpen, currentStep, handleSkip, handleNext, handlePrevious]);

	if (!isOpen) return null;

	const currentTutorialStep = tutorialSteps[currentStep];
	const isLastStep = currentStep === tutorialSteps.length - 1;

	return (
		<div className="fixed inset-0 tutorial-overlay flex items-center justify-center z-50 p-4">
			<div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto tutorial-content">
				<Card className="relative backdrop-blur-sm bg-white/95 shadow-2xl">
					{/* Skip button - only show on first step */}
					{currentStep === 0 && (
						<button
							onClick={handleSkip}
							className="absolute top-4 right-4 text-[var(--muted-text)] hover:text-black transition-colors text-sm font-medium"
						>
							Skip Tutorial
						</button>
					)}

					<div className="mb-6">
						<CardTitle className="text-2xl mb-2">
							{currentTutorialStep.title}
						</CardTitle>
						
						{/* Progress indicator */}
						<div className="flex items-center gap-2 mb-4">
							{tutorialSteps.map((_, index) => (
								<div
									key={index}
									className={`h-2 flex-1 rounded-full ${
										index <= currentStep 
											? 'bg-black' 
											: 'bg-[var(--placeholder-color)]'
									}`}
								/>
							))}
						</div>
						
						<p className="text-sm text-[var(--muted-text)]">
							Step {currentStep + 1} of {tutorialSteps.length}
						</p>
					</div>

					<CardContent className="max-h-[50vh] overflow-y-auto">
						{currentTutorialStep.content}
					</CardContent>

					{/* Keyboard shortcuts hint */}
					<div className="text-xs text-[var(--muted-text)] text-center mt-5 py-2 border-t border-[var(--input-border)]">
						💡 Use arrow keys to navigate • Press Escape to skip • {tutorialSteps.length} steps total
					</div>

					{/* Navigation buttons */}
					<div className="flex justify-between items-center mt-4">
						<button
							onClick={handlePrevious}
							disabled={currentStep === 0}
							className={`px-4 py-2 rounded-lg border transition-colors ${
								currentStep === 0
									? 'border-[var(--placeholder-color)] text-[var(--placeholder-color)] cursor-not-allowed'
									: 'border-[var(--input-border)] text-[var(--text-neutral)] hover:bg-[var(--hover-background)]'
							}`}
						>
							Previous
						</button>

						<div className="flex gap-3">
							{!isLastStep && (
								<button
									onClick={handleSkip}
									className="px-4 py-2 text-[var(--muted-text)] hover:text-black transition-colors"
								>
									Skip
								</button>
							)}
							
							<button
								onClick={handleNext}
								className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
							>
								{isLastStep ? 'Get Started' : 'Next'}
							</button>
						</div>
					</div>
				</Card>
			</div>
		</div>
	);
}