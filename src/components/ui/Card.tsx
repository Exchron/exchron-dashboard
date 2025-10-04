import React from 'react';

interface CardProps {
	className?: string;
	children: React.ReactNode;
}

export function Card({ className = '', children }: CardProps) {
	return (
		<div
			className={`bg-white rounded-[24px] shadow-[0px_0px_10px_1px_rgba(0,0,0,0.1)] p-5 ${className}`}
		>
			{children}
		</div>
	);
}

export function CardTitle({
	children,
	className = '',
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<h2
			className={`text-xl font-semibold text-black mb-3 font-['Inter'] ${className}`}
		>
			{children}
		</h2>
	);
}

export function CardContent({
	children,
	className = '',
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div
			className={`text-black font-['Inter'] font-medium text-base ${className}`}
		>
			{children}
		</div>
	);
}
