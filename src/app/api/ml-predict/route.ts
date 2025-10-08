import { NextResponse } from 'next/server';

// ML Prediction API Proxy
// Handles requests to the ML prediction service for GB and SVM models
// Supports manual data input from the data input sliders

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
	try {
		const body = await request.json();
		
		// Validate required fields
		if (!body.model || !body.datasource || !body.features || !body.predict) {
			return NextResponse.json(
				{ error: 'Missing required fields: model, datasource, features, predict' },
				{ status: 400 }
			);
		}

		// Validate model type
		if (!['gb', 'svm'].includes(body.model)) {
			return NextResponse.json(
				{ error: 'Invalid model type. Must be "gb" or "svm"' },
				{ status: 400 }
			);
		}

		// Validate datasource
		if (body.datasource !== 'manual') {
			return NextResponse.json(
				{ error: 'Invalid datasource. Must be "manual"' },
				{ status: 400 }
			);
		}

		// Validate features object
		const requiredFeatures = [
			'koi_period', 'koi_time0bk', 'koi_impact', 'koi_duration', 'koi_depth',
			'koi_incl', 'koi_model_snr', 'koi_count', 'koi_bin_oedp_sig', 'koi_steff',
			'koi_slogg', 'koi_srad', 'koi_smass', 'koi_kepmag'
		];

		for (const feature of requiredFeatures) {
			if (!(feature in body.features) || typeof body.features[feature] !== 'number') {
				return NextResponse.json(
					{ error: `Missing or invalid feature: ${feature}` },
					{ status: 400 }
				);
			}
		}

		// Make request to external ML API
		const endpoint = 'http://localhost:8000/api/ml/predict';
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

		console.log('Making ML prediction request to:', endpoint);
		console.log('Request payload:', JSON.stringify(body, null, 2));

		const response = await fetch(endpoint, {
			method: 'POST',
			headers: { 
				'Content-Type': 'application/json',
				'Accept': 'application/json'
			},
			body: JSON.stringify(body),
			signal: controller.signal,
		}).catch((err) => {
			console.error('Fetch error:', err);
			throw err;
		});

		clearTimeout(timeout);

		if (!response.ok) {
			const errorText = await response.text();
			console.error('ML API error response:', response.status, errorText);
			
			let errorMessage = 'Prediction failed';
			try {
				const errorData = JSON.parse(errorText);
				errorMessage = errorData.error || errorData.message || errorMessage;
			} catch {
				errorMessage = errorText || errorMessage;
			}

			return NextResponse.json(
				{ 
					error: 'ML prediction failed', 
					details: errorMessage,
					status: response.status 
				},
				{ status: 502 }
			);
		}

		const data = await response.json();
		console.log('ML prediction successful:', data);

		// Validate response format
		if (typeof data.candidate_probability !== 'number' || 
			typeof data.non_candidate_probability !== 'number') {
			return NextResponse.json(
				{ error: 'Invalid response format from ML API' },
				{ status: 502 }
			);
		}

		return NextResponse.json(data, { status: 200 });
	} catch (err: unknown) {
		console.error('ML prediction error:', err);
		
		const error = err as { name?: string; message?: string; cause?: any } | undefined;
		const isAbort = error?.name === 'AbortError';
		const isConnectionError = error?.message?.includes('ECONNREFUSED') || 
								error?.message?.includes('fetch');
		
		let errorMessage = 'ML prediction service unavailable';
		let statusCode = 500;
		
		if (isAbort) {
			errorMessage = 'Prediction request timed out';
			statusCode = 504;
		} else if (isConnectionError) {
			errorMessage = 'Cannot connect to ML prediction service. Please ensure the service is running on localhost:8000';
			statusCode = 503;
		}

		return NextResponse.json(
			{
				error: errorMessage,
				details: error?.message || 'unknown error',
				isTimeout: isAbort,
				isConnectionError
			},
			{ status: statusCode }
		);
	}
}