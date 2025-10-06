import { NextResponse } from 'next/server';

// K2 dataset endpoint deprecated: K2 data is no longer supported.
// Always returns 410 Gone so any lingering client calls fail fast.
export async function GET() {
	return NextResponse.json(
		{
			error: 'K2 dataset deprecated',
			message:
				'The K2 classroom dataset has been removed. Use kepler (KOI) or tess data sources.',
		},
		{ status: 410 },
	);
}
