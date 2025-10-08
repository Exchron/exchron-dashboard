'use client';

import React, { useState, useEffect, useRef } from 'react';
import TabNavigation from './tabnavigation';
import Link from 'next/link';
import Image from 'next/image';
import { AIChatPopup } from '../ui/AIChatPopup';
import { Tutorial } from '../ui/Tutorial';
import { PredictionProvider } from './predictioncontext';
import AiImg from '../../../assets/logos/ai.png';
import exchronLogo from '../../../assets/Logo.png';

interface DashboardLayoutProps {
	children: React.ReactNode;
	activeTab: string;
	mode?: 'playground' | 'classroom';
}

export default function DashboardLayout({
	children,
	activeTab,
	mode,
}: DashboardLayoutProps) {
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [isChatOpen, setIsChatOpen] = useState(false);
	const [isTutorialOpen, setIsTutorialOpen] = useState(false);
	const [chatAnchorEl, setChatAnchorEl] = useState<HTMLButtonElement | null>(
		null,
	);
	const [selectedMode, setSelectedMode] = useState<string>('Playground');
	const [selectedModel, setSelectedModel] = useState<{
		id: string;
		name: string;
		short: string;
	} | null>(null);
	const [selectedDataInput, setSelectedDataInput] = useState<string | null>(
		null,
	);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const askAiButtonRef = useRef<HTMLButtonElement>(null);

	const handleAskAIClick = () => {
		setChatAnchorEl(askAiButtonRef.current);
		setIsChatOpen((prev) => !prev);
	};

	const handleCloseChat = () => {
		setIsChatOpen(false);
	};

	const handleCloseTutorial = () => {
		setIsTutorialOpen(false);
	};

	// Initialize mode from props, localStorage, or URL path
	useEffect(() => {
		// Clear any existing selections on app start
		const isInitialLoad = !sessionStorage.getItem('appInitialized');
		if (isInitialLoad) {
			localStorage.removeItem('selectedModel');
			localStorage.removeItem('selectedDataInput');
			sessionStorage.setItem('appInitialized', 'true');
		}

		// Check if tutorial should be shown for first-time users
		const tutorialCompleted = localStorage.getItem('tutorialCompleted');
		if (!tutorialCompleted && isInitialLoad) {
			// Only show tutorial on first load, not on every page navigation
			setIsTutorialOpen(true);
		}

		if (mode) {
			// If mode prop is provided, use it (capitalize first letter for display)
			const displayMode =
				mode.charAt(0).toUpperCase() + mode.slice(1).toLowerCase();
			setSelectedMode(displayMode);
			// Also update localStorage to maintain consistency
			localStorage.setItem('dashboardMode', displayMode);
		} else {
			// Check if we're on a classroom or playground path
			const isClassroomPath = window.location.pathname.includes(
				'/dashboard/classroom',
			);
			const isPlaygroundPath = window.location.pathname.includes(
				'/dashboard/playground',
			);

			if (isClassroomPath) {
				setSelectedMode('Classroom');
				localStorage.setItem('dashboardMode', 'Classroom');
			} else if (isPlaygroundPath) {
				setSelectedMode('Playground');
				localStorage.setItem('dashboardMode', 'Playground');
			} else {
				// Try to get from localStorage
				const savedMode = localStorage.getItem('dashboardMode');
				if (
					savedMode &&
					(savedMode === 'Playground' || savedMode === 'Classroom')
				) {
					setSelectedMode(savedMode);
				}
			}
		}

			// Load selected model and data input method from localStorage
			const savedModel = localStorage.getItem('selectedModel');
			if (savedModel) {
				try {
					const parsed = JSON.parse(savedModel);
					setSelectedModel(parsed);
				} catch (e) {
					// Ignore parsing errors, clear invalid data
					localStorage.removeItem('selectedModel');
				}
			}

			const savedDataInput = localStorage.getItem('selectedDataInput');
			if (savedDataInput) {
				setSelectedDataInput(savedDataInput);
			}		// Set up a storage event listener to sync across tabs/components
		const handleStorageChange = (e: StorageEvent) => {
			if (e.key === 'selectedModel' && e.newValue) {
				try {
					const parsed = JSON.parse(e.newValue);
					setSelectedModel(parsed);
				} catch (err) {
					// Ignore parsing errors
				}
			}
			if (e.key === 'selectedDataInput' && e.newValue) {
				setSelectedDataInput(e.newValue);
			}
		};

		// Also listen for custom storage events from within the same tab
		const handleCustomStorageChange = () => {
			const savedModel = localStorage.getItem('selectedModel');
			if (savedModel) {
				try {
					const parsed = JSON.parse(savedModel);
					setSelectedModel(parsed);
				} catch (e) {
					setSelectedModel(null);
				}
			} else {
				setSelectedModel(null);
			}

			const savedDataInput = localStorage.getItem('selectedDataInput');
			setSelectedDataInput(savedDataInput);
		};

		window.addEventListener('storage', handleStorageChange);
		window.addEventListener('localStorageChange', handleCustomStorageChange);

		return () => {
			window.removeEventListener('storage', handleStorageChange);
			window.removeEventListener('localStorageChange', handleCustomStorageChange);
		};
	}, [mode]);

	// Handle clicks outside of dropdown to close it
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsDropdownOpen(false);
			}
		}

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [dropdownRef]);

	// Handle mode selection
	const handleModeSelect = (mode: string) => {
		// Save selected mode to localStorage first
		localStorage.setItem('dashboardMode', mode);

		// Update state and close dropdown
		setSelectedMode(mode);
		setIsDropdownOpen(false);

		// Use location.assign for smoother navigation
		if (mode === 'Classroom') {
			// Redirect to the classroom dashboard data input page
			window.location.assign('/dashboard/classroom/data-input');
		} else {
			// Redirect to the playground overview page
			window.location.assign('/dashboard/playground/overview');
		}
	};

	const handleContactClick = () => {
		const gmailCompose =
			'https://mail.google.com/mail/?view=cm&fs=1&to=info.exchron@gmail.com';
		const opened = window.open(gmailCompose, '_blank', 'noopener,noreferrer');
		if (!opened) {
			window.location.href = 'mailto:info.exchron@gmail.com';
		}
	};

	return (
		<PredictionProvider>
			<div className="min-h-screen bg-[#ECECEC] flex">
				{/* Sidebar */}
				<aside className="w-[240px] min-h-screen bg-[#F9F9F9] border border-[#D1D1D1] shadow-[0px_0px_40px_0px_rgba(0,0,0,0.08)] flex flex-col fixed left-0 top-0 bottom-0">
					{/* Logo */}
					<div className="p-6 flex items-center gap-3">
						<div className="w-10 h-10 bg-transparent ull flex items-center justify-center overflow-hidden">
							<Image
								src={exchronLogo}
								alt="Exchron Logo"
								width={35}
								height={35}
							/>
						</div>
						<h1 className="text-2xl font-bold tracking-tight">Exchron</h1>
					</div>

					{/* Tab Navigation */}
					<nav className="px-3 mt-8">
						<TabNavigation activeTab={activeTab} mode={selectedMode} />
					</nav>

					{/* Create model section - Different content based on mode */}
					<div className="mt-auto p-4">
						{/* Unified informational card for both Classroom & Playground */}
						<a
							className="block bg-[var(--hover-background)] border border-[var(--input-border)] rounded-xl p-5 mb-4 hover:shadow-sm transition-shadow"
							href="https://learn.exchronai.earth"
							target="_blank"
							rel="noopener noreferrer"
							aria-label="Learn more about exoplanets on learn.exchronai.earth (opens in new tab)"
						>
							<h3 className="text-xl mb-2">
								<span className="font-medium">Learn more about exoplanets</span>
							</h3>
							<p className="text-sm text-[var(--text-neutral)] leading-relaxed">
								Explore how exoplanets are found and classified — from detection methods to diverse planet types.
							</p>
							<p className="mt-3 text-sm font-semibold text-[var(--muted-text)] flex items-center gap-1">
								<span>Visit our leaning platform</span>
								<svg
									className="w-4 h-4"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fillRule="evenodd"
										d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z"
										clipRule="evenodd"
									/>
								</svg>
							</p>
						</a>

						{/* Tutorial */}
						<div
							className="bg-[var(--input-background)] border border-[var(--input-border)] rounded-xl p-4 mb-4 cursor-pointer hover:bg-[var(--hover-background)] transition-colors select-none"
							role="button"
							tabIndex={0}
							onClick={() => setIsTutorialOpen(true)}
							onKeyDown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									setIsTutorialOpen(true);
								}
							}}
							aria-label="Show tutorial"
						>
							<p className="text-sm flex items-center justify-between">
								Show Tutorial
								<svg
									className="w-5 h-5"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fillRule="evenodd"
										d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
										clipRule="evenodd"
									/>
								</svg>
							</p>
						</div>

						{/* Contact */}
						<div
							className="bg-[var(--input-background)] border border-[var(--input-border)] rounded-xl p-4 mb-4 cursor-pointer hover:bg-[var(--hover-background)] transition-colors select-none"
							role="button"
							tabIndex={0}
							onClick={handleContactClick}
							onKeyDown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									handleContactClick();
								}
							}}
							aria-label="Contact Exchron via email (opens compose window)"
						>
							<p className="text-sm">Contact</p>
							<p className="text-sm flex items-center justify-between">
								info.exchron@gmail.com
								<svg
									className="w-5 h-5"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fillRule="evenodd"
										d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z"
										clipRule="evenodd"
									/>
								</svg>
							</p>
						</div>

						{/* Footer */}
						<footer className="text-center text-sm text-[var(--text-neutral)]">
							<p>Copyright - Exchron 2025</p>
							<p>All Rights Reserved</p>
						</footer>
					</div>
				</aside>

				<div className="flex-1 ml-[240px] flex flex-col">
					{/* Header - Fixed position */}
					<header className="fixed top-0 right-0 left-[240px] flex items-center justify-between p-5 z-10 bg-transparent">
						{/* Mode Selection */}
						<div
							className="bg-[var(--input-background)] rounded-lg shadow-[0px_0px_40px_0px_rgba(0,0,0,0.08)] p-3 relative"
							ref={dropdownRef}
						>
							<div
								className="flex items-center gap-2 cursor-pointer"
								onClick={() => setIsDropdownOpen(!isDropdownOpen)}
							>
								<span className="font-semibold text-lg">{selectedMode}</span>
								<svg
									className={`w-6 h-6 transition-transform duration-200 ${
										isDropdownOpen ? 'transform rotate-180' : ''
									}`}
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fillRule="evenodd"
										d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
										clipRule="evenodd"
									/>
								</svg>
							</div>
							{/* Dropdown menu */}
							{isDropdownOpen && (
								<div className="absolute top-full left-0 mt-1 w-full bg-white border border-[var(--border-color)] rounded-lg shadow-lg z-20">
									<div className="py-2">
										<div
											className={`px-4 py-2 hover:bg-[var(--input-background)] cursor-pointer ${
												selectedMode === 'Playground'
													? 'bg-[var(--light-selected)] font-medium'
													: ''
											}`}
											onClick={() => handleModeSelect('Playground')}
										>
											Playground
										</div>
										<div
											className={`px-4 py-2 hover:bg-[var(--input-background)] cursor-pointer ${
												selectedMode === 'Classroom'
													? 'bg-[var(--light-selected)] font-medium'
													: ''
											}`}
											onClick={() => handleModeSelect('Classroom')}
										>
											Classroom
										</div>
									</div>
								</div>
							)}
						</div>

					{/* Status Display - Shows progress bar for Classroom mode, selections for Playground */}
					{selectedMode === 'Classroom' ? (
						<div className="flex items-center justify-center">
							<div className="flex items-center space-x-2 md:space-x-4 bg-white px-6 py-3 rounded-xl shadow-sm">
								{/* Data Input */}
								<div className="flex items-center">
									<div className={`w-8 h-8 rounded-full flex items-center justify-center ${
										['data-input'].includes(activeTab) 
											? 'bg-black text-white' 
											: ['model-selection', 'train-validate', 'test-export'].includes(activeTab)
												? 'bg-black text-white' 
												: 'bg-[#E6E7E9] text-gray-500'
									}`}>
										{['model-selection', 'train-validate', 'test-export'].includes(activeTab) ? (
											<svg
												xmlns="http://www.w3.org/2000/svg"
												className="w-5 h-5"
												viewBox="0 0 20 20"
												fill="currentColor"
											>
												<path
													fillRule="evenodd"
													d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
													clipRule="evenodd"
												/>
											</svg>
										) : (
											<span className="text-sm font-bold">1</span>
										)}
									</div>
									<span className={`ml-2 text-sm font-medium ${
										['data-input'].includes(activeTab) ? '' : 'text-gray-500'
									}`}>
										Data Input
									</span>
								</div>

								{/* Connector Line */}
								<div className={`w-8 h-0.5 ${
									['model-selection', 'train-validate', 'test-export'].includes(activeTab) ? 'bg-black' : 'bg-[#E6E7E9]'
								}`}></div>

								{/* Model Selection */}
								<div className="flex items-center">
									<div className={`w-8 h-8 rounded-full flex items-center justify-center ${
										['model-selection'].includes(activeTab) 
											? 'bg-black text-white' 
											: ['train-validate', 'test-export'].includes(activeTab)
												? 'bg-black text-white' 
												: 'bg-[#E6E7E9] text-gray-500'
									}`}>
										{['train-validate', 'test-export'].includes(activeTab) ? (
											<svg
												xmlns="http://www.w3.org/2000/svg"
												className="w-5 h-5"
												viewBox="0 0 20 20"
												fill="currentColor"
											>
												<path
													fillRule="evenodd"
													d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
													clipRule="evenodd"
												/>
											</svg>
										) : (
											<span className="text-sm font-bold">2</span>
										)}
									</div>
									<span className={`ml-2 text-sm font-medium ${
										['model-selection'].includes(activeTab) ? '' : 'text-gray-500'
									}`}>
										Model Selection
									</span>
								</div>

								{/* Connector Line */}
								<div className={`w-8 h-0.5 ${
									['train-validate', 'test-export'].includes(activeTab) ? 'bg-black' : 'bg-[#E6E7E9]'
								}`}></div>

								{/* Train & Validate */}
								<div className="flex items-center">
									<div className={`w-8 h-8 rounded-full flex items-center justify-center ${
										['train-validate'].includes(activeTab) 
											? 'bg-black text-white' 
											: ['test-export'].includes(activeTab)
												? 'bg-black text-white' 
												: 'bg-[#E6E7E9] text-gray-500'
									}`}>
										{['test-export'].includes(activeTab) ? (
											<svg
												xmlns="http://www.w3.org/2000/svg"
												className="w-5 h-5"
												viewBox="0 0 20 20"
												fill="currentColor"
											>
												<path
													fillRule="evenodd"
													d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
													clipRule="evenodd"
												/>
											</svg>
										) : (
											<span className="text-sm font-bold">3</span>
										)}
									</div>
									<span className={`ml-2 text-sm font-medium ${
										['train-validate'].includes(activeTab) ? '' : 'text-gray-500'
									}`}>
										Train & Validate
									</span>
								</div>

								{/* Connector Line */}
								<div className={`w-8 h-0.5 ${
									['test-export'].includes(activeTab) ? 'bg-black' : 'bg-[#E6E7E9]'
								}`}></div>

								{/* Test & Export */}
								<div className="flex items-center">
									<div className={`w-8 h-8 rounded-full flex items-center justify-center ${
										['test-export'].includes(activeTab) 
											? 'bg-black text-white' 
											: 'bg-[#E6E7E9] text-gray-500'
									}`}>
										<span className="text-sm font-bold">4</span>
									</div>
									<span className={`ml-2 text-sm font-medium ${
										['test-export'].includes(activeTab) ? '' : 'text-gray-500'
									}`}>
										Test & Export
									</span>
								</div>
							</div>
						</div>
					) : (selectedModel || selectedDataInput) ? (
						<div className="flex items-center gap-4">
							{selectedModel && (
								<div className="flex flex-col items-center">
									<span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide mb-1">
										Model
									</span>
									<span className="text-lg font-semibold text-black">
										{selectedModel?.name || selectedModel?.short}
									</span>
								</div>
							)}
							{selectedModel && selectedDataInput && (
								<div className="w-px h-12 bg-[var(--input-border)]"></div>
							)}
							{selectedDataInput && (
								<div className="flex flex-col items-center">
									<span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide mb-1">
										Data Input
									</span>
									<span className="text-lg font-semibold text-black">
										{selectedDataInput}
									</span>
								</div>
							)}
						</div>
					) : null}						<div className="flex gap-3">
							{/* Documentation link */}
							<Link
								href="https://docs.exchronai.earth/"
								target="_blank"
								rel="noopener noreferrer"
								className="bg-[var(--background)] border border-[var(--input-border)] rounded-xl p-3 flex items-center gap-2 hover:bg-[var(--hover-background)] transition-colors text-sm"
							>
								<span className="font-semibold text-[var(--muted-text)]">
									Visit Documentation
								</span>
								<svg
									className="w-5 h-5"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fillRule="evenodd"
										d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z"
										clipRule="evenodd"
									/>
								</svg>
							</Link>

							{/* AI Button */}
							<button
								ref={askAiButtonRef}
								onClick={handleAskAIClick}
								className="bg-white rounded-xl shadow-[0px_0px_40px_0px_rgba(0,0,0,0.08)] p-3 flex items-center gap-2 hover:bg-[var(--hover-background)] transition-colors text-sm"
							>
								<Image src={AiImg} alt="AI" width={24} height={24} />
								<span className="font-semibold">Ask AI</span>
							</button>
						</div>
					</header>

					{/* Main content - Add padding top to account for fixed header */}
					<main className="flex-1 px-6 pt-28 py-4 text-[var(--text-base)]">
						{children}
					</main>

					<AIChatPopup
						isOpen={isChatOpen}
						onClose={handleCloseChat}
						anchorEl={chatAnchorEl}
					/>
				</div>
			</div>
			
			<Tutorial 
				isOpen={isTutorialOpen}
				onClose={handleCloseTutorial}
			/>
		</PredictionProvider>
	);
}
