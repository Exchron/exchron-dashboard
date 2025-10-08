import { NextResponse } from 'next/server';

// ML Prediction API Proxy
// Handles requests to the ML prediction service for GB and SVM models
// Supports manual data input from the data input sliders

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
	try {
		const body = await request.json();
		
		// Validate required fields
		if (!body.model || !body.datasource || !body.predict) {
			return NextResponse.json(
				{ error: 'Missing required fields: model, datasource, predict' },
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

		// Validate datasource and required fields based on type
		if (body.datasource === 'manual') {
			// For manual data, validate features object
			if (!body.features) {
				return NextResponse.json(
					{ error: 'Missing features object for manual datasource' },
					{ status: 400 }
				);
			}

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
		} else if (body.datasource === 'upload') {
			// For uploaded data, validate features-target-X objects
			const requiredFeatures = [
				'koi_period', 'koi_time0bk', 'koi_impact', 'koi_duration', 'koi_depth',
				'koi_incl', 'koi_model_snr', 'koi_count', 'koi_bin_oedp_sig', 'koi_steff',
				'koi_slogg', 'koi_srad', 'koi_smass', 'koi_kepmag'
			];

			let hasValidFeatures = false;
			for (let i = 1; i <= 3; i++) {
				const featuresKey = `features-target-${i}`;
				if (body[featuresKey]) {
					hasValidFeatures = true;
					const features = body[featuresKey];
					
					for (const feature of requiredFeatures) {
						if (!(feature in features) || typeof features[feature] !== 'number') {
							return NextResponse.json(
								{ error: `Missing or invalid feature in ${featuresKey}: ${feature}` },
								{ status: 400 }
							);
						}
					}
				}
			}

			if (!hasValidFeatures) {
				return NextResponse.json(
					{ error: 'At least one features-target-X object is required for upload datasource' },
					{ status: 400 }
				);
			}
		} else if (body.datasource === 'pre-loaded') {
			// For preloaded data, validate data field
			if (!body.data) {
				return NextResponse.json(
					{ error: 'Missing data field for pre-loaded datasource' },
					{ status: 400 }
				);
			}

			if (!['kepler', 'tess'].includes(body.data)) {
				return NextResponse.json(
					{ error: 'Invalid data type. Must be "kepler" or "tess"' },
					{ status: 400 }
				);
			}
		} else {
			return NextResponse.json(
				{ error: 'Invalid datasource. Must be "manual", "upload", or "pre-loaded"' },
				{ status: 400 }
			);
		}

		// Make request to external ML API
		const endpoint = 'http://138.2.111.78:8000/api/ml/predict';
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

		// Validate response format based on datasource
		if (body.datasource === 'manual') {
			// For manual data, expect simple response
			if (typeof data.candidate_probability !== 'number' || 
				typeof data.non_candidate_probability !== 'number') {
				return NextResponse.json(
					{ error: 'Invalid response format from ML API for manual prediction' },
					{ status: 502 }
				);
			}
		} else if (body.datasource === 'upload') {
			// For uploaded data, expect aggregated response with individual predictions
			if (typeof data.candidate_probability !== 'number' || 
				typeof data.non_candidate_probability !== 'number') {
				return NextResponse.json(
					{ error: 'Invalid response format from ML API for upload prediction' },
					{ status: 502 }
				);
			}
			// Individual predictions are optional for upload, so we don't validate them strictly
		} else if (body.datasource === 'pre-loaded') {
			// For preloaded data, expect averaged probabilities and individual results
			if (typeof data.candidate_probability !== 'number' || 
				typeof data.non_candidate_probability !== 'number') {
				return NextResponse.json(
					{ error: 'Invalid response format from ML API for preloaded prediction' },
					{ status: 502 }
				);
			}

			// Validate individual prediction results
			const expectedKeys = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
			for (const key of expectedKeys) {
				if (!data[key] || 
					typeof data[key].candidate_probability !== 'number' || 
					typeof data[key].non_candidate_probability !== 'number' ||
					!data[key].kepid) {
					return NextResponse.json(
						{ error: `Invalid individual prediction result for ${key}` },
						{ status: 502 }
					);
				}
			}
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
			errorMessage = 'Cannot connect to ML prediction service. Please ensure the service is running on http://138.2.111.78:8000';
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