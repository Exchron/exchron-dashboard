'use client';

import React, { useState, useEffect, useRef } from 'react';
import TabNavigation from './tabnavigation';
import Link from 'next/link';
import Image from 'next/image';
import { AIChatPopup } from '../ui/AIChatPopup';
import { PredictionProvider } from './predictioncontext';

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

	// Initialize mode from props, localStorage, or URL path
	useEffect(() => {
		// Clear any existing selections on app start
		const isInitialLoad = !sessionStorage.getItem('appInitialized');
		if (isInitialLoad) {
			localStorage.removeItem('selectedModel');
			localStorage.removeItem('selectedDataInput');
			sessionStorage.setItem('appInitialized', 'true');
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
				// Ignore parsing errors
			}
		}

		const savedDataInput = localStorage.getItem('selectedDataInput');
		if (savedDataInput) {
			setSelectedDataInput(savedDataInput);
		}

		// Set up a storage event listener to sync across tabs/components
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

		window.addEventListener('storage', handleStorageChange);

		return () => {
			window.removeEventListener('storage', handleStorageChange);
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

	return (
		<PredictionProvider>
			<div className="min-h-screen bg-[#ECECEC] flex">
				{/* Sidebar */}
				<aside className="w-[240px] min-h-screen bg-[#F9F9F9] border border-[#D1D1D1] shadow-[0px_0px_40px_0px_rgba(0,0,0,0.08)] flex flex-col fixed left-0 top-0 bottom-0">
					{/* Logo */}
					<div className="p-6 flex items-center gap-3">
						<div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
							{/* Placeholder for logo */}
							<span className="text-xl font-bold">E</span>
						</div>
						<h1 className="text-2xl font-bold tracking-tight">Exchron</h1>
					</div>

					{/* Tab Navigation */}
					<nav className="px-3 mt-8">
						<TabNavigation activeTab={activeTab} mode={selectedMode} />
					</nav>

					{/* Create model section - Different content based on mode */}
					<div className="mt-auto p-4">
						{selectedMode === 'Classroom' ? (
							<div className="bg-[var(--hover-background)] border border-[var(--input-border)] rounded-xl p-5 mb-4">
								<h3 className="font-medium text-xl mb-2">Try our model</h3>
								<p className="text-sm text-[var(--text-neutral)]">
									Try <strong>Playground Mode</strong> to see our own Machine
									Learning Model in action.
									<br />
									<br />
									Visit Documentation for more information.
								</p>
							</div>
						) : (
							<div className="bg-[var(--hover-background)] border border-[var(--input-border)] rounded-xl p-5 mb-4">
								<h3 className="font-medium text-xl mb-2">Create your model</h3>
								<p className="text-sm text-[var(--text-neutral)]">
									Try <strong>Classroom Mode</strong> to create your own Machine
									Learning Model.
									<br />
									<br />
									Visit Documentation for more information.
								</p>
							</div>
						)}

						{/* Contact */}
						<div className="bg-[var(--input-background)] border border-[var(--input-border)] rounded-xl p-4 mb-4">
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

						{/* Selected Model & Data Input Display - Centered */}
						{selectedMode === 'Playground' && activeTab !== 'enhance' && (
							<div className="flex items-center gap-4">
								<div
									className="flex flex-col items-center"
									style={{ display: selectedModel ? 'flex' : 'none' }}
								>
									<span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide mb-1">
										Model
									</span>
									<span className="text-lg font-semibold text-black">
										{selectedModel?.name}
									</span>
								</div>
								<div
									className="w-px h-12 bg-[var(--input-border)]"
									style={{
										display:
											selectedModel && selectedDataInput ? 'block' : 'none',
									}}
								></div>
								<div
									className="flex flex-col items-center"
									style={{ display: selectedDataInput ? 'flex' : 'none' }}
								>
									<span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide mb-1">
										Data Input Method
									</span>
									<span className="text-lg font-semibold text-black">
										{selectedDataInput}
									</span>
								</div>
							</div>
						)}

						<div className="flex gap-3">
							{/* Documentation link */}
							<Link
								href="#"
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
								<svg
									className="w-6 h-6"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 01-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 01-.69.001l-.002-.001z" />
								</svg>
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
		</PredictionProvider>
	);
}
