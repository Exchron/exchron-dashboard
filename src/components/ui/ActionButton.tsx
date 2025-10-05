'use client';

import React from 'react';
import Link from 'next/link';

interface ActionButtonProps {
	href?: string;
	onClick?: () => void;
	children: React.ReactNode;
	variant?: 'primary' | 'secondary';
	icon?: 'arrow-right' | 'arrow-left' | 'refresh' | 'check' | 'none';
	size?: 'lg' | 'md' | 'sm';
	className?: string;
	disabled?: boolean;
	ariaLabel?: string;
}

const ICONS: Record<string, React.ReactElement> = {
	'arrow-right': (
		<svg
			className="w-5 h-5 ml-2"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 20 20"
			fill="currentColor"
		>
			<path
				fillRule="evenodd"
				d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
				clipRule="evenodd"
			/>
		</svg>
	),
	'arrow-left': (
		<svg
			className="w-5 h-5 mr-2"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 20 20"
			fill="currentColor"
		>
			<path
				fillRule="evenodd"
				d="M12.79 5.23a.75.75 0 010 1.06L8.832 10l3.958 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.04 1.02z"
				clipRule="evenodd"
			/>
		</svg>
	),
	refresh: (
		<svg
			className="w-5 h-5 mr-2"
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth={1.5}
			stroke="currentColor"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M16.023 9.348h4.992V4.356M2.985 19.644v-4.992h4.992M20.261 12a8.25 8.25 0 01-14.74 4.318m0 0h4.992m-4.992 0v4.992M3.739 12a8.25 8.25 0 0114.74-4.318m0 0V4.356"
			/>
		</svg>
	),
	check: (
		<svg
			className="w-5 h-5 ml-2"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 20 20"
			fill="currentColor"
		>
			<path
				fillRule="evenodd"
				d="M16.704 5.29a1 1 0 010 1.415l-7.07 7.07a1 1 0 01-1.415 0L3.296 9.854a1 1 0 011.415-1.415l3.22 3.22 6.363-6.364a1 1 0 011.41-.004z"
				clipRule="evenodd"
			/>
		</svg>
	),
	none: <></>,
};

export function ActionButton({
	href,
	onClick,
	children,
	variant = 'primary',
	icon = 'arrow-right',
	size = 'md',
	className = '',
	disabled = false,
	ariaLabel,
}: ActionButtonProps) {
	const base =
		'rounded-lg font-semibold flex items-center shadow-lg transition-colors whitespace-nowrap';
	const sizeCls =
		size === 'lg'
			? 'py-4 px-7 text-lg'
			: size === 'md'
			? 'py-3 px-5 text-sm'
			: 'py-2.5 px-4 text-xs';
	const variantCls =
		variant === 'primary'
			? 'bg-black text-white hover:bg-gray-800'
			: 'bg-white text-black border border-[var(--input-border)] hover:bg-[var(--hover-background)]';
	const disabledCls = disabled
		? 'opacity-50 cursor-not-allowed hover:bg-black'
		: '';

	const content = (
		<span className="flex items-center">
			{icon === 'arrow-left' || icon === 'refresh' ? ICONS[icon] : null}
			{children}
			{icon === 'arrow-right' || icon === 'check' ? ICONS[icon] : null}
		</span>
	);

	if (href) {
		if (disabled) {
			return (
				<span
					aria-label={ariaLabel}
					aria-disabled="true"
					className={`${base} ${sizeCls} ${variantCls} ${disabledCls} ${className}`}
				>
					{content}
				</span>
			);
		}
		return (
			<Link
				href={href}
				aria-label={ariaLabel}
				className={`${base} ${sizeCls} ${variantCls} ${disabledCls} ${className}`}
			>
				{content}
			</Link>
		);
	}
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={ariaLabel}
			disabled={disabled}
			className={`${base} ${sizeCls} ${variantCls} ${disabledCls} ${className}`}
		>
			{content}
		</button>
	);
}
