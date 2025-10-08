import { NextResponse } from 'next/server';

// API proxy for external DL models (CNN/DNN) prediction service
// Calls external API at http://localhost:8000/api/dl/predict
const EXTERNAL_API_URL = 'http://localhost:8000/api/dl/predict';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
	try {
		const body = await request.json();
		
		// Validate required fields
		if (!body.model || !body.kepid) {
			return NextResponse.json(
				{ error: 'Missing required fields: model and kepid are required' },
				{ status: 400 }
			);
		}

		// Ensure valid model type
		if (!['cnn', 'dnn'].includes(body.model.toLowerCase())) {
			return NextResponse.json(
				{ error: 'Invalid model type. Must be "cnn" or "dnn"' },
				{ status: 400 }
			);
		}

		// Prepare request payload for external API
		const payload = {
			model: body.model.toLowerCase(),
			kepid: body.kepid,
			predict: true
		};

		console.log('Calling external DL API with payload:', payload);

		// Set up request with timeout
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

		// Call external API
		const response = await fetch(EXTERNAL_API_URL, {
			method: 'POST',
			headers: { 
				'Content-Type': 'application/json',
				'Accept': 'application/json'
			},
			body: JSON.stringify(payload),
			signal: controller.signal,
		});

		clearTimeout(timeout);

		if (!response.ok) {
			const errorText = await response.text();
			console.error('External API error:', response.status, errorText);
			
			// Return specific uptime error message for service unavailability
			const errorMessage = response.status === 503 || response.status === 502 || response.status === 504
				? 'Sorry, we are using free services therefore uptime isn\'t 100% guaranteed. Please check back later.'
				: errorText || 'Unknown error from external service';
			
			return NextResponse.json(
				{ 
					error: errorMessage,
					status: response.status, 
					message: errorText
				},
				{ status: 502 }
			);
		}

		const data = await response.json();
		console.log('External API response:', data);

		// Validate response structure
		if (!data.candidate_probability || !data.non_candidate_probability || !data.kepid) {
			console.error('Invalid response structure from external API:', data);
			return NextResponse.json(
				{ error: 'Invalid response structure from external API' },
				{ status: 502 }
			);
		}

		// Return the data from external API
		return NextResponse.json(data, { status: 200 });

	} catch (err: unknown) {
		const error = err as { name?: string; message?: string } | undefined;
		const isAbort = error?.name === 'AbortError';
		const isNetworkError = error?.message?.includes('fetch') || error?.message?.includes('network') || error?.name === 'TypeError';
		
		console.error('DL prediction API error:', error);
		
		// Return specific uptime error message for network/connection issues
		const errorMessage = isAbort || isNetworkError
			? 'Sorry, we are using free services therefore uptime isn\'t 100% guaranteed. Please check back later.'
			: 'DL prediction service failed';
		
		return NextResponse.json(
			{
				error: errorMessage,
				reason: isAbort ? 'timeout' : error?.message || 'unknown',
			},
			{ status: isAbort ? 504 : 500 }
		);
	}
}