import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
	subsets: ['latin'],
	variable: '--font-inter',
});

export const metadata: Metadata = {
	title: 'Exchron Dashboard',
	description: 'Exchron Machine Learning Dashboard',
	icons: {
		icon: [{ url: '/favicon.png', type: 'image' }],
		shortcut: ['/exchron-logo.svg'],
		apple: [{ url: '/exchron-logo.svg' }],
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className={`${inter.variable} font-sans antialiased`}>
				{children}
			</body>
		</html>
	);
}
