import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface TabNavigationProps {
	activeTab: string;
	mode: string;
}

export default function TabNavigation({ activeTab, mode }: TabNavigationProps) {
	// Tabs for Playground mode
	const playgroundTabs = [
		{
			id: 'overview',
			number: '01',
			name: 'Overview',
			href: '/dashboard/playground/overview',
		},
		{
			id: 'data-input',
			number: '02',
			name: 'Data Input',
			href: '/dashboard/playground/data-input',
		},
		{
			id: 'results',
			number: '03',
			name: 'Results',
			href: '/dashboard/playground/results',
		},
		{
			id: 'enhance',
			number: '04',
			name: 'Enhance',
			href: '/dashboard/playground/enhance',
		},
	];

	// Tabs for Classroom mode
	const classroomTabs = [
		{
			id: 'data-input',
			number: '01',
			name: 'Data Input',
			href: '/dashboard/classroom/data-input',
		},
		{
			id: 'model-selection',
			number: '02',
			name: 'Model Selection',
			href: '/dashboard/classroom/model-selection',
		},
		{
			id: 'train-validate',
			number: '03',
			name: 'Train & Validate',
			href: '/dashboard/classroom/train-validate',
		},
	];

	// Use state to prevent flickering during mode changes
	const [currentTabs, setCurrentTabs] = useState(playgroundTabs);

	// Only update tabs when mode changes, using useEffect to prevent flickering
	useEffect(() => {
		const isClassroomMode =
			mode && typeof mode === 'string' && mode.toLowerCase() === 'classroom';
		setCurrentTabs(isClassroomMode ? classroomTabs : playgroundTabs);
	}, [mode]);

	return (
		<div className="flex flex-col space-y-3 font-['Inter'] text-sm">
			{currentTabs.map((tab) => {
				const isActive = activeTab === tab.id;

				return (
					<Link
						key={tab.id}
						href={tab.href}
						className={`flex py-2.5 px-3 rounded-lg transition-colors ${
							isActive
								? 'bg-[var(--light-selected)] border border-[var(--input-border)] font-semibold'
								: 'text-[var(--muted-text)] font-medium hover:bg-[var(--input-background)]'
						}`}
					>
						<span className="w-8 text-center">{tab.number}</span>
						<span
							className={`flex-1 ${isActive ? 'text-right' : 'text-right'}`}
						>
							{tab.name}
						</span>
					</Link>
				);
			})}
		</div>
	);
}
