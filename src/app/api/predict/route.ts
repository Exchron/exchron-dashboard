import { NextResponse } from 'next/server';

// Simple proxy to backend prediction API to avoid direct browser fetch issues (CORS / network)
// Environment variable override: PREDICT_API_URL (server-side) or NEXT_PUBLIC_PREDICT_API (client hint)
// Fallback default: http://localhost:8000/predict
const DEFAULT_ENDPOINT = 'http://localhost:8000/predict';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const endpoint = process.env.PREDICT_API_URL || DEFAULT_ENDPOINT;
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

		const resp = await fetch(endpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
			signal: controller.signal,
		}).catch((err) => {
			throw err;
		});

		clearTimeout(timeout);

		if (!resp.ok) {
			const text = await resp.text();
			return NextResponse.json(
				{ error: 'Upstream error', status: resp.status, message: text },
				{ status: 502 },
			);
		}

		const data = await resp.json();
		return NextResponse.json(data, { status: 200 });
	} catch (err: unknown) {
		const e = err as { name?: string; message?: string } | undefined;
		const isAbort = e?.name === 'AbortError';
		return NextResponse.json(
			{
				error: 'Prediction proxy failed',
				reason: isAbort ? 'timeout' : e?.message || 'unknown',
			},
			{ status: isAbort ? 504 : 500 },
		);
	}
}
